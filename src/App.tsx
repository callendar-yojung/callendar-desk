import { useEffect } from 'react'
import { Sidebar } from './components/sidebar'
import { Calendar } from './components/calendar'
import {
  EventDetailModal,
  EventEditModal,
  EventCreateModal,
} from './components/modals'
import { LoginPage } from './components/auth'
import { useWorkspaces } from './hooks'
import { useThemeStore, useAuthStore } from './stores'

function AppContent() {
  useWorkspaces()

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <Calendar />
      </main>

      <EventDetailModal />
      <EventEditModal />
      <EventCreateModal />
    </div>
  )
}

function App() {
  const { theme } = useThemeStore()
  const { isAuthenticated, isLoading } = useAuthStore()

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [theme])

  // Show loading spinner while checking auth (but not during OAuth callback)
  const urlParams = new URLSearchParams(window.location.search)
  const hasOAuthCode = urlParams.has('code')

  if (isLoading && !hasOAuthCode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    )
  }

  // Show login page if not authenticated (handles OAuth callback too)
  if (!isAuthenticated) {
    return <LoginPage />
  }

  return <AppContent />
}

export default App