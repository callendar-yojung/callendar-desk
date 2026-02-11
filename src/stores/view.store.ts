import { create } from 'zustand'

export type ViewType = 'calendar' | 'tasks' | 'files'

interface ViewState {
  activeView: ViewType
  setView: (view: ViewType) => void
}

export const useViewStore = create<ViewState>((set) => ({
  activeView: 'calendar',
  setView: (activeView) => set({ activeView }),
}))
