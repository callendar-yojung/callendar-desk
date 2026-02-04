import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { listen } from '@tauri-apps/api/event'
import { open } from '@tauri-apps/plugin-shell'
import { fetch } from '@tauri-apps/plugin-http'
import { useAuthStore, useThemeStore } from '../../stores'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'

export function LoginPage() {
  const { t } = useTranslation()
  const { setAuth } = useAuthStore()
  const { theme, toggleTheme } = useThemeStore()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Setup deep link listener for OAuth callbacks
  useEffect(() => {
    console.log('🔗 Deep link 리스너 등록 중...')

    let unlisten: (() => void) | null = null

    // Listen for deep link callback from backend
    listen<string>('tauri://deep-link', (event) => {
      console.log('📥 Deep link 수신:', event.payload)

      try {
        const url = new URL(event.payload)

        // deskcal://auth/callback 체크
        if (url.hostname !== 'auth' || url.pathname !== '/callback') {
          console.log('❌ 잘못된 deep link 경로:', url.hostname, url.pathname)
          return
        }

        // 백엔드에서 보낸 파라미터 추출
        const accessToken = url.searchParams.get('accessToken')
        const refreshToken = url.searchParams.get('refreshToken')
        const memberId = url.searchParams.get('memberId')
        const nickname = url.searchParams.get('nickname')
        const email = url.searchParams.get('email')
        const errorParam = url.searchParams.get('error')

        // 에러 처리
        if (errorParam) {
          console.error('❌ 로그인 에러:', errorParam)
          setError(`Login failed: ${errorParam}`)
          setIsLoading(false)
          return
        }

        // 필수 파라미터 체크
        if (!accessToken || !refreshToken || !memberId) {
          console.error('❌ 필수 파라미터 누락:', { accessToken: !!accessToken, refreshToken: !!refreshToken, memberId: !!memberId })
          setError('Invalid login response: missing required parameters')
          setIsLoading(false)
          return
        }

        console.log('✅ 로그인 성공:', {
          memberId,
          nickname,
          email: email || 'N/A'
        })

        // Member 객체 생성 및 인증 설정
        setAuth(
          {
            memberId: Number(memberId),
            nickname: nickname || 'User',
            email: email || undefined,
            provider: 'kakao'
          },
          accessToken,
          refreshToken,
        )

        setError(null)
        setIsLoading(false)
      } catch (err) {
        console.error('❌ Deep link 파싱 에러:', err)
        setError('Failed to process login callback')
        setIsLoading(false)
      }
    }).then((unlistenFn) => {
      unlisten = unlistenFn
      console.log('✅ Deep link 리스너 등록 완료')
    })

    return () => {
      if (unlisten) {
        unlisten()
        console.log('🔗 Deep link 리스너 해제')
      }
    }
  }, [setAuth])

  const handleKakaoLogin = async () => {
    console.log('🚀 카카오 로그인 시작')
    setIsLoading(true)
    setError(null)

    try {
      // 백엔드에서 OAuth URL 가져오기
      console.log('📡 백엔드에서 OAuth URL 요청 중...')
      const response = await fetch(
        `${API_BASE_URL}/api/auth/kakao/start?callback=${encodeURIComponent(
          'deskcal://auth/callback',
        )}`,
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Backend returned ${response.status}`)
      }

      const { authUrl } = await response.json()

      if (!authUrl) {
        throw new Error('No authUrl in response')
      }

      // 카카오 로그인 페이지 열기
      console.log('🌐 카카오 로그인 페이지 열기:', authUrl)
      try {
        await open(authUrl)
        console.log('✅ 브라우저 오픈 완료. 로그인 대기 중...')
      } catch (openError) {
        console.error('❌ open() 실패:', openError)
        // fallback: window.open 시도
        console.log('🔄 window.open으로 fallback 시도...')
        window.open(authUrl, '_blank')
      }
    } catch (err) {
      console.error('❌ 로그인 실패:', err)
      console.error('에러 타입:', typeof err)
      console.error('에러 전체:', JSON.stringify(err, Object.getOwnPropertyNames(err as object), 2))
      const errorMessage = err instanceof Error ? err.message : String(err)
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
