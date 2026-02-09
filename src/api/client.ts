import { fetch } from '@tauri-apps/plugin-http'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://trabien.com'

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: unknown
  headers?: Record<string, string>
}

class ApiClient {
  private baseUrl: string
  private accessToken: string | null = null
  private refreshHandler: (() => Promise<{ accessToken: string; refreshToken?: string }>) | null = null

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  setAccessToken(token: string | null) {
    this.accessToken = token
  }

  getAccessToken() {
    return this.accessToken
  }

  setRefreshHandler(handler: () => Promise<{ accessToken: string; refreshToken?: string }>) {
    this.refreshHandler = handler
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}, isRetry = false): Promise<T> {
    const { method = 'GET', body, headers = {} } = options

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    }

    if (this.accessToken) {
      requestHeaders['Authorization'] = `Bearer ${this.accessToken}`
    }

    const url = `${this.baseUrl}${endpoint}`

    console.log('🚀 API Request:', {
      method,
      url,
      headers: requestHeaders,
      body: body ? JSON.stringify(body, null, 2) : undefined,
    })

    try {
      const response = await fetch(url, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
      })

      console.log('📥 API Response Status:', {
        url,
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
      })

      // 응답 본문 읽기 (에러가 있든 없든)
      const responseText = await response.text()
      console.log('📄 API Response Body:', responseText)

      if (!response.ok) {
        if (
          response.status === 401 &&
          this.refreshHandler &&
          !isRetry &&
          !endpoint.includes('/api/auth/external/refresh')
        ) {
          try {
            const refreshed = await this.refreshHandler()
            if (refreshed?.accessToken) {
              this.setAccessToken(refreshed.accessToken)
              return this.request<T>(endpoint, options, true)
            }
          } catch (refreshError) {
            console.error('❌ Token refresh failed:', refreshError)
          }
        }

        let errorMessage = `API Error: ${response.status} ${response.statusText}`

        try {
          const errorData = JSON.parse(responseText)
          console.error('❌ API Error Data:', errorData)
          errorMessage = errorData.error || errorData.message || errorMessage
        } catch (parseError) {
          console.error('❌ Failed to parse error response:', responseText)
        }

        throw new Error(errorMessage)
      }

      // 성공 응답 파싱
      try {
        const data = JSON.parse(responseText)
        console.log('✅ API Success Data:', data)
        return data
      } catch (parseError) {
        console.error('❌ Failed to parse success response:', responseText)
        throw new Error('Invalid JSON response')
      }
    } catch (error) {
      console.error('❌ API Request Failed:', {
        url,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      })
      throw error
    }
  }

  get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' })
  }

  post<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, { method: 'POST', body })
  }

  patch<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, { method: 'PATCH', body })
  }

  put<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, { method: 'PUT', body })
  }

  delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' })
  }
}

export const apiClient = new ApiClient(API_BASE_URL)

