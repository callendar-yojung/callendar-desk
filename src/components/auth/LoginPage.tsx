import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore, useThemeStore } from '../../stores'
import { authApi } from '../../api'
import { setupOAuthListener, getRedirectUri, openOAuthUrl, isTauriApp } from '../../utils/deeplink'

const KAKAO_CLIENT_ID = import.meta.env.VITE_KAKAO_CLIENT_ID
const KAKAO_CLIENT_SECRET = import.meta.env.VITE_KAKAO_CLIENT_SECRET
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'

export function LoginPage() {
  const { t } = useTranslation()
  const { setAuth } = useAuthStore()
  const { theme, toggleTheme } = useThemeStore()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Get redirect URI based on environment (localhost for dev, custom scheme for prod)
  const KAKAO_REDIRECT_URI = getRedirectUri()

  // 환경 변수 로그
  useEffect(() => {
    console.log('🔧 Environment Variables:', {
      KAKAO_CLIENT_ID: KAKAO_CLIENT_ID ? `${KAKAO_CLIENT_ID.substring(0, 10)}...` : 'NOT SET',
      KAKAO_CLIENT_SECRET: KAKAO_CLIENT_SECRET ? `${KAKAO_CLIENT_SECRET.substring(0, 10)}...` : 'NOT SET',
      KAKAO_REDIRECT_URI,
      API_BASE_URL,
      isTauriApp: isTauriApp(),
      mode: import.meta.env.MODE,
    })
  }, [])

  // Setup deep link listener for production (Tauri app)
  useEffect(() => {
    if (!isTauriApp()) {
      console.log('📱 Not a Tauri app, skipping deep link listener')
      return
    }

    console.log('🔗 Setting up deep link listener for OAuth callbacks')

    let cleanup: (() => void) | undefined

    setupOAuthListener(({ code, error: oauthError }) => {
      console.log('🔗 Deep link OAuth callback received:', {
        hasCode: !!code,
        hasError: !!oauthError,
      })

      if (oauthError) {
        console.error('❌ OAuth Error from deep link:', oauthError)
        setError(t('auth.loginFailed'))
        return
      }

      if (code) {
        console.log('✅ OAuth code received from deep link, processing...')
        handleKakaoCallback(code)
      }
    }).then((unlistenFn) => {
      cleanup = unlistenFn
    })

    return () => {
      cleanup?.()
    }
  }, [])

  // Handle OAuth callback (for web/localhost flow)
  useEffect(() => {
    // Skip if in Tauri app (handled by deep link listener)
    if (isTauriApp()) {
      return
    }

    const urlParams = new URLSearchParams(window.location.search)
    const code = urlParams.get('code')
    const errorParam = urlParams.get('error')

    console.log('🔍 URL Parameters:', {
      code: code ? `${code.substring(0, 20)}...` : null,
      error: errorParam,
      fullURL: window.location.href,
    })

    if (errorParam) {
      console.error('❌ OAuth Error Parameter:', errorParam)
      setError(t('auth.loginFailed'))
      window.history.replaceState({}, document.title, window.location.pathname)
      return
    }

    if (code) {
      console.log('✅ OAuth code received from URL, starting callback...')
      handleKakaoCallback(code)
    }
  }, [])

  const handleKakaoCallback = async (code: string) => {
    setIsLoading(true)
    setError(null)

    try {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('1️⃣ Step 1: Exchanging code for Kakao token...')
      console.log('   Code:', code.substring(0, 30) + '...')

      const tokenRequestBody = {
        grant_type: 'authorization_code',
        client_id: KAKAO_CLIENT_ID,
        client_secret: KAKAO_CLIENT_SECRET,
        redirect_uri: KAKAO_REDIRECT_URI,
        code,
      }

      console.log('   Token Request Body:', {
        ...tokenRequestBody,
        client_id: KAKAO_CLIENT_ID?.substring(0, 10) + '...',
        client_secret: KAKAO_CLIENT_SECRET?.substring(0, 10) + '...',
        code: code.substring(0, 20) + '...',
      })

      // Exchange code for Kakao access token
      const tokenResponse = await fetch('https://kauth.kakao.com/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(tokenRequestBody),
      })

      console.log('   Token Response Status:', tokenResponse.status, tokenResponse.statusText)

      const tokenData = await tokenResponse.json()
      console.log('2️⃣ Step 2: Kakao token response received')
      console.log('   Success:', !!tokenData.access_token)
      console.log('   Error:', tokenData.error || 'none')
      console.log('   Token preview:', tokenData.access_token ? tokenData.access_token.substring(0, 30) + '...' : 'N/A')

      if (tokenData.error) {
        console.error('❌ Kakao token error:', tokenData)
        setError(`${t('auth.loginFailed')} (Kakao: ${tokenData.error})`)
        window.history.replaceState({}, document.title, window.location.pathname)
        return
      }

      if (tokenData.access_token) {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log('3️⃣ Step 3: Sending Kakao token to backend...')
        console.log('   Backend URL:', `${API_BASE_URL}/api/auth/external/kakao`)
        console.log('   Access token length:', tokenData.access_token.length)

        try {
          const response = await authApi.loginWithKakao(tokenData.access_token)

          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
          console.log('4️⃣ Step 4: Backend response received')
          console.log('   Response keys:', Object.keys(response))
          console.log('   User:', response.user ? '✓' : '✗')
          console.log('   AccessToken:', response.accessToken ? '✓' : '✗')
          console.log('   RefreshToken:', response.refreshToken ? '✓' : '✗')

          if (response.user) {
            console.log('   User details:', {
              memberId: response.user.member_id,
              email: response.user.email,
              nickname: response.user.nickname,
            })
          }

          setAuth(response.user, response.accessToken, response.refreshToken)
          console.log('✅ Login successful! Auth state updated.')
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
          window.history.replaceState({}, document.title, window.location.pathname)
        } catch (backendError) {
          console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
          console.error('❌ Backend API error:', backendError)
          if (backendError instanceof Error) {
            console.error('   Error message:', backendError.message)
            console.error('   Error stack:', backendError.stack)
          }
          console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
          throw backendError
        }
      } else {
        console.error('❌ No access token in Kakao response:', tokenData)
        setError(t('auth.loginFailed'))
        window.history.replaceState({}, document.title, window.location.pathname)
      }
    } catch (err) {
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.error('❌ Kakao login error:', err)
      if (err instanceof Error) {
        console.error('   Error name:', err.name)
        console.error('   Error message:', err.message)
        console.error('   Error stack:', err.stack)
      }
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(`${t('auth.loginFailed')} (${errorMessage})`)
      window.history.replaceState({}, document.title, window.location.pathname)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKakaoLogin = async () => {
    if (!KAKAO_CLIENT_ID) {
      console.error('❌ Kakao Client ID is not configured')
      setError('Kakao Client ID is not configured')
      return
    }

    console.log('🚀 Starting Kakao OAuth flow...')
    console.log('   Redirect URI:', KAKAO_REDIRECT_URI)
    console.log('   Is Tauri App:', isTauriApp())

    // Build Kakao OAuth URL
    const kakaoAuthUrl = `https://kauth.kakao.com/oauth/authorize?client_id=${KAKAO_CLIENT_ID}&redirect_uri=${encodeURIComponent(
      KAKAO_REDIRECT_URI,
    )}&response_type=code`

    console.log('   Auth URL:', kakaoAuthUrl)

    // Open OAuth URL (system browser for Tauri, same window for web)
    await openOAuthUrl(kakaoAuthUrl)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          {/* Logo & Title */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-10 h-10 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Desktop Calendar
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2">
              {t('auth.loginDescription')}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400 text-center">
                {error}
              </p>
            </div>
          )}

          {/* Kakao Login Button */}
          <button
            onClick={handleKakaoLogin}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-[#FEE500] hover:bg-[#FDD800] text-[#191919] font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#191919]" />
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 3C6.477 3 2 6.463 2 10.691c0 2.678 1.785 5.035 4.478 6.378-.143.521-.921 3.358-.953 3.585 0 0-.019.159.084.22.103.06.226.013.226.013.298-.041 3.449-2.259 3.993-2.648.714.103 1.453.156 2.172.156 5.523 0 10-3.463 10-7.704S17.523 3 12 3z" />
                </svg>
                <span>{t('auth.kakaoLogin')}</span>
              </>
            )}
          </button>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-gray-700" />
            </div>
          </div>

          {/* Theme Toggle */}
          <div className="flex items-center justify-center">
            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              {theme === 'light' ? (
                <>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                    />
                  </svg>
                  <span>{t('theme.dark')}</span>
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                  <span>{t('theme.light')}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
