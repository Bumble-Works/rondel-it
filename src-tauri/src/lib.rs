use tauri::Manager;

/// Passed when macOS starts the app at login, so it starts quietly in the background.
const LAUNCHED_AT_LOGIN: &str = "--at-login";

/// Opens the print dialog for the page (with "Save as PDF"). The Mac web view
/// ignores window.print(), so the page asks for it here.
#[tauri::command]
fn print_page(window: tauri::WebviewWindow) -> Result<(), String> {
  window.print().map_err(|e| e.to_string())
}

fn show_main_window(app: &tauri::AppHandle) {
  if let Some(window) = app.get_webview_window("main") {
    let _ = window.show();
    let _ = window.set_focus();
  }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    // Sync: pick a folder, read/write its files, and reveal it in Finder.
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    // Remembers the folder the user granted access to, across restarts.
    .plugin(tauri_plugin_persisted_scope::init())
    .plugin(tauri_plugin_opener::init())
    // "Start Rondel It at login" (off unless the user turns it on in Settings).
    .plugin(tauri_plugin_autostart::init(
      tauri_plugin_autostart::MacosLauncher::LaunchAgent,
      Some(vec![LAUNCHED_AT_LOGIN]),
    ))
    .invoke_handler(tauri::generate_handler![print_page])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      // Started at login: stay hidden (reminders still run) until opened from the Dock.
      if std::env::args().any(|arg| arg == LAUNCHED_AT_LOGIN) {
        if let Some(window) = app.get_webview_window("main") {
          let _ = window.hide();
        }
      }
      Ok(())
    })
    .build(tauri::generate_context!())
    .expect("error while building tauri application")
    .run(|app, event| {
      // Clicking the Dock icon shows the window again if it was hidden.
      #[cfg(target_os = "macos")]
      if let tauri::RunEvent::Reopen { .. } = event {
        show_main_window(app);
      }
      let _ = (app, event);
    });
}
