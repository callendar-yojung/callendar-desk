import { ModeSelector } from './ModeSelector'
import { WorkspaceList } from './WorkspaceList'
import { ThemeToggle } from './ThemeToggle'
import { LanguageSelector } from './LanguageSelector'
import { UserProfile } from './UserProfile'

export function Sidebar() {
  return (
    <aside className="w-64 h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Calendar
        </h1>
        <ModeSelector />
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <WorkspaceList />
      </div>

      <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
        <UserProfile />
        <div className="flex items-center justify-between">
          <LanguageSelector />
          <ThemeToggle />
        </div>
      </div>
    </aside>
  )
}