use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use jsonwebtoken::{decode, decode_header, Algorithm, DecodingKey, Validation};
use keyring::Entry;
use rand::{distributions::Alphanumeric, Rng};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::io::{Read, Write};
use std::net::TcpListener;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::Emitter;
use url::Url;
use uuid::Uuid;

const CREDENTIAL_KEY: &str = "codex_credentials";
const HOST_ID_KEY: &str = "codex_host_id";
const AUTH_ENDPOINT: &str = "https://auth.openai.com/api/accounts/authorize";
const TOKEN_ENDPOINT: &str = "https://auth.openai.com/api/accounts/oauth/token";
const RESOURCE: &str = "https://api.openai.com/v1";
const REDIRECT_PATH: &str = "/auth/callback";
const SCOPES: &str = "openid profile email offline_access resource.invoke chatgpt.tokens.use.direct";

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Credentials {
    client_id: String,
    access_token: String,
    refresh_token: String,
    id_token: String,
    email: Option<String>,
    subject: String,
    scopes: Vec<String>,
    expires_at: u64,
}

#[derive(Debug, Serialize)]
pub struct CodexStatus {
    pub connected: bool,
    pub email: Option<String>,
    pub plan_usage_enabled: bool,
    pub expires_at: Option<u64>,
}

#[derive(Debug, Deserialize)]
struct TokenResponse {
    access_token: String,
    refresh_token: Option<String>,
    id_token: String,
    expires_in: Option<u64>,
    scope: Option<String>,
}

#[derive(Debug, Deserialize)]
struct IdClaims {
    sub: String,
    email: Option<String>,
    nonce: String,
    exp: usize,
}

fn entry(key: &str) -> Result<Entry, String> {
    Entry::new("descify", key).map_err(|e| e.to_string())
}

fn get_host_id() -> Result<String, String> {
    if let Ok(value) = entry(HOST_ID_KEY)?.get_password() {
        return Ok(value);
    }
    let value = format!("urn:uuid:{}", Uuid::new_v4());
    entry(HOST_ID_KEY)?.set_password(&value).map_err(|e| e.to_string())?;
    Ok(value)
}

fn random_string(length: usize) -> String {
    rand::thread_rng()
        .sample_iter(&Alphanumeric)
        .take(length)
        .map(char::from)
        .collect()
}

fn pkce_pair() -> (String, String) {
    let verifier = random_string(64);
    let digest = Sha256::digest(verifier.as_bytes());
    (verifier, URL_SAFE_NO_PAD.encode(digest))
}

fn now() -> u64 {
    SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_secs()
}

async fn validate_id_token(id_token: &str, client_id: &str, nonce: &str) -> Result<IdClaims, String> {
    let header = decode_header(id_token).map_err(|e| format!("Invalid ChatGPT ID token: {e}"))?;
    let jwks: serde_json::Value = Client::new()
        .get("https://auth.openai.com/.well-known/jwks.json")
        .send().await.map_err(|e| e.to_string())?
        .error_for_status().map_err(|e| e.to_string())?
        .json().await.map_err(|e| e.to_string())?;
    let key = jwks.get("keys").and_then(|keys| keys.as_array())
        .and_then(|keys| keys.iter().find(|key| key.get("kid").and_then(|v| v.as_str()) == header.kid.as_deref()))
        .ok_or_else(|| "OpenAI ID-token signing key was not found".to_string())?;
    let key: jsonwebtoken::jwk::Jwk = serde_json::from_value(key.clone()).map_err(|e| e.to_string())?;
    let decoding_key = DecodingKey::from_jwk(&key).map_err(|e| e.to_string())?;
    let mut validation = Validation::new(Algorithm::RS256);
    validation.set_issuer(&["https://auth.openai.com"]);
    validation.set_audience(&[client_id]);
    let claims = decode::<IdClaims>(id_token, &decoding_key, &validation)
        .map_err(|e| format!("ChatGPT identity validation failed: {e}"))?.claims;
    if claims.nonce != nonce { return Err("ChatGPT identity nonce did not match".into()); }
    if claims.exp as u64 <= now() { return Err("ChatGPT identity token has expired".into()); }
    Ok(claims)
}

fn callback_response(body: &str) -> String {
    format!("HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nConnection: close\r\n\r\n<html><body style=\"font-family:sans-serif\"><h2>{body}</h2><p>You can return to Descify.</p></body></html>")
}

