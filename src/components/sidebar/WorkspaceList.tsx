import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useWorkspaceStore, useAuthStore } from '../../stores'
import { workspaceApi } from '../../api'

export function WorkspaceList() {
  const { t } = useTranslation()
  const { user } = useAuthStore()

  const {
    currentMode,
    selectedTeamId,
    workspaces,
    selectedWorkspaceId,
    selectWorkspace,
    addWorkspace,
    isLoading,
  } = useWorkspaceStore()

  const [isAdding, setIsAdding] = useState(false)
  const [name, setName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  /** 워크스페이스 생성 */
  const createWorkspace = async () => {
    if (!name.trim() || isCreating) return

    // TEAM인데 팀 선택 안 됐으면 컷
    if (currentMode === 'TEAM' && !selectedTeamId) {
      alert('팀을 먼저 선택하세요')
      return
    }

    // 로그인 체크
    if (!user) {
      alert('로그인이 필요합니다')
      return
    }

    setIsCreating(true)
    try {
      const response = await workspaceApi.createWorkspace({
        name: name.trim(),
        type: currentMode === 'PERSONAL' ? 'personal' : 'team',
        owner_id:
            currentMode === 'PERSONAL'
                ? user.memberId   // 👈 개인 = memberId (useAuthStore에서 가져옴)
                : selectedTeamId!,           // 👈 팀 = teamId
      })

      if (response.workspace) {
        addWorkspace(response.workspace)
        selectWorkspace(response.workspace.workspace_id)
      }

      setName('')
      setIsAdding(false)
    } catch (e) {
      console.error('Failed to create workspace:', e)
      alert(t('workspace.createError') || '워크스페이스 생성에 실패했습니다')
    } finally {
      setIsCreating(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      createWorkspace()
    } else if (e.key === 'Escape') {
      setIsAdding(false)
      setName('')
    }
  }

  useEffect(() => {
    if (isAdding) {
      inputRef.current?.focus()
    }
  }, [isAdding])

  const getModeTitle = () => {
    if (currentMode === 'PERSONAL') {
      return t('workspace.personal')
    }
    return t('workspace.team')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
      <div className="space-y-3">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-2">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            {getModeTitle()}
          </h3>
          <button
              onClick={() => setIsAdding(true)}
              className="p-1 rounded-lg text-gray-500 hover:text-blue-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title={t('workspace.create')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        {/* 워크스페이스 생성 입력 */}
        {isAdding && (
            <div className="px-2 pb-2 border-b border-gray-200 dark:border-gray-700">
              <div className="flex gap-2">
                <input
                    ref={inputRef}
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={t('workspace.enterName') || '워크스페이스 이름'}
                    disabled={isCreating}
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                />
                <button
                    onClick={createWorkspace}
                    disabled={!name.trim() || isCreating}
                    className="px-3 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isCreating ? '...' : '✓'}
                </button>
                <button
                    onClick={() => {
                      setIsAdding(false)
                      setName('')
                    }}
                    disabled={isCreating}
                    className="px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
        )}

        {/* 워크스페이스 목록 */}
        {workspaces.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
              {t('workspace.empty')}
            </div>
        ) : (
            <div className="flex flex-col gap-1">
              {workspaces.map((ws) => (
                  <button
                      key={ws.workspace_id}
                      onClick={() => selectWorkspace(ws.workspace_id)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                          selectedWorkspaceId === ws.workspace_id
                              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                          className={`w-2 h-2 rounded-full ${
                              ws.type === 'personal' ? 'bg-green-500' : 'bg-purple-500'
                          }`}
                      />
                      <span className="truncate">{ws.name}</span>
                    </div>
                  </button>
              ))}
            </div>
        )}
      </div>
  )
}
