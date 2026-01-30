/// Win32 Desktop Attachment — embed the Tauri window into the Windows desktop
/// layer (behind icons, no taskbar entry, no Alt+Tab).
///
/// Technique:
///   1. Send `0x052C` to Progman so the shell spawns a WorkerW behind icons.
///   2. Find that WorkerW (the one whose child is SHELLDLL_DefView).
///   3. `SetParent(our_hwnd, workerw)` to embed our window.
///   4. Strip `WS_EX_APPWINDOW` / add `WS_EX_TOOLWINDOW` so it disappears
///      from the taskbar and Alt+Tab.
#[cfg(target_os = "windows")]
pub fn attach_to_desktop(hwnd: isize) {
    use windows::Win32::Foundation::{HWND, LPARAM, WPARAM};
    use windows::Win32::UI::WindowsAndMessaging::{
        EnumWindows, FindWindowA, FindWindowExA, GetWindowLongA, SendMessageTimeoutA,
        SetParent, SetWindowLongA, GWL_EXSTYLE, SMTO_NORMAL, WS_EX_APPWINDOW,
        WS_EX_TOOLWINDOW,
    };
    use windows::core::s;

    unsafe {
        let progman = FindWindowA(s!("Progman"), None).unwrap_or_default();
        if progman.0 == std::ptr::null_mut() {
            log::error!("desktop_attach: Progman window not found");
            return;
        }

        // Ask Progman to spawn a WorkerW behind the desktop icons.
        SendMessageTimeoutA(
            progman,
            0x052C,
            WPARAM(0),
            LPARAM(0),
            SMTO_NORMAL,
            1000,
            None,
        );

        // Walk top-level windows to find the WorkerW that sits behind SHELLDLL_DefView.
        let mut workerw = HWND::default();

        let _ = EnumWindows(
            Some(enum_callback),
            LPARAM(&mut workerw as *mut HWND as isize),
        );

        if workerw.0 == std::ptr::null_mut() {
            log::error!("desktop_attach: WorkerW not found");
            return;
        }

        let our_hwnd = HWND(hwnd as *mut _);

        // Embed our window into the desktop WorkerW.
        let _ = SetParent(our_hwnd, Some(workerw));

        // Hide from taskbar + Alt+Tab.
        let ex_style = GetWindowLongA(our_hwnd, GWL_EXSTYLE);
        let new_style = (ex_style & !(WS_EX_APPWINDOW.0 as i32))
            | (WS_EX_TOOLWINDOW.0 as i32);
        SetWindowLongA(our_hwnd, GWL_EXSTYLE, new_style);

        log::info!("desktop_attach: window attached to desktop layer");
    }
}

/// EnumWindows callback — finds the WorkerW whose child is SHELLDLL_DefView.
#[cfg(target_os = "windows")]
unsafe extern "system" fn enum_callback(
    hwnd: windows::Win32::Foundation::HWND,
    lparam: windows::Win32::Foundation::LPARAM,
) -> windows::Win32::Foundation::BOOL {
    use windows::Win32::Foundation::BOOL;
    use windows::Win32::UI::WindowsAndMessaging::FindWindowExA;
    use windows::core::s;

    let shell = FindWindowExA(Some(hwnd), None, s!("SHELLDLL_DefView"), None);
    if let Ok(shell) = shell {
        if shell.0 != std::ptr::null_mut() {
            // The WorkerW we want is the *next* sibling of this window.
            let next = FindWindowExA(None, Some(hwnd), s!("WorkerW"), None);
            if let Ok(next) = next {
                let out = &mut *(lparam.0 as *mut windows::Win32::Foundation::HWND);
                *out = next;
            }
            return BOOL(0); // stop enumerating
        }
    }
    BOOL(1) // continue
}