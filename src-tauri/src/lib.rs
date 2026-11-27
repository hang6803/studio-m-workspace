#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // requests from the page (Apps Script API, AI servers) go out through Rust, so no browser CORS rules apply
        .plugin(tauri_plugin_http::init())
        // self-update from GitHub Releases (latest.json, signed with the key whose public half is in tauri.conf.json)
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())   // relaunch after an update
        // a link to a website opens in the Mac's browser: the app's own window can't open a new tab, so clicking one did nothing
        .plugin(tauri_plugin_opener::init())
        .run(tauri::generate_context!())
        .expect("error while running M Workspace");
}