#[tauri::command]
pub async fn codex_sign_in() -> Result<CodexStatus, String> {
    let listener = TcpListener::bind("127.0.0.1:0").map_err(|e| e.to_string())?;
    let port = listener.local_addr().map_err(|e| e.to_string())?.port();
    let redirect_uri = format!("http://127.0.0.1:{port}{REDIRECT_PATH}");
    let host_id = get_host_id()?;
    let (verifier, challenge) = pkce_pair();
    let state = random_string(48);
    let nonce = random_string(48);
    let current = entry(CREDENTIAL_KEY)?.get_password().ok()
        .and_then(|raw| serde_json::from_str::<Credentials>(&raw).ok());
    let client_id = current.as_ref().map(|c| c.client_id.as_str()).unwrap_or("dynamic_agent_client");

    let mut auth_url = Url::parse(AUTH_ENDPOINT).map_err(|e| e.to_string())?;
    {
        let mut query = auth_url.query_pairs_mut();
        query.append_pair("client_id", client_id)
            .append_pair("response_type", "code")
            .append_pair("redirect_uri", &redirect_uri)
            .append_pair("scope", SCOPES)
            .append_pair("resource", RESOURCE)
            .append_pair("state", &state)
            .append_pair("nonce", &nonce)
            .append_pair("code_challenge_method", "S256")
            .append_pair("code_challenge", &challenge)
            .append_pair("ext_agent_host_id", &host_id);
        if client_id == "dynamic_agent_client" {
            query.append_pair("agent_name_hint", "Descify");
        } else if let Some(token) = current.as_ref().map(|c| c.id_token.as_str()) {
            query.append_pair("id_token_hint", token);
        }
    }
    open::that(auth_url.as_str()).map_err(|e| format!("Could not open the browser: {e}"))?;

    let (callback_url, _) = tokio::sync::oneshot::channel::<String>();
    let (tx, rx) = tokio::sync::oneshot::channel::<String>();
    std::thread::spawn(move || {
        if let Ok((mut stream, _)) = listener.accept() {
            let mut buffer = [0_u8; 8192];
            let _ = stream.read(&mut buffer);
            let request = String::from_utf8_lossy(&buffer);
            if let Some(target) = request.lines().next().and_then(|line| line.split_whitespace().nth(1)) {
                let parsed = Url::parse(&format!("http://localhost{target}"));
                let _ = stream.write_all(callback_response("Authentication complete").as_bytes());
                let _ = tx.send(parsed.map(|url| url.to_string()).unwrap_or_default());
            }
        }
        drop(callback_url);
    });
    let callback = rx.await.map_err(|_| "ChatGPT sign-in callback was interrupted".to_string())?;
    let callback = Url::parse(&callback).map_err(|e| e.to_string())?;
    let params: std::collections::HashMap<_, _> = callback.query_pairs().into_owned().collect();
    if params.get("state").map(String::as_str) != Some(state.as_str()) { return Err("ChatGPT sign-in state validation failed".into()); }
    if let Some(error) = params.get("error") { return Err(format!("ChatGPT sign-in failed: {error}")); }
    let code = params.get("code").ok_or_else(|| "ChatGPT did not return an authorization code".to_string())?;
    let issued_client_id = params.get("client_id").map(String::as_str).unwrap_or(client_id);
    if client_id != "dynamic_agent_client" && issued_client_id != client_id { return Err("ChatGPT returned an unexpected client registration".into()); }

    let token: TokenResponse = Client::new().post(TOKEN_ENDPOINT)
        .form(&[("grant_type", "authorization_code"), ("client_id", issued_client_id), ("code", code), ("code_verifier", &verifier), ("redirect_uri", &redirect_uri), ("resource", RESOURCE)])
        .send().await.map_err(|e| e.to_string())?.error_for_status().map_err(|e| e.to_string())?
        .json().await.map_err(|e| e.to_string())?;
    let claims = validate_id_token(&token.id_token, issued_client_id, &nonce).await?;
    let scopes = token.scope.unwrap_or_default().split_whitespace().map(str::to_string).collect::<Vec<_>>();
    if !scopes.iter().any(|scope| scope == "chatgpt.tokens.use.direct") { return Err("This ChatGPT account did not authorize plan usage for Descify".into()); }
    let credentials = Credentials { client_id: issued_client_id.to_string(), access_token: token.access_token, refresh_token: token.refresh_token.ok_or("ChatGPT did not return a refresh token")?, id_token: token.id_token, email: claims.email, subject: claims.sub, scopes, expires_at: now() + token.expires_in.unwrap_or(3600) };
    entry(CREDENTIAL_KEY)?.set_password(&serde_json::to_string(&credentials).map_err(|e| e.to_string())?).map_err(|e| e.to_string())?;
    Ok(CodexStatus { connected: true, email: credentials.email, plan_usage_enabled: true, expires_at: Some(credentials.expires_at) })
}

#[tauri::command]
pub async fn codex_status() -> Result<CodexStatus, String> {
    let credentials = entry(CREDENTIAL_KEY)?.get_password().ok().and_then(|raw| serde_json::from_str::<Credentials>(&raw).ok());
    Ok(match credentials { Some(c) => CodexStatus { connected: true, email: c.email, plan_usage_enabled: c.scopes.iter().any(|s| s == "chatgpt.tokens.use.direct"), expires_at: Some(c.expires_at) }, None => CodexStatus { connected: false, email: None, plan_usage_enabled: false, expires_at: None } })
}

