#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // requests from the page (Apps Script API, AI servers) go out through Rust, so no browser CORS rules apply
        .plugin(tauri_plugin_http::init())
        // self-update from GitHub Releases (latest.json, signed with the key whose public half is in tauri.conf.json)
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())   // relaunch after an update
        .run(tauri::generate_context!())
        .expect("error while running M app");
}
