use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Snippet {
    pub id: String,
    pub label: String,
    pub shortcut: String,
    pub expansion: String,
    #[serde(default)]
    pub folder: String,
}

pub fn load_snippets(path: &Path) -> Vec<Snippet> {
    if path.exists() {
        fs::read_to_string(path)
            .ok()
            .and_then(|content| serde_json::from_str(&content).ok())
            .unwrap_or_default()
    } else {
        Vec::new()
    }
}

pub fn save_snippets(path: &Path, snippets: &[Snippet]) -> Result<()> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    let content = serde_json::to_string_pretty(snippets)?;
    fs::write(path, content)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::env::temp_dir;

    #[test]
    fn load_missing_file_returns_empty() {
        let path = temp_dir().join("snipx_test_missing.json");
        let _ = fs::remove_file(&path);
        let result = load_snippets(&path);
        assert!(result.is_empty());
    }

    #[test]
    fn save_then_load_roundtrip() {
        let path = temp_dir().join("snipx_test_roundtrip.json");
        let _ = fs::remove_file(&path);

        let snippets = vec![Snippet {
            id: "1".into(),
            label: "Email".into(),
            shortcut: "/email".into(),
            expansion: "test@example.com".into(),
            folder: "".into(),
        }];

        save_snippets(&path, &snippets).unwrap();
        let loaded = load_snippets(&path);

        assert_eq!(loaded.len(), 1);
        assert_eq!(loaded[0].shortcut, "/email");
        assert_eq!(loaded[0].expansion, "test@example.com");

        let _ = fs::remove_file(&path);
    }

    #[test]
    fn load_corrupted_file_returns_empty() {
        let path = temp_dir().join("snipx_test_corrupt.json");
        fs::write(&path, "this is not valid json").unwrap();

        let result = load_snippets(&path);
        assert!(result.is_empty());

        let _ = fs::remove_file(&path);
    }

    #[test]
    fn save_empty_list() {
        let path = temp_dir().join("snipx_test_empty.json");
        let _ = fs::remove_file(&path);

        save_snippets(&path, &[]).unwrap();
        let loaded = load_snippets(&path);
        assert!(loaded.is_empty());

        let _ = fs::remove_file(&path);
    }

    #[test]
    fn multiple_snippets_roundtrip() {
        let path = temp_dir().join("snipx_test_multi.json");
        let _ = fs::remove_file(&path);

        let snippets = vec![
            Snippet {
                id: "1".into(),
                label: "Email".into(),
                shortcut: "/email".into(),
                expansion: "a@b.com".into(),
                folder: "".into(),
            },
            Snippet {
                id: "2".into(),
                label: "Address".into(),
                shortcut: "/addr".into(),
                expansion: "123 Main St".into(),
                folder: "".into(),
            },
        ];

        save_snippets(&path, &snippets).unwrap();
        let loaded = load_snippets(&path);

        assert_eq!(loaded.len(), 2);
        assert_eq!(loaded[0].shortcut, "/email");
        assert_eq!(loaded[1].shortcut, "/addr");

        let _ = fs::remove_file(&path);
    }
}
