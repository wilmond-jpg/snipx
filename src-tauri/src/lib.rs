mod listener;
mod settings;
mod storage;
mod variables;

use std::sync::Arc;
use std::sync::atomic::{AtomicBool, AtomicU8, Ordering};
use std::fs;
use core_foundation::base::TCFType;
use parking_lot::Mutex;

use settings::Settings;
use storage::Snippet;
use tauri::Manager;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, TrayIconBuilder, TrayIconEvent};

struct AppState {
    snippets: Arc<Mutex<Vec<Snippet>>>,
}

struct FocusState {
    focused: Arc<AtomicBool>,
    clear_buffer: Arc<AtomicBool>,
}

struct SettingsState {
    settings: Arc<Mutex<Settings>>,
    enabled: Arc<AtomicBool>,
    trigger_key: Arc<AtomicU8>,
}

#[tauri::command]
fn get_snippets(state: tauri::State<'_, AppState>) -> Result<Vec<Snippet>, String> {
    Ok(state.snippets.lock().clone())
}

#[tauri::command]
fn save_snippet(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    snippet: Snippet,
) -> Result<(), String> {
    if !snippet.shortcut.starts_with('/') {
        return Err("Shortcut must start with '/'".to_string());
    }
    if snippet.expansion.trim().is_empty() {
        return Err("Expansion cannot be empty".to_string());
    }
    let mut snippets = state.snippets.lock();

    if snippets.iter().any(|s| s.shortcut == snippet.shortcut && s.id != snippet.id) {
        return Err(format!("Shortcut '{}' is already in use", snippet.shortcut));
    }

    if let Some(pos) = snippets.iter().position(|s| s.id == snippet.id) {
        snippets[pos] = snippet;
    } else {
        snippets.push(snippet);
    }
    let path = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("snippets.json");
    storage::save_snippets(&path, &snippets).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn delete_snippet(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    id: String,
) -> Result<(), String> {
    let mut snippets = state.snippets.lock();
    snippets.retain(|s| s.id != id);
    let path = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("snippets.json");
    storage::save_snippets(&path, &snippets).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn reload_snippets(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    let path = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("snippets.json");
    let snippets = storage::load_snippets(&path);
    *state.snippets.lock() = snippets;
    Ok(())
}

#[tauri::command]
fn save_all_snippets(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    snippets: Vec<Snippet>,
) -> Result<(), String> {
    let mut locked = state.snippets.lock();
    *locked = snippets.clone();
    let path = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("snippets.json");
    storage::save_snippets(&path, &snippets).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn get_folders(app: tauri::AppHandle) -> Result<Vec<String>, String> {
    let path = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("folders.json");
    if path.exists() {
        let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
        serde_json::from_str(&content).map_err(|e| e.to_string())
    } else {
        Ok(Vec::new())
    }
}

#[tauri::command]
fn save_folders(app: tauri::AppHandle, folders: Vec<String>) -> Result<(), String> {
    let path = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("folders.json");
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let content = serde_json::to_string_pretty(&folders).map_err(|e| e.to_string())?;
    fs::write(&path, content).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn get_settings(
    state: tauri::State<'_, SettingsState>,
) -> Result<Settings, String> {
    Ok(state.settings.lock().clone())
}

#[tauri::command]
fn save_settings(
    app: tauri::AppHandle,
    state: tauri::State<'_, SettingsState>,
    settings: Settings,
) -> Result<(), String> {
    state.enabled.store(settings.enabled, Ordering::Release);
    let key_code: u8 = match settings.trigger_key.as_str() {
        "space" => 0,
        "tab" => 1,
        _ => 2,
    };
    state.trigger_key.store(key_code, Ordering::Release);
    let mut locked = state.settings.lock();
    *locked = settings.clone();
    let path = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("settings.json");
    settings::save_settings(&path, &settings).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn export_snippets(
    state: tauri::State<'_, AppState>,
) -> Result<String, String> {
    let snippets = state.snippets.lock();
    serde_json::to_string_pretty(&*snippets).map_err(|e| e.to_string())
}

#[tauri::command]
fn import_snippets(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    json: String,
) -> Result<(), String> {
    let imported: Vec<Snippet> = serde_json::from_str(&json).map_err(|e| format!("Invalid JSON: {e}"))?;
    for s in &imported {
        if s.id.is_empty() || s.shortcut.is_empty() {
            return Err("Each snippet must have an id and shortcut".to_string());
        }
    }
    let mut locked = state.snippets.lock();
    *locked = imported;
    let path = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("snippets.json");
    storage::save_snippets(&path, &locked).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn set_window_theme(app: tauri::AppHandle, theme: String) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        let tauri_theme = match theme.as_str() {
            "light" => tauri::Theme::Light,
            _ => tauri::Theme::Dark,
        };
        let color = match theme.as_str() {
            "light" => tauri::window::Color::from((250, 250, 250)),
            _ => tauri::window::Color::from((9, 9, 11)),
        };
        let _ = window.set_theme(Some(tauri_theme));
        let _ = window.set_background_color(Some(color));
    }
    Ok(())
}

#[tauri::command]
fn check_accessibility() -> bool {
    unsafe {
        let key = core_foundation::string::CFString::new("AXTrustedCheckOptionPrompt");
        let val = core_foundation::boolean::CFBoolean::true_value();
        let options = core_foundation::dictionary::CFDictionary::from_CFType_pairs(
            &[(key.as_CFType(), val.as_CFType())],
        );
        AXIsProcessTrustedWithOptions(options.as_concrete_TypeRef() as *const std::ffi::c_void)
    }
}

#[link(name = "ApplicationServices", kind = "framework")]
extern "C" {
    fn AXIsProcessTrustedWithOptions(options: *const std::ffi::c_void) -> bool;
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let snippets_path = app.path().app_data_dir()?.join("snippets.json");
            let snippets = storage::load_snippets(&snippets_path);
            let shared = Arc::new(Mutex::new(snippets));

            let settings_path = app.path().app_data_dir()?.join("settings.json");
            let settings = settings::load_settings(&settings_path);
            let app_enabled = settings.enabled;
            let app_theme = settings.theme.clone();
            let app_trigger_key = match settings.trigger_key.as_str() {
                "space" => 0u8,
                "tab" => 1u8,
                _ => 2u8,
            };
            let shared_settings = Arc::new(Mutex::new(settings));

            let listener_shared = shared.clone();

            let enabled = Arc::new(AtomicBool::new(app_enabled));
            let trigger_key = Arc::new(AtomicU8::new(app_trigger_key));

            let focused = Arc::new(AtomicBool::new(false));
            let clear_buffer = Arc::new(AtomicBool::new(false));

            listener::start_listener(
                listener_shared,
                focused.clone(),
                clear_buffer.clone(),
                enabled.clone(),
                trigger_key.clone(),
            );

            app.manage(AppState { snippets: shared });
            app.manage(FocusState { focused, clear_buffer });
            app.manage(SettingsState { settings: shared_settings, enabled, trigger_key });

            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_title_bar_style(tauri::TitleBarStyle::Transparent);
                let tauri_theme = match app_theme.as_str() {
                    "light" => tauri::Theme::Light,
                    _ => tauri::Theme::Dark,
                };
                let bg = match app_theme.as_str() {
                    "light" => tauri::window::Color::from((250, 250, 250)),
                    _ => tauri::window::Color::from((9, 9, 11)),
                };
                let _ = window.set_theme(Some(tauri_theme));
                let _ = window.set_background_color(Some(bg));
            }

            let show = MenuItem::with_id(app, "show", "Show/Hide", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Quit snipx", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show, &quit])?;

            TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            if window.is_visible().unwrap_or(false) {
                                let _ = window.hide();
                            } else {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .on_window_event(|window, event| {
            match event {
                tauri::WindowEvent::CloseRequested { api, .. } => {
                    api.prevent_close();
                    let _ = window.hide();
                }
                tauri::WindowEvent::Focused(focused) => {
                    let state = window.state::<FocusState>();
                    state.focused.store(*focused, Ordering::Release);
                    if !focused {
                        state.clear_buffer.store(true, Ordering::Release);
                    }
                }
                _ => {}
            }
        })
        .invoke_handler(tauri::generate_handler![
            get_snippets,
            save_snippet,
            delete_snippet,
            reload_snippets,
            save_all_snippets,
            get_folders,
            save_folders,
            get_settings,
            save_settings,
            export_snippets,
            import_snippets,
            check_accessibility,
            set_window_theme,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            if let tauri::RunEvent::Reopen { .. } = event {
                if let Some(window) = app_handle.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
        });
}
