use tauri::{Manager, App};
use tauri_plugin_deep_link::DeepLinkExt;

pub fn setup_deep_link(app: &App) -> Result<(), Box<dyn std::error::Error>> {
    // Register deep link plugin
    app.deep_link().register_all()?;

    let app_handle = app.handle().clone();

    // Listen for deep link URLs
    app.deep_link().on_open_url(move |event| {
        let url = event.urls().first().map(|u| u.to_string()).unwrap_or_default();

        println!("🔗 Deep link received: {}", url);

        // Parse the URL to extract OAuth code
        if url.contains("code=") {
            if let Some(code) = extract_query_param(&url, "code") {
                println!("✅ OAuth code extracted: {}...", &code[..code.len().min(20)]);

                // Emit event to frontend with the OAuth code
                let _ = app_handle.emit("oauth-callback", OAuthCallbackPayload {
                    code: code.clone(),
                    error: None,
                });
            }
        } else if url.contains("error=") {
            if let Some(error) = extract_query_param(&url, "error") {
                println!("❌ OAuth error: {}", error);

                let _ = app_handle.emit("oauth-callback", OAuthCallbackPayload {
                    code: String::new(),
                    error: Some(error),
                });
            }
        }
    });

    Ok(())
}

fn extract_query_param(url: &str, param: &str) -> Option<String> {
    url.split('?')
        .nth(1)?
        .split('&')
        .find(|p| p.starts_with(&format!("{}=", param)))
        .and_then(|p| p.split('=').nth(1))
        .map(|s| s.to_string())
}

#[derive(Clone, serde::Serialize)]
struct OAuthCallbackPayload {
    code: String,
    error: Option<String>,
}
