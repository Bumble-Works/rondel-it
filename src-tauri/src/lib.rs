/// Opens the print dialog for the page (with "Save as PDF"). The Mac web view
/// ignores window.print(), so the page asks for it here.
#[tauri::command]
fn print_page(window: tauri::WebviewWindow) -> Result<(), String> {
  window.print().map_err(|e| e.to_string())
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
    .invoke_handler(tauri::generate_handler![print_page])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
