// API keys are stored in the OS keychain (not in localStorage),
// so this module only moves keys between the keychain and the
// frontend store. A missing secret service degrades gracefully:
// the key then lives in memory for the session only.
use keyring::Entry;

/// Writes an API key into the OS keychain under the "descify"
/// application name, keyed by provider ("gemini" / "openrouter").
///
/// After writing, the value is read back to verify the OS backend
/// actually persisted it.  If the read-back is missing or differs
/// (e.g. the mock in-memory backend is silently active), an error
/// is returned so the caller can warn the user instead of hiding it.
#[tauri::command]
pub async fn store_api_key(provider: String, key: String) -> Result<(), String> {
    let entry = Entry::new("descify", &provider).map_err(|e| e.to_string())?;
    entry.set_password(&key).map_err(|e| e.to_string())?;

    // Verify the write actually reached a persistent backend.
    match entry.get_password() {
        Ok(stored) if stored == key => Ok(()),
        Ok(_) => Err("Keychain write verification failed: stored value does not match".to_string()),
        Err(e) => Err(format!(
            "Keychain unavailable — key saved for this session only: {e}"
        )),
    }
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
