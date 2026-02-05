import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { invoke } from '@tauri-apps/api/core'
import { useModalStore, useAuthStore, useThemeStore } from '../../stores'
import { authApi } from '../../api'

type SettingsTab = 'profile' | 'system'

export function SettingsModal() {
  const { t } = useTranslation()
  const { openedModal, closeModal } = useModalStore()
  const [tab, setTab] = useState<SettingsTab>('profile')

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal()
    }
    if (openedModal === 'SETTINGS') {
      document.addEventListener('keydown', handleEscape)
    }
    return () => document.removeEventListener('keydown', handleEscape)
  }, [openedModal, closeModal])

  if (openedModal !== 'SETTINGS') return null

  const tabs: { key: SettingsTab; label: string; icon: React.ReactNode }[] = [
    {
      key: 'profile',
      label: t('settings.profile'),
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
    {
      key: 'system',
      label: t('settings.system'),
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={closeModal} />
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg mx-4 flex overflow-hidden" style={{ height: '380px' }}>
        {/* 왼쪽 사이드바 */}
        <div className="w-44 shrink-0 bg-gray-50 dark:bg-gray-900/60 border-r border-gray-200 dark:border-gray-700 flex flex-col">
          <div className="px-4 py-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              {t('settings.title')}
            </h2>
          </div>
          <nav className="flex-1 px-2 space-y-0.5">
            {tabs.map((item) => (
              <button
                key={item.key}
                onClick={() => setTab(item.key)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg transition-colors ${
                  tab === item.key
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        {/* 오른쪽 컨텐츠 */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {tabs.find((t) => t.key === tab)?.label}
            </h3>
            <button
              onClick={closeModal}
              className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-5">
            {tab === 'profile' ? <ProfileTab /> : <SystemTab />}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── 프로필 탭 ──────────────────────────────────────────────────

function ProfileTab() {
  const { t } = useTranslation()
  const { user, updateUser, logout } = useAuthStore()
  const { closeModal } = useModalStore()

  const [nickname, setNickname] = useState(user?.nickname || '')
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [isEditing])

  if (!user) return null

  const handleSaveNickname = async () => {
    const trimmed = nickname.trim()
    if (!trimmed || trimmed === user.nickname) {
      setIsEditing(false)
      setNickname(user.nickname)
      return
    }
    setIsSaving(true)
    try {
      await authApi.updateAccount({ nickname: trimmed })
      updateUser({ nickname: trimmed })
      setIsEditing(false)
    } catch (err) {
      console.error('Failed to update nickname:', err)
      setNickname(user.nickname)
    } finally {
      setIsSaving(false)
    }
  }

  const handleNicknameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSaveNickname()
    if (e.key === 'Escape') {
      setIsEditing(false)
      setNickname(user.nickname)
    }
  }

  const handleLogout = () => {
    closeModal()
    logout()
  }

  return (
    <div className="space-y-5">
      {/* 아바타 + 닉네임 */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-blue-500 flex items-center justify-center text-white text-xl font-bold shrink-0">
          {(isEditing ? nickname : user.nickname)?.charAt(0) || 'U'}
        </div>
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                onKeyDown={handleNicknameKeyDown}
                onBlur={handleSaveNickname}
                disabled={isSaving}
                className="flex-1 px-2 py-1 text-sm border border-blue-400 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
              />
            </div>
          ) : (
            <div className="flex items-center gap-1.5 group">
              <p className="text-base font-semibold text-gray-900 dark:text-white truncate">
                {user.nickname}
              </p>
              <button
                onClick={() => setIsEditing(true)}
                className="p-0.5 text-gray-300 dark:text-gray-600 hover:text-blue-500 dark:hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-all"
                title={t('settings.editNickname')}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            </div>
          )}
          {user.email && (
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">
              {user.email}
            </p>
          )}
        </div>
      </div>

      {/* 계정 정보 */}
      <div className="space-y-2 pt-2">
        <InfoRow label={t('settings.provider')} value={user.provider} />
        <InfoRow label={t('settings.memberId')} value={`#${user.memberId}`} />
      </div>

      {/* 로그아웃 */}
      <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          {t('auth.logout')}
        </button>
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-xs text-gray-400 dark:text-gray-500">{label}</span>
      <span className="text-xs text-gray-600 dark:text-gray-300">{value}</span>
    </div>
  )
}

// ── 시스템 설정 탭 ──────────────────────────────────────────────

function SystemTab() {
  const { t, i18n } = useTranslation()
  const { theme, toggleTheme } = useThemeStore()
  const [autostart, setAutostart] = useState(false)

  useEffect(() => {
    invoke<boolean>('get_autostart')
      .then(setAutostart)
      .catch(console.error)
  }, [])

  const toggleAutostart = async () => {
    try {
      const result = await invoke<boolean>('set_autostart', { enabled: !autostart })
      setAutostart(result)
    } catch (err) {
      console.error('Failed to toggle autostart:', err)
    }
  }

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'ko' ? 'en' : 'ko')
  }

  return (
    <div className="space-y-1">
      <SettingRow
        icon={
          theme === 'light' ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )
        }
        label={t('settings.theme')}
        action={
          <button
            onClick={toggleTheme}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            {theme === 'light' ? t('theme.dark') : t('theme.light')}
          </button>
        }
      />

      <SettingRow
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
          </svg>
        }
        label={t('settings.language')}
        action={
          <button
            onClick={toggleLanguage}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            {i18n.language === 'ko' ? 'English' : '한국어'}
          </button>
        }
      />

      <SettingRow
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        }
        label={t('autostart.label')}
        action={
          <button
            onClick={toggleAutostart}
            className={`relative w-10 h-5 rounded-full transition-colors ${
              autostart ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
            }`}
          >
            <div
              className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                autostart ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
        }
      />
    </div>
  )
}

function SettingRow({
  icon,
  label,
  action,
}: {
  icon: React.ReactNode
  label: string
  action: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between px-3 py-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
      <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
        <span className="text-gray-400 dark:text-gray-500">{icon}</span>
        <span className="text-sm">{label}</span>
      </div>
      {action}
    </div>
  )
}
