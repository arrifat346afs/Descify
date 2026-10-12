// API keys are stored in the OS keychain (not in localStorage),
// so this module only moves keys between the keychain and the
// frontend store. A missing secret service degrades gracefully:
// the key then lives in memory for the session only.
use keyring::Entry;

/// Writes an API key into the OS keychain under the "descify"
/// application name, keyed by provider ("gemini" / "openrouter").
#[tauri::command]
pub async fn store_api_key(provider: String, key: String) -> Result<(), String> {
    let entry = Entry::new("descify", &provider).map_err(|e| e.to_string())?;
    entry.set_password(&key).map_err(|e| e.to_string())
}

/// Reads an API key from the OS keychain; `None` when the
/// provider has no entry yet.
#[tauri::command]
pub async fn read_api_key(provider: String) -> Result<Option<String>, String> {
    let entry = Entry::new("descify", &provider).map_err(|e| e.to_string())?;
    match entry.get_password() {
        Ok(password) => Ok(Some(password)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}
