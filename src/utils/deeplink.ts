import { listen } from '@tauri-apps/api/event'

export interface OAuthCallbackPayload {
  code: string
  error?: string
}

export type OAuthCallbackHandler = (payload: OAuthCallbackPayload) => void

/**
 * Sets up a listener for OAuth deep link callbacks from the Tauri backend.
 * This is used in production when the app handles custom URI schemes.
 *
 * @param handler - Callback function to handle the OAuth response
 * @returns Cleanup function to remove the listener
 *
 * @example
 * ```typescript
 * useEffect(() => {
 *   const cleanup = setupOAuthListener(({ code, error }) => {
 *     if (error) {
 *       console.error('OAuth error:', error)
 *       return
 *     }
 *     if (code) {
 *       // Exchange code for tokens
 *       handleOAuthCode(code)
 *     }
 *   })
 *   return cleanup
 * }, [])
 * ```
 */
export async function setupOAuthListener(handler: OAuthCallbackHandler): Promise<() => void> {
  console.log('🔗 Setting up OAuth deep link listener...')

  const unlisten = await listen<OAuthCallbackPayload>('oauth-callback', (event) => {
    console.log('🔗 Deep link OAuth callback received:', {
      hasCode: !!event.payload.code,
      hasError: !!event.payload.error,
    })

    handler(event.payload)
  })

  return unlisten
}

/**
 * Checks if the app is running in Tauri (desktop) vs web browser
 */
export function isTauriApp(): boolean {
  return typeof window !== 'undefined' && '__TAURI__' in window
}

/**
 * Gets the appropriate redirect URI based on environment
 * - Development: http://localhost:1420/oauth/callback
 * - Production: kakao{REST_API_KEY}://oauth
 */
export function getRedirectUri(): string {
  const envRedirectUri = import.meta.env.VITE_KAKAO_REDIRECT_URI

  if (envRedirectUri) {
    return envRedirectUri
  }

  // Fallback for development
  if (import.meta.env.DEV) {
    return 'http://localhost:1420/oauth/callback'
  }

  // Production fallback - should never reach here if env vars are set correctly
  console.warn('⚠️ VITE_KAKAO_REDIRECT_URI not set, using fallback')
  return 'http://localhost:1420/oauth/callback'
}

/**
 * Opens the Kakao OAuth URL in the system browser (for deep link flow)
 * or in the same window (for web flow)
 */
export async function openOAuthUrl(url: string): Promise<void> {
  if (isTauriApp()) {
    // In Tauri app, open in system browser
    const { shell } = await import('@tauri-apps/api')
    await shell.open(url)
    console.log('🌐 Opened OAuth URL in system browser')
  } else {
    // In web browser, navigate to OAuth URL
    window.location.href = url
    console.log('🌐 Navigating to OAuth URL')
  }
}

