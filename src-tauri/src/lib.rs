#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // requests from the page (Apps Script API, AI servers) go out through Rust, so no browser CORS rules apply
        .plugin(tauri_plugin_http::init())
        .run(tauri::generate_context!())
        .expect("error while running M app");
}
