import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ModeSelector } from './ModeSelector'
import { WorkspaceList } from './WorkspaceList'
import { TaskMenu } from './TaskMenu'
import { FileMenu } from './FileMenu'
import { useAuthStore, useModalStore, useViewStore } from '../../stores'

function SidebarFooter() {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const { openSettingsModal } = useModalStore()

  if (!user) return null

  return (
    <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-medium shrink-0">
          {user.nickname?.charAt(0) || 'U'}
        </div>
        <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
          {user.nickname}
        </span>
      </div>
      <button
        onClick={openSettingsModal}
        className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors shrink-0"
        title={t('settings.title')}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>
    </div>
  )
}

function SidebarNav() {
  const { t } = useTranslation()
  const { activeView, setView } = useViewStore()

  return (
    <div className="space-y-1">
      <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-2 mb-1">
        {t('sidebar.menu')}
      </h3>
      {/* Calendar */}
      <button
        onClick={() => setView('calendar')}
        className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm transition-colors ${
          activeView === 'calendar'
            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
        }`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        {t('sidebar.calendar')}
      </button>
      <TaskMenu />
      <FileMenu />
    </div>
  )
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true'
  })

  const toggleCollapsed = () => {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem('sidebar_collapsed', String(next))
  }

  return (
    <div className="relative flex-shrink-0 flex">
      <aside
        className={`h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden transition-all duration-300 ease-in-out ${
          collapsed ? 'w-0 border-r-0' : 'w-64'
        }`}
      >
        <div className="w-64 min-w-[256px] flex flex-col h-full">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Calendar
            </h1>
            <ModeSelector />
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <WorkspaceList />
            <SidebarNav />
          </div>

          <SidebarFooter />
        </div>
      </aside>

      {/* 접기/펼기 토글 버튼 */}
      <button
        onClick={toggleCollapsed}
        className="absolute -right-3.5 top-1/2 -translate-y-1/2 z-20 w-7 h-7 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
        title={collapsed ? '사이드바 열기' : '사이드바 접기'}
      >
        <svg
          className={`w-3.5 h-3.5 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
    </div>
  )
}