#[tauri::command]
pub async fn codex_logout() -> Result<(), String> {
    match entry(CREDENTIAL_KEY)?.delete_credential() { Ok(()) | Err(keyring::Error::NoEntry) => Ok(()), Err(e) => Err(e.to_string()) }
}

#[derive(Debug, Serialize)]
pub struct CodexModel { pub slug: String, pub display_name: String }

#[tauri::command]
pub async fn codex_models() -> Result<Vec<CodexModel>, String> {
    let raw = entry(CREDENTIAL_KEY)?.get_password().map_err(|_| "Connect ChatGPT before loading Codex models".to_string())?;
    let credentials = refreshed_credentials(serde_json::from_str::<Credentials>(&raw).map_err(|e| e.to_string())?).await?;
    let response: serde_json::Value = Client::new().get(format!("{RESOURCE}/models")).bearer_auth(credentials.access_token).send().await.map_err(|e| e.to_string())?.error_for_status().map_err(|e| e.to_string())?.json().await.map_err(|e| e.to_string())?;
    Ok(response.get("models").and_then(|v| v.as_array()).into_iter().flatten().filter(|model| model.get("visibility").and_then(|v| v.as_str()) == Some("list")).filter_map(|model| Some(CodexModel { slug: model.get("slug")?.as_str()?.to_string(), display_name: model.get("display_name").and_then(|v| v.as_str()).unwrap_or_else(|| model.get("slug").and_then(|v| v.as_str()).unwrap_or("Codex model")).to_string() })).collect())
}

#[derive(Debug, Deserialize)]
pub struct CodexGenerateRequest { pub model: String, pub prompt: String, pub image_data_url: String }

async fn refreshed_credentials(mut credentials: Credentials) -> Result<Credentials, String> {
    if credentials.expires_at > now() + 60 { return Ok(credentials); }
    let token: TokenResponse = Client::new().post(TOKEN_ENDPOINT)
        .form(&[("grant_type", "refresh_token"), ("client_id", credentials.client_id.as_str()), ("refresh_token", credentials.refresh_token.as_str()), ("resource", RESOURCE)])
        .send().await.map_err(|e| e.to_string())?.error_for_status().map_err(|e| e.to_string())?.json().await.map_err(|e| e.to_string())?;
    credentials.access_token = token.access_token;
    if let Some(refresh) = token.refresh_token { credentials.refresh_token = refresh; }
    credentials.expires_at = now() + token.expires_in.unwrap_or(3600);
    entry(CREDENTIAL_KEY)?.set_password(&serde_json::to_string(&credentials).map_err(|e| e.to_string())?).map_err(|e| e.to_string())?;
    Ok(credentials)
}

#[tauri::command]
pub async fn codex_generate(request: CodexGenerateRequest, app: tauri::AppHandle) -> Result<String, String> {
    let raw = entry(CREDENTIAL_KEY)?.get_password().map_err(|_| "Connect ChatGPT before using Codex".to_string())?;
    let credentials = refreshed_credentials(serde_json::from_str::<Credentials>(&raw).map_err(|e| e.to_string())?).await?;
    let body = serde_json::json!({ "model": request.model, "store": false, "stream": true, "input": [{ "role": "user", "content": [{ "type": "input_text", "text": request.prompt }, { "type": "input_image", "image_url": request.image_data_url }] }] });
    let response = Client::new().post(format!("{RESOURCE}/responses")).bearer_auth(credentials.access_token).json(&body).send().await.map_err(|e| e.to_string())?;
    if !response.status().is_success() { let status = response.status(); let detail = response.text().await.unwrap_or_default(); return Err(if status.as_u16() == 429 { "ChatGPT plan usage limit or rate limit reached. No API-key fallback was attempted.".into() } else { format!("Codex request failed ({status}): {detail}") }); }
    let mut stream = response.bytes_stream();
    let mut buffer = String::new();
    let mut text = String::new();
    let mut completed = false;
    while let Some(chunk) = futures_util::StreamExt::next(&mut stream).await { buffer.push_str(&String::from_utf8_lossy(&chunk.map_err(|e| e.to_string())?)); while let Some(index) = buffer.find("\n\n") { let event = buffer[..index].to_string(); buffer.drain(..index + 2); if let Some(data) = event.lines().find_map(|line| line.strip_prefix("data: ")) { if data == "[DONE]" { continue; } if let Ok(json) = serde_json::from_str::<serde_json::Value>(data) { match json.get("type").and_then(|v| v.as_str()) { Some("response.output_text.delta") => if let Some(delta) = json.get("delta").and_then(|v| v.as_str()) { text.push_str(delta); let _ = app.emit("codex-delta", delta); }, Some("response.completed") => completed = true, Some("response.failed") => return Err("Codex response failed; your ChatGPT plan may be unavailable or out of allowance.".into()), _ => {} } } } } }
    if !completed { return Err("Codex stream ended before response.completed".into()); }
    if text.is_empty() { return Err("Codex returned an empty response".into()); }
    Ok(text)
}
