use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Settings {
    pub enabled: bool,
    pub trigger_key: String,
    pub theme: String,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            enabled: true,
            trigger_key: "both".to_string(),
            theme: "dark".to_string(),
        }
    }
}

pub fn load_settings(path: &Path) -> Settings {
    if path.exists() {
        fs::read_to_string(path)
            .ok()
            .and_then(|c| serde_json::from_str(&c).ok())
            .unwrap_or_default()
    } else {
        Settings::default()
    }
}

pub fn save_settings(path: &Path, settings: &Settings) -> Result<()> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    fs::write(path, serde_json::to_string_pretty(settings)?)?;
    Ok(())
}
