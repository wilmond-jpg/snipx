use std::cell::RefCell;
use std::sync::mpsc;
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, AtomicU8, Ordering};
use parking_lot::Mutex;

use core_foundation::base::TCFType;
use core_foundation::boolean::CFBoolean;
use core_foundation::dictionary::CFDictionary;
use core_foundation::runloop::{kCFRunLoopCommonModes, CFRunLoop};
use core_foundation::string::CFString;
use core_graphics::event::{
    CGEvent, CGEventTap, CGEventTapLocation, CGEventTapOptions, CGEventTapPlacement,
    CGEventType, CallbackResult, EventField, KeyCode,
};
use core_graphics::event_source::{CGEventSource, CGEventSourceStateID};
use enigo::{Direction, Enigo, Key, Keyboard, Settings as EnigoSettings};
use foreign_types::ForeignType;

use crate::storage::Snippet;

const MAX_BUFFER_SIZE: usize = 200;
const ENIGO_EVENT_MARKER: i64 = 100;

thread_local! {
    static ENIGO: RefCell<Option<Enigo>> = RefCell::new(None);
}

pub fn start_listener(
    snippets: Arc<Mutex<Vec<Snippet>>>,
    window_focused: Arc<AtomicBool>,
    clear_buffer_signal: Arc<AtomicBool>,
    enabled: Arc<AtomicBool>,
    trigger_key: Arc<AtomicU8>,
) {
    let key = CFString::new("AXTrustedCheckOptionPrompt");
    let val = CFBoolean::true_value();
    let options = CFDictionary::from_CFType_pairs(&[(key.as_CFType(), val.as_CFType())]);

    if !unsafe { AXIsProcessTrustedWithOptions(options.as_concrete_TypeRef() as *const std::ffi::c_void) } {
        eprintln!("snipx: not trusted by accessibility API — check System Settings → Privacy & Security → Accessibility");
        return;
    }

    std::thread::spawn(move || {
        let buffer: Arc<Mutex<Vec<char>>> = Arc::new(Mutex::new(Vec::new()));
        let focused = window_focused;
        let clear_sig = clear_buffer_signal;
        let app_enabled = enabled;
        let app_trigger_key = trigger_key;

        let (inject_tx, inject_rx) = mpsc::channel::<Snippet>();
        std::thread::spawn(move || {
            while let Ok(snippet) = inject_rx.recv() {
                inject_text_expansion(&snippet.shortcut, &snippet.expansion);
            }
        });

        let tap = match CGEventTap::new(
            CGEventTapLocation::Session,
            CGEventTapPlacement::HeadInsertEventTap,
            CGEventTapOptions::Default,
            vec![CGEventType::KeyDown],
            {
                let buffer = buffer.clone();
                let snippets = snippets.clone();
                let inject_tx = inject_tx.clone();
                move |_proxy, _type, event| {
                    if clear_sig.swap(false, Ordering::Acquire) {
                        buffer.lock().clear();
                    }

                    if event.get_integer_value_field(EventField::EVENT_SOURCE_USER_DATA)
                        == ENIGO_EVENT_MARKER
                    {
                        return CallbackResult::Keep;
                    }

                    let keycode =
                        event.get_integer_value_field(EventField::KEYBOARD_EVENT_KEYCODE) as u16;

                    // Non-text-producing keys: function keys, media keys, help
                    if matches!(keycode,
                        64 | 72 | 73 | 74 | 79 | 80 | 90 |
                        96 | 97 | 98 | 99 | 100 | 101 | 103 |
                        105 | 106 | 107 | 109 | 111 |
                        113 | 114 | 118 | 120 | 122
                    ) {
                        return CallbackResult::Keep;
                    }

                    let text = get_event_text(event);

                    if let Some(c) = text.chars().next() {
                        let mut buf = buffer.lock();
                        let mut matched = false;
                        let is_focused = focused.load(Ordering::Acquire);
                        let is_enabled = app_enabled.load(Ordering::Acquire);
                        let key = app_trigger_key.load(Ordering::Acquire);
                        let space_allowed = is_enabled && (key == 0 || key == 2);
                        let tab_allowed = is_enabled && (key == 1 || key == 2);
                        match keycode {
                            49 if space_allowed => {
                                if let Some(s) = handle_trigger(' ', &mut buf, &snippets, is_focused) {
                                    let _ = inject_tx.send(s);
                                    matched = true;
                                }
                            }
                            48 if tab_allowed => {
                                if let Some(s) = handle_trigger('\t', &mut buf, &snippets, is_focused) {
                                    let _ = inject_tx.send(s);
                                    matched = true;
                                }
                            }
                            49 | 48 => {
                                buf.push(c);
                                if buf.len() > MAX_BUFFER_SIZE {
                                    let excess = buf.len() - MAX_BUFFER_SIZE;
                                    buf.drain(0..excess);
                                }
                            }
                            51 => {
                                buf.pop();
                            }
                            115 | 116 | 117 | 119 | 121 | 123 | 124 | 125 | 126 => {
                                buf.clear();
                            }
                            76 => {
                                buf.clear();
                            }
                            53 | 36 => {
                                buf.clear();
                            }
                            _ => {
                                if !c.is_control() && c != ' ' && c != '\t' {
                                    buf.push(c);
                                    if buf.len() > MAX_BUFFER_SIZE {
                                        let excess = buf.len() - MAX_BUFFER_SIZE;
                                        buf.drain(0..excess);
                                    }
                                }
                            }
                        }
                        if matched {
                            return CallbackResult::Drop;
                        }
                    }
                    CallbackResult::Keep
                }
            },
        ) {
            Ok(tap) => tap,
            Err(()) => {
                eprintln!("snipx: CGEventTapCreate returned NULL — failed to create event tap");
                return;
            }
        };

        let loop_source = match tap.mach_port().create_runloop_source(0) {
            Ok(s) => s,
            Err(_) => {
                eprintln!("snipx: failed to create run loop source");
                return;
            }
        };
        unsafe {
            CFRunLoop::get_current().add_source(&loop_source, kCFRunLoopCommonModes);
        }
        tap.enable();

        Box::leak(Box::new(tap));

        #[cfg(debug_assertions)]
        println!("event tap active");

        unsafe { CFRunLoopRun(); }
    });
}

