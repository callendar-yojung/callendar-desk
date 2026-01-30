import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { format, setHours, setMinutes } from 'date-fns'
import { Modal, Button, Input, TextArea } from '../common'
import { useModalStore, useCalendarStore, useWorkspaceStore, useAuthStore } from '../../stores'
import { taskApi } from '../../api'
import type { TaskStatus } from '../../types'

export function EventCreateModal() {
  const { t } = useTranslation()
  const { openedModal, createDate, closeModal } = useModalStore()
  const { setEvents, events } = useCalendarStore()
  const { selectedWorkspaceId } = useWorkspaceStore()
  const { user } = useAuthStore()

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [status, setStatus] = useState<TaskStatus>('todo')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const toMysqlDatetime = (value: string) =>
      format(new Date(value), 'yyyy-MM-dd HH:mm:ss')

  useEffect(() => {
    if (createDate && openedModal === 'CREATE') {
      const defaultStart = setMinutes(setHours(createDate, 9), 0)
      const defaultEnd = setMinutes(setHours(createDate, 10), 0)
      setStartTime(format(defaultStart, "yyyy-MM-dd'T'HH:mm"))
      setEndTime(format(defaultEnd, "yyyy-MM-dd'T'HH:mm"))

      setTitle('')
      setContent('')
      setStatus('todo')
    }
  }, [createDate, openedModal])

  if (openedModal !== 'CREATE' || !createDate || !selectedWorkspaceId) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || isSubmitting) return

    setIsSubmitting(true)

    try {
      // 백엔드가 대문자 상태값을 받으므로 변환
      const backendStatusMap = {
        todo: 'TODO',
        in_progress: 'IN_PROGRESS',
        done: 'DONE',
      } as const

      const backendStatus = backendStatusMap[status];

      const taskData = {
        title: title.trim(),
        content: content.trim() || undefined,
        start_time: toMysqlDatetime(startTime),
        end_time: toMysqlDatetime(endTime),
        status: backendStatus,
        workspace_id: selectedWorkspaceId,
      }

      console.log(taskData)

      const response = await taskApi.createTask(taskData)


      const newTask = {
        id: response.taskId,
        title: title.trim(),
        content: content.trim() || undefined,
        start_time: new Date(startTime).toISOString(),
        end_time: new Date(endTime).toISOString(),
        status, // 프론트엔드는 소문자로 유지
        workspace_id: selectedWorkspaceId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: user.memberId,
        updated_by: user.memberId,
      }

      setEvents([...events, newTask])
      closeModal()
    } catch (err: any) {

      const errorMessage = err?.message || err?.toString() || '알 수 없는 오류'
      alert(`${t('event.createError')}\n\n상세 오류: ${errorMessage}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={true} onClose={closeModal} title={t('event.create')}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label={t('event.title')}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t('event.title')}
          required
          autoFocus
        />

        <Input
          type="datetime-local"
          label={t('event.startTime')}
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          required
        />

        <Input
          type="datetime-local"
          label={t('event.endTime')}
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
          required
        />

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('event.status')}
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as TaskStatus)}
            className="px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="todo">{t('status.todo')}</option>
            <option value="in_progress">{t('status.inProgress')}</option>
            <option value="done">{t('status.done')}</option>
          </select>
        </div>

        <TextArea
          label={t('event.content')}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
        />

        <div className="flex gap-2 pt-4">
          <Button
            type="submit"
            variant="primary"
            className="flex-1"
            disabled={isSubmitting}
          >
            {t('event.save')}
          </Button>
          <Button type="button" variant="secondary" onClick={closeModal}>
            {t('event.cancel')}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
