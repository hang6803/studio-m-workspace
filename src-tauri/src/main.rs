// Hides the extra console window on Windows release builds; does nothing on macOS.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    m_app_lib::run()
}
