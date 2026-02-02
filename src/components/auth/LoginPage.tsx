import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { listen } from '@tauri-apps/api/event'
import { invoke } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-shell'
import { useAuthStore, useThemeStore } from '../../stores'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'

export function LoginPage() {
  const { t } = useTranslation()
  const { setAuth } = useAuthStore()
  const { theme, toggleTheme } = useThemeStore()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleKakaoLogin = async () => {
    console.log('🚀 카카오 로그인 시작')
    setIsLoading(true)
    setError(null)

    try {
      // 1. Start OAuth server via Tauri command
      console.log('📡 OAuth 서버 시작 중...')
      const port = await invoke<number>('start_oauth_server')
      console.log('✅ OAuth 서버 시작 완료. 포트:', port)

      // 2. Listen for the redirect URL from the OAuth server
      console.log('👂 OAuth 콜백 리스너 등록 중...')
      const unlisten = await listen<string>('oauth://url', async (event) => {
        console.log('📥 OAuth 콜백 수신:', event.payload)

        try {
          const redirectUrl = event.payload
          const url = new URL(redirectUrl)
          const code = url.searchParams.get('code')

          console.log('🔑 인증 코드 추출:', { hasCode: !!code })

          if (!code) {
            console.error('❌ 인증 코드 없음')
            setError('Missing authorization code in OAuth callback')
            setIsLoading(false)
            unlisten()
            return
          }

          // 3. 백엔드로 인증 코드 전송하여 토큰 받기
          console.log('📡 백엔드로 인증 코드 전송 중...')
          const callbackResponse = await fetch(
            `${API_BASE_URL}/api/auth/kakao/callback?code=${encodeURIComponent(code)}`,
          )

          console.log('📥 백엔드 콜백 응답 상태:', callbackResponse.status)

          if (!callbackResponse.ok) {
            const errorText = await callbackResponse.text()
            console.error('❌ 백엔드 콜백 에러:', errorText)
            throw new Error('Failed to process authentication')
          }

          const authData = await callbackResponse.json()
          console.log('✅ 인증 데이터 받음:', {
            hasAccessToken: !!authData.accessToken,
            hasRefreshToken: !!authData.refreshToken,
            member: authData.member,
          })

          if (!authData.accessToken || !authData.refreshToken || !authData.member) {
            console.error('❌ 토큰 또는 멤버 정보 없음')
            throw new Error('Invalid authentication response')
          }

          // 4. Zustand store에 인증 정보 저장
          console.log('💾 인증 정보 저장 중...')
          setAuth(authData.member, authData.accessToken, authData.refreshToken)
          console.log('✅ 로그인 성공!')

          setError(null)
        } catch (err) {
          console.error('❌ OAuth 콜백 처리 실패:', err)
          setError('Login succeeded but failed to process authentication')
        } finally {
          setIsLoading(false)
          unlisten()
        }
      })
      console.log('✅ 리스너 등록 완료')

      // 4. Get auth URL from backend, passing the localhost redirect port
      console.log('📡 백엔드에서 OAuth URL 요청 중...')
      const redirectUri = `http://localhost:${port}`
      console.log('🔗 Redirect URI:', redirectUri)

      const response = await fetch(
        `${API_BASE_URL}/api/auth/kakao/start?callback=${encodeURIComponent(redirectUri)}`,
      )

      console.log('📥 백엔드 응답 상태:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ 백엔드 에러:', errorText)
        throw new Error(`Backend returned ${response.status}`)
      }

      const data = await response.json()
      console.log('✅ OAuth 응답 받음:', data)

      const authUrl = data.authUrl
      if (!authUrl || typeof authUrl !== 'string') {
        console.error('❌ 유효하지 않은 OAuth URL:', data)
        throw new Error('No auth URL received from backend')
      }

      // 5. Open Kakao OAuth URL with Tauri shell API
      console.log('🌐 시스템 브라우저 오픈 시도:', authUrl)
      try {
        await open(authUrl)
        console.log('✅ 브라우저 오픈 완료. 사용자 로그인 대기 중...')
      } catch (openErr) {
        console.error('❌ 브라우저 오픈 실패:', openErr)
        throw new Error('Failed to open browser')
      }
    } catch (err) {
      console.error('❌ Kakao login error:', err)
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(`${t('auth.loginFailed')} (${errorMessage})`)
      setIsLoading(false)
    }
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

          {/* Loading state info */}
          {isLoading && (
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-600 dark:text-blue-400 text-center">
                {t('auth.waitingForBrowser', 'Browser opened. Complete login and return to the app...')}
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
