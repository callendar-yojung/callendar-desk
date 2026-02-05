import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal, Input, TextArea, Button } from '../common'
import { useModalStore } from '../../stores'
import { useWorkspaceStore } from '../../stores'
import { teamApi } from '../../api'

export function TeamCreateModal() {
  const { t } = useTranslation()
  const { openedModal, closeModal } = useModalStore()
  const { setTeams, setMode } = useWorkspaceStore()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const isOpen = openedModal === 'TEAM_CREATE'

  const handleClose = () => {
    setName('')
    setDescription('')
    setError('')
    setIsSubmitting(false)
    closeModal()
  }

  const handleSubmit = async () => {
    const trimmedName = name.trim()
    if (!trimmedName) return

    setIsSubmitting(true)
    setError('')

    try {
      const res = await teamApi.createTeam(trimmedName, description.trim() || undefined)
      // 팀 목록 새로고침
      const teamsRes = await teamApi.getMyTeams()
      setTeams(teamsRes.teams || [])
      // 새로 만든 팀으로 전환
      setMode('TEAM', res.teamId)
      handleClose()
    } catch (err) {
      console.error('Failed to create team:', err)
      setError(t('mode.createTeamError'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t('mode.createNewTeam')}>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        {t('mode.createTeamDescription')}
      </p>

      <div className="flex flex-col gap-4">
        <Input
          label={t('mode.teamName')}
          placeholder={t('mode.teamNamePlaceholder')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && name.trim()) handleSubmit()
          }}
          autoFocus
        />

        <TextArea
          label={t('mode.teamDescription')}
          placeholder={t('mode.teamDescriptionPlaceholder')}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />

        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={handleClose}>
            {t('event.cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || isSubmitting}
          >
            {isSubmitting ? t('mode.creating') : t('mode.createTeam')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
