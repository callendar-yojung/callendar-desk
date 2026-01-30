import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { format, parseISO } from 'date-fns'
import { Modal, Button } from '../common'
import { useModalStore, useCalendarStore } from '../../stores'
import { taskApi } from '../../api'

export function EventDetailModal() {
  const { t } = useTranslation()
  const { openedModal, selectedEvent, closeModal, openEditModal } = useModalStore()
  const { setEvents, events } = useCalendarStore()

  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  if (openedModal !== 'DETAIL' || !selectedEvent) return null

  const handleEdit = () => {
    openEditModal(selectedEvent)
  }

  const handleDelete = async () => {
    setIsDeleting(true)

    try {
      await taskApi.deleteTask(selectedEvent.id)
      setEvents(events.filter((e) => e.id !== selectedEvent.id))
      setShowDeleteConfirm(false)
      closeModal()
    } catch (err: any) {
      console.error('Failed to delete event:', err)
      alert(t('event.deleteFailed'))
    } finally {
      setIsDeleting(false)
    }
  }

  const formatDateTime = (dateStr: string) => {
    const date = parseISO(dateStr)
    return format(date, 'yyyy-MM-dd HH:mm')
  }

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'todo':
        return t('status.todo')
      case 'in_progress':
        return t('status.inProgress')
      case 'done':
        return t('status.done')
      default:
        return '-'
    }
  }

  return (
    <Modal isOpen={true} onClose={closeModal} title={t('event.detail')}>
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {selectedEvent.title}
          </h3>
        </div>

        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-gray-400 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="text-sm">
              <p className="text-gray-600 dark:text-gray-400">
                {t('event.startTime')}: {formatDateTime(selectedEvent.start_time)}
              </p>
              <p className="text-gray-600 dark:text-gray-400">
                {t('event.endTime')}: {formatDateTime(selectedEvent.end_time)}
              </p>
            </div>
          </div>

          {selectedEvent.status && (
            <div className="flex items-center gap-3">
              <svg
                className="w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {t('event.status')}: {getStatusLabel(selectedEvent.status)}
              </span>
            </div>
          )}

          {selectedEvent.content && (
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-gray-400 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h7"
                />
              </svg>
              <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                {selectedEvent.content}
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button variant="primary" onClick={handleEdit} className="flex-1">
            {t('event.edit')}
          </Button>
          <Button variant="danger" onClick={() => setShowDeleteConfirm(true)}>
            {t('event.delete')}
          </Button>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => !isDeleting && setShowDeleteConfirm(false)}
          />
          <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {t('event.deleteConfirm')}
            </p>
            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="secondary"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
              >
                {t('event.cancel')}
              </Button>
              <Button
                variant="danger"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? t('event.deleting') : t('event.delete')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}
