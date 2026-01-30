import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CalendarHeader } from './CalendarHeader'
import { CalendarGrid } from './CalendarGrid'
import { TaskDrawer } from './TaskDrawer'
import { useWorkspaceStore, useCalendarStore } from '../../stores'
import { taskApi } from '../../api'

export function Calendar() {
  const { t } = useTranslation()
  const { selectedWorkspaceId } = useWorkspaceStore()
  const { setEvents, setLoading, setError, clearEvents } = useCalendarStore()
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  const toggleDrawer = useCallback(() => setIsDrawerOpen((prev) => !prev), [])
  const closeDrawer = useCallback(() => setIsDrawerOpen(false), [])

  useEffect(() => {
    const fetchEvents = async () => {
      if (!selectedWorkspaceId) {
        clearEvents()
        return
      }

      setLoading(true)
      setError(null)

      try {
        const response = await taskApi.getTasks(selectedWorkspaceId)
        setEvents(response.tasks)
      } catch (err) {
        setError(err instanceof Error ? err.message : t('common.error'))
        clearEvents()
      } finally {
        setLoading(false)
      }
    }

    fetchEvents()
  }, [selectedWorkspaceId, setEvents, setLoading, setError, clearEvents, t])

  if (!selectedWorkspaceId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <p className="text-gray-500 dark:text-gray-400">
          {t('workspace.select')}
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-gray-900 p-4">
      <CalendarHeader onToggleDrawer={toggleDrawer} />
      <CalendarGrid />
      <TaskDrawer isOpen={isDrawerOpen} onClose={closeDrawer} />
    </div>
  )
}