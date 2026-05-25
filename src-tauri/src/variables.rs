use chrono::Local;

#[derive(Debug)]
pub struct ResolvedText {
    pub text: String,
    pub cursor_utf16_offset: Option<usize>,
}

pub fn resolve_variables(expansion: &str) -> ResolvedText {
    let mut text = expansion.to_string();

    let now = Local::now();
    text = text.replace("{{date}}", &now.format("%Y-%m-%d").to_string());
    text = text.replace("{{time}}", &now.format("%H:%M").to_string());
    text = text.replace("{{datetime}}", &now.format("%Y-%m-%d %H:%M").to_string());

    if text.contains("{{clipboard}}") {
        if let Some(clip) = get_clipboard_text() {
            text = text.replace("{{clipboard}}", &clip);
        }
    }

    let cursor_utf16_offset = if let Some(pos) = text.find("{{cursor}}") {
        let offset = text[..pos].encode_utf16().count();
        text = text.replacen("{{cursor}}", "", 1);
        Some(offset)
    } else {
        None
    };

    ResolvedText { text, cursor_utf16_offset }
}

fn get_clipboard_text() -> Option<String> {
    #[cfg(not(test))]
    {
        let mut clipboard = arboard::Clipboard::new().ok()?;
        clipboard.get_text().ok()
    }
    #[cfg(test)]
    {
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn resolve_date_variable() {
        let result = resolve_variables("Today is {{date}}");
        assert!(result.text.starts_with("Today is 20"));
        assert_eq!(result.text.len(), "Today is YYYY-MM-DD".len());
        assert!(result.cursor_utf16_offset.is_none());
    }

    #[test]
    fn resolve_time_variable() {
        let result = resolve_variables("Time: {{time}}");
        // HH:MM format
        assert_eq!(result.text.len(), "Time: HH:MM".len());
        let time_part = &result.text[6..];
        assert_eq!(time_part.len(), 5);
        assert_eq!(time_part.chars().nth(2), Some(':'));
    }

    #[test]
    fn resolve_datetime_variable() {
        let result = resolve_variables("{{datetime}}");
        assert!(result.text.len() >= 16);
        assert!(result.text.contains(' '));
    }

    #[test]
    fn clipboard_variable_left_untouched_when_empty() {
        let result = resolve_variables("clip: {{clipboard}}");
        assert_eq!(result.text, "clip: {{clipboard}}");
    }

    #[test]
    fn cursor_variable_returns_offset() {
        let result = resolve_variables("before{{cursor}}after");
        assert_eq!(result.text, "beforeafter");
        assert_eq!(result.cursor_utf16_offset, Some(6));
    }

    #[test]
    fn cursor_at_start() {
        let result = resolve_variables("{{cursor}}hello");
        assert_eq!(result.text, "hello");
        assert_eq!(result.cursor_utf16_offset, Some(0));
    }

    #[test]
    fn cursor_at_end() {
        let result = resolve_variables("hello{{cursor}}");
        assert_eq!(result.text, "hello");
        assert_eq!(result.cursor_utf16_offset, Some(5));
    }

    #[test]
    fn multiple_variables_resolved() {
        let result = resolve_variables("{{date}} {{time}}");
        assert!(result.text.len() >= 16);
        assert!(result.text.contains(' '));
    }

    #[test]
    fn cursor_utf16_offset_with_non_bmp() {
        let result = resolve_variables("a{{cursor}}\u{1F600}");
        assert_eq!(result.text, "a\u{1F600}");
        // "a" is 1 UTF-16 code unit, cursor is after it
        assert_eq!(result.cursor_utf16_offset, Some(1));
    }

    #[test]
    fn no_variables_returns_original() {
        let result = resolve_variables("hello world");
        assert_eq!(result.text, "hello world");
        assert!(result.cursor_utf16_offset.is_none());
    }

    #[test]
    fn empty_string() {
        let result = resolve_variables("");
        assert_eq!(result.text, "");
        assert!(result.cursor_utf16_offset.is_none());
    }

    #[test]
    fn cursor_only() {
        let result = resolve_variables("{{cursor}}");
        assert_eq!(result.text, "");
        assert_eq!(result.cursor_utf16_offset, Some(0));
    }

    #[test]
    fn first_cursor_only() {
        let result = resolve_variables("{{cursor}}{{cursor}}");
        assert_eq!(result.text, "{{cursor}}");
        assert_eq!(result.cursor_utf16_offset, Some(0));
    }
}
