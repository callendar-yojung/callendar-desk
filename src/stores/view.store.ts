import { create } from 'zustand'

export type ViewType = 'calendar' | 'tasks' | 'files' | 'memo' | 'task_create'

interface ViewState {
  activeView: ViewType
  createTaskDate: Date | null
  setView: (view: ViewType) => void
  openTaskCreate: (date: Date) => void
  closeTaskCreate: () => void
}

export const useViewStore = create<ViewState>((set) => ({
  activeView: 'calendar',
  createTaskDate: null,
  setView: (activeView) => set({ activeView }),
  openTaskCreate: (date) => set({ activeView: 'task_create', createTaskDate: date }),
  closeTaskCreate: () => set({ activeView: 'calendar', createTaskDate: null }),
}))
