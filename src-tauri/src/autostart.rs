/// Windows auto-start — register / unregister the app in
/// `HKCU\Software\Microsoft\Windows\CurrentVersion\Run`.
#[cfg(target_os = "windows")]
pub fn enable_autostart() {
    use winreg::enums::*;
    use winreg::RegKey;

    let exe = match std::env::current_exe() {
        Ok(p) => p,
        Err(e) => {
            log::error!("autostart: failed to get exe path: {}", e);
            return;
        }
    };

    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let run_key = match hkcu.open_subkey_with_flags(
        r"Software\Microsoft\Windows\CurrentVersion\Run",
        KEY_WRITE,
    ) {
        Ok(k) => k,
        Err(e) => {
            log::error!("autostart: failed to open Run key: {}", e);
            return;
        }
    };

    let app_name = "DesktopCalendar";
    let exe_str = exe.to_string_lossy().to_string();

    match run_key.set_value(app_name, &exe_str) {
        Ok(_) => log::info!("autostart: registered \"{}\" -> {}", app_name, exe_str),
        Err(e) => log::error!("autostart: failed to set registry value: {}", e),
    }
}

#[cfg(target_os = "windows")]
pub fn disable_autostart() {
    use winreg::enums::*;
    use winreg::RegKey;

    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    if let Ok(run_key) = hkcu.open_subkey_with_flags(
        r"Software\Microsoft\Windows\CurrentVersion\Run",
        KEY_WRITE,
    ) {
        let _ = run_key.delete_value("DesktopCalendar");
        log::info!("autostart: removed");
    }
}

#[cfg(target_os = "windows")]
pub fn is_autostart_enabled() -> bool {
    use winreg::enums::*;
    use winreg::RegKey;

    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    if let Ok(run_key) = hkcu.open_subkey_with_flags(
        r"Software\Microsoft\Windows\CurrentVersion\Run",
        KEY_READ,
    ) {
        return run_key.get_value::<String, _>("DesktopCalendar").is_ok();
    }
    false
}

// ── Tauri commands ──────────────────────────────────────────────────────

#[cfg(target_os = "windows")]
#[tauri::command]
pub fn set_autostart(enabled: bool) -> bool {
    if enabled {
        enable_autostart();
    } else {
        disable_autostart();
    }
    is_autostart_enabled()
}

#[cfg(target_os = "windows")]
#[tauri::command]
pub fn get_autostart() -> bool {
    is_autostart_enabled()
}