fn get_event_text(event: &CGEvent) -> String {
    unsafe {
        let mut count: u32 = 0;
        CGEventKeyboardGetUnicodeString(event.as_ptr(), 0, &mut count, std::ptr::null_mut());
        if count == 1 {
            let mut single = 0u16;
            CGEventKeyboardGetUnicodeString(event.as_ptr(), 1, &mut count, &mut single);
            String::from_utf16_lossy(std::slice::from_ref(&single))
        } else if count > 1 {
            let mut buf: Vec<u16> = vec![0u16; count as usize];
            CGEventKeyboardGetUnicodeString(
                event.as_ptr(),
                count,
                &mut count,
                buf.as_mut_ptr(),
            );
            buf.truncate(count as usize);
            String::from_utf16_lossy(&buf)
        } else {
            String::new()
        }
    }
}

extern "C" {
    fn CGEventKeyboardGetUnicodeString(
        event: core_graphics::sys::CGEventRef,
        maxCharCount: u32,
        actualCharCount: *mut u32,
        chars: *mut u16,
    );
}

#[link(name = "ApplicationServices", kind = "framework")]
extern "C" {
    fn AXIsProcessTrustedWithOptions(options: *const std::ffi::c_void) -> bool;
}

extern "C" {
    fn CFRunLoopRun();
}

fn handle_trigger(
    trigger: char,
    buffer: &mut Vec<char>,
    snippets: &Arc<Mutex<Vec<Snippet>>>,
    is_focused: bool,
) -> Option<Snippet> {
    if is_focused {
        buffer.push(trigger);
        if buffer.len() > MAX_BUFFER_SIZE {
            let excess = buffer.len() - MAX_BUFFER_SIZE;
            buffer.drain(0..excess);
        }
        return None;
    }

    let buffer_str: String = buffer.iter().collect();
    let matched = {
        let Some(locked) = snippets.try_lock() else {
            buffer.push(trigger);
            return None;
        };
        locked
            .iter()
            .filter(|s| buffer_str.ends_with(&s.shortcut))
            .max_by_key(|s| s.shortcut.len())
            .cloned()
    };

    if let Some(snippet) = matched {
        buffer.clear();
        Some(snippet)
    } else {
        buffer.push(trigger);
        if buffer.len() > MAX_BUFFER_SIZE {
            let excess = buffer.len() - MAX_BUFFER_SIZE;
            buffer.drain(0..excess);
        }
        None
    }
}

fn inject_text_expansion(shortcut: &str, expansion: &str) {
    let source = CGEventSource::new(CGEventSourceStateID::Private);
    let src = match &source {
        Ok(s) => s,
        Err(_) => {
            eprintln!("snipx: failed to create CGEventSource, falling back to enigo");
            return inject_text_expansion_enigo(shortcut, expansion);
        }
    };

    for _ in 0..shortcut.chars().count() {
        if let Ok(ev) = CGEvent::new_keyboard_event(src.clone(), KeyCode::DELETE, true) {
            ev.set_integer_value_field(EventField::EVENT_SOURCE_USER_DATA, ENIGO_EVENT_MARKER);
            ev.post(CGEventTapLocation::HID);
        }
        if let Ok(ev) = CGEvent::new_keyboard_event(src.clone(), KeyCode::DELETE, false) {
            ev.set_integer_value_field(EventField::EVENT_SOURCE_USER_DATA, ENIGO_EVENT_MARKER);
            ev.post(CGEventTapLocation::HID);
        }
    }

    let utf16: Vec<u16> = expansion.encode_utf16().collect();
    if let Ok(ev) = CGEvent::new_keyboard_event(src.clone(), 0, true) {
        ev.set_string_from_utf16_unchecked(&utf16);
        ev.set_integer_value_field(EventField::EVENT_SOURCE_USER_DATA, ENIGO_EVENT_MARKER);
        ev.post(CGEventTapLocation::HID);
    }
    if let Ok(ev) = CGEvent::new_keyboard_event(src.clone(), 0, false) {
        ev.set_string_from_utf16_unchecked(&utf16);
        ev.set_integer_value_field(EventField::EVENT_SOURCE_USER_DATA, ENIGO_EVENT_MARKER);
        ev.post(CGEventTapLocation::HID);
    }
}

