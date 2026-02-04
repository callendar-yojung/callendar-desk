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
    use windows::core::PCSTR;
    use windows::Win32::Foundation::{HWND, LPARAM, WPARAM};
    use windows::Win32::UI::WindowsAndMessaging::{
        EnumWindows, FindWindowA, FindWindowExA, GetWindowLongA, SendMessageTimeoutA,
        SetParent, SetWindowLongA, GWL_EXSTYLE, SMTO_NORMAL, WS_EX_APPWINDOW,
        WS_EX_TOOLWINDOW,
    };

    unsafe {
        let progman = FindWindowA(PCSTR(b"Progman\0".as_ptr()), PCSTR::null());
        if progman.is_err() || progman.as_ref().unwrap().0.is_null() {
            log::error!("desktop_attach: Progman window not found");
            return;
        }
        let progman = progman.unwrap();

        // Ask Progman to spawn a WorkerW behind the desktop icons.
        let _ = SendMessageTimeoutA(
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

        if workerw.0.is_null() {
            log::error!("desktop_attach: WorkerW not found");
            return;
        }

        let our_hwnd = HWND(hwnd as *mut _);

        // Embed our window into the desktop WorkerW.
        let _ = SetParent(our_hwnd, workerw);

        // Hide from taskbar + Alt+Tab.
        let ex_style = GetWindowLongA(our_hwnd, GWL_EXSTYLE);
        let new_style = (ex_style & !(WS_EX_APPWINDOW.0 as i32))
            | (WS_EX_TOOLWINDOW.0 as i32);
        let _ = SetWindowLongA(our_hwnd, GWL_EXSTYLE, new_style);

        log::info!("desktop_attach: window attached to desktop layer");
    }
}

/// EnumWindows callback — finds the WorkerW whose child is SHELLDLL_DefView.
#[cfg(target_os = "windows")]
unsafe extern "system" fn enum_callback(
    hwnd: windows::Win32::Foundation::HWND,
    lparam: windows::Win32::Foundation::LPARAM,
) -> windows::Win32::Foundation::BOOL {
    use windows::core::PCSTR;
    use windows::Win32::Foundation::BOOL;
    use windows::Win32::UI::WindowsAndMessaging::FindWindowExA;

    let class_name = PCSTR(b"SHELLDLL_DefView\0".as_ptr());
    let shell = FindWindowExA(hwnd, HWND::default(), class_name, PCSTR::null());

    if let Ok(shell) = shell {
        if !shell.0.is_null() {
            // The WorkerW we want is the *next* sibling of this window.
            let worker_class = PCSTR(b"WorkerW\0".as_ptr());
            let next = FindWindowExA(HWND::default(), hwnd, worker_class, PCSTR::null());
            if let Ok(next) = next {
                let out = &mut *(lparam.0 as *mut windows::Win32::Foundation::HWND);
                *out = next;
            }
            return BOOL(0); // stop enumerating
        }
    }
    BOOL(1) // continue
}