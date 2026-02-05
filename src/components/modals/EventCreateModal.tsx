import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { format, setHours, setMinutes } from 'date-fns'
import { Modal, Button, Input, TextArea } from '../common'
import { useModalStore, useCalendarStore, useWorkspaceStore, useAuthStore } from '../../stores'
import { taskApi } from '../../api'
import type { TaskStatus } from '../../types'

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]
const pad = (n: number) => String(n).padStart(2, '0')

const KO_DAYS = ['일', '월', '화', '수', '목', '금', '토']
const EN_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function EventCreateModal() {
  const { t, i18n } = useTranslation()
  const { openedModal, createDate, closeModal } = useModalStore()
  const { setEvents, events } = useCalendarStore()
  const { selectedWorkspaceId } = useWorkspaceStore()
  const { user } = useAuthStore()

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [startHour, setStartHour] = useState(9)
  const [startMinute, setStartMinute] = useState(0)
  const [endHour, setEndHour] = useState(10)
  const [endMinute, setEndMinute] = useState(0)
  const [status, setStatus] = useState<TaskStatus>('todo')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const buildDatetime = (date: Date, hour: number, minute: number) =>
    setMinutes(setHours(date, hour), minute)

  const toMysqlDatetime = (date: Date) =>
    format(date, 'yyyy-MM-dd HH:mm:ss')

  useEffect(() => {
    if (createDate && openedModal === 'CREATE') {
      setStartHour(9)
      setStartMinute(0)
      setEndHour(10)
      setEndMinute(0)
      setTitle('')
      setContent('')
      setStatus('todo')
    }
  }, [createDate, openedModal])

  if (openedModal !== 'CREATE' || !createDate || !selectedWorkspaceId) return null

  const startDatetime = buildDatetime(createDate, startHour, startMinute)
  const endDatetime = buildDatetime(createDate, endHour, endMinute)

  const dayNames = i18n.language === 'ko' ? KO_DAYS : EN_DAYS
  const formattedDate =
    i18n.language === 'ko'
      ? `${format(createDate, 'yyyy')}년 ${format(createDate, 'M')}월 ${format(createDate, 'd')}일 (${dayNames[createDate.getDay()]})`
      : `${dayNames[createDate.getDay()]}, ${format(createDate, 'MMMM d, yyyy')}`

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || isSubmitting) return

    setIsSubmitting(true)

    try {
      const backendStatusMap = {
        todo: 'TODO',
        in_progress: 'IN_PROGRESS',
        done: 'DONE',
      } as const

      const backendStatus = backendStatusMap[status]

      const taskData = {
        title: title.trim(),
        content: content.trim() || undefined,
        start_time: toMysqlDatetime(startDatetime),
        end_time: toMysqlDatetime(endDatetime),
        status: backendStatus,
        workspace_id: selectedWorkspaceId,
      }

      console.log(taskData)

      const response = await taskApi.createTask(taskData)

      const newTask = {
        id: response.taskId,
        title: title.trim(),
        content: content.trim() || undefined,
        start_time: startDatetime.toISOString(),
        end_time: endDatetime.toISOString(),
        status,
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

  const timeSelectClass =
    'px-2 py-1.5 border rounded-lg bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm tabular-nums'

  return (
    <Modal isOpen={true} onClose={closeModal} title={t('event.create')}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 선택된 날짜 표시 */}
        <div className="flex items-center gap-2 px-3 py-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800/40">
          <svg className="w-4 h-4 text-blue-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
            {formattedDate}
          </span>
        </div>

        <Input
          label={t('event.title')}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t('event.title')}
          required
          autoFocus
        />

        {/* 시간 선택 */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('event.startTime')} ~ {t('event.endTime')}
          </label>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1">
              <select value={startHour} onChange={(e) => setStartHour(Number(e.target.value))} className={timeSelectClass}>
                {HOURS.map((h) => (
                  <option key={h} value={h}>{pad(h)}</option>
                ))}
              </select>
              <span className="text-gray-500 dark:text-gray-400 font-medium">:</span>
              <select value={startMinute} onChange={(e) => setStartMinute(Number(e.target.value))} className={timeSelectClass}>
                {MINUTES.map((m) => (
                  <option key={m} value={m}>{pad(m)}</option>
                ))}
              </select>
            </div>

            <span className="text-gray-400 dark:text-gray-500 px-1">~</span>

            <div className="flex items-center gap-1">
              <select value={endHour} onChange={(e) => setEndHour(Number(e.target.value))} className={timeSelectClass}>
                {HOURS.map((h) => (
                  <option key={h} value={h}>{pad(h)}</option>
                ))}
              </select>
              <span className="text-gray-500 dark:text-gray-400 font-medium">:</span>
              <select value={endMinute} onChange={(e) => setEndMinute(Number(e.target.value))} className={timeSelectClass}>
                {MINUTES.map((m) => (
                  <option key={m} value={m}>{pad(m)}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

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