fn inject_text_expansion_enigo(shortcut: &str, expansion: &str) {
    ENIGO.with(|cell| {
        let mut guard = cell.borrow_mut();
        if guard.is_none() {
            *guard = Enigo::new(&EnigoSettings::default()).ok();
        }
        if let Some(ref mut enigo) = *guard {
            for _ in 0..shortcut.chars().count() {
                if let Err(e) = enigo.key(Key::Backspace, Direction::Click) {
                    eprintln!("snipx: backspace failed: {e}");
                }
            }
            if let Err(e) = enigo.text(expansion) {
                eprintln!("snipx: text injection failed: {e}");
            }
        } else {
            eprintln!("snipx: enigo initialization failed — text injection unavailable");
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::storage::Snippet;

    fn make_snippet(shortcut: &str, expansion: &str) -> Snippet {
        Snippet {
            id: "test-id".into(),
            label: "test".into(),
            shortcut: shortcut.into(),
            expansion: expansion.into(),
            folder: "".into(),
        }
    }

    #[test]
    fn no_match_returns_none_and_appends_trigger() {
        let snippets = Arc::new(Mutex::new(vec![]));
        let mut buf = vec!['/'];

        let result = handle_trigger(' ', &mut buf, &snippets, false);

        assert!(result.is_none());
        assert_eq!(buf, &['/', ' ']);
    }

    #[test]
    fn match_clears_buffer_and_returns_snippet() {
        let snippets = Arc::new(Mutex::new(vec![make_snippet("/email", "test@example.com")]));
        let mut buf: Vec<char> = "/email".chars().collect();

        let result = handle_trigger(' ', &mut buf, &snippets, false);

        assert!(result.is_some());
        assert_eq!(result.as_ref().unwrap().expansion, "test@example.com");
        assert!(buf.is_empty());
    }

    #[test]
    fn longest_match_wins() {
        let snippets = Arc::new(Mutex::new(vec![
            make_snippet("/e", "short"),
            make_snippet("/email", "long"),
        ]));
        let mut buf: Vec<char> = "/email".chars().collect();

        let result = handle_trigger(' ', &mut buf, &snippets, false);

        assert!(result.is_some());
        assert_eq!(result.unwrap().expansion, "long");
        assert!(buf.is_empty());
    }

    #[test]
    fn empty_buffer_no_match() {
        let snippets = Arc::new(Mutex::new(vec![make_snippet("/email", "x")]));
        let mut buf = vec![];

        let result = handle_trigger(' ', &mut buf, &snippets, false);

        assert!(result.is_none());
        assert_eq!(buf, &[' ']);
    }

    #[test]
    fn tab_trigger_matches() {
        let snippets = Arc::new(Mutex::new(vec![make_snippet("/e", "x")]));
        let mut buf: Vec<char> = "/e".chars().collect();

        let result = handle_trigger('\t', &mut buf, &snippets, false);

        assert!(result.is_some());
        assert_eq!(result.unwrap().expansion, "x");
        assert!(buf.is_empty());
    }

    #[test]
    fn focused_window_skips_expansion() {
        let snippets = Arc::new(Mutex::new(vec![make_snippet("/e", "expansion")]));
        let mut buf: Vec<char> = "/e".chars().collect();

        let result = handle_trigger(' ', &mut buf, &snippets, true);

        assert!(result.is_none());
        assert_eq!(buf, &['/', 'e', ' ']);
    }

    #[test]
    fn buffer_trimming_at_max() {
        let snippets = Arc::new(Mutex::new(vec![]));
        let mut buf: Vec<char> = vec!['a'; MAX_BUFFER_SIZE];

        let result = handle_trigger(' ', &mut buf, &snippets, false);

        assert!(result.is_none());
        assert_eq!(buf.len(), MAX_BUFFER_SIZE);
    }

    #[test]
    fn backspace_during_editing() {
        let snippets = Arc::new(Mutex::new(vec![]));
        let mut buf: Vec<char> = vec!['a', 'b', 'c'];

        buf.pop();
        assert_eq!(buf, &['a', 'b']);

        let result = handle_trigger(' ', &mut buf, &snippets, false);

        assert!(result.is_none());
        assert_eq!(buf, &['a', 'b', ' ']);
    }
}
