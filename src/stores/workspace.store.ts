import { create } from 'zustand'
import type { Mode, Workspace, Team } from '../types'

interface WorkspaceState {
  currentMode: Mode
  selectedTeamId: number | null
  teams: Team[]
  workspaces: Workspace[]
  selectedWorkspaceId: number | null
  isLoading: boolean
  error: string | null
  isDropdownOpen: boolean

  setMode: (mode: Mode, teamId?: number | null) => void
  setTeams: (teams: Team[]) => void
  setWorkspaces: (workspaces: Workspace[]) => void
  selectWorkspace: (workspaceId: number | null) => void
  addWorkspace: (workspace: Workspace) => void
  updateWorkspaceInStore: (workspaceId: number, name: string) => void
  removeWorkspace: (workspaceId: number) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  toggleDropdown: () => void
  closeDropdown: () => void
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  currentMode: 'PERSONAL',
  selectedTeamId: null,
  teams: [],
  workspaces: [],
  selectedWorkspaceId: null,
  isLoading: false,
  error: null,
  isDropdownOpen: false,

  setMode: (mode, teamId = null) =>
    set({
      currentMode: mode,
      selectedTeamId: mode === 'PERSONAL' ? null : teamId,
      selectedWorkspaceId: null,
      workspaces: [], // 워크스페이스 목록 초기화
      isDropdownOpen: false,
    }),
  setTeams: (teams) => set({ teams }),

  setWorkspaces: (workspaces) =>
      set((state) => {
        // 워크스페이스 목록만 업데이트하고 자동 선택하지 않음
        return { workspaces }
      }),

  selectWorkspace: (workspaceId) => set({ selectedWorkspaceId: workspaceId }),
  addWorkspace: (workspace) =>
    set((state) => ({ workspaces: [...state.workspaces, workspace] })),
  updateWorkspaceInStore: (workspaceId, name) =>
    set((state) => ({
      workspaces: state.workspaces.map((ws) =>
        ws.workspace_id === workspaceId ? { ...ws, name } : ws
      ),
    })),
  removeWorkspace: (workspaceId) =>
    set((state) => ({
      workspaces: state.workspaces.filter((ws) => ws.workspace_id !== workspaceId),
      selectedWorkspaceId:
        state.selectedWorkspaceId === workspaceId ? null : state.selectedWorkspaceId,
    })),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  toggleDropdown: () => set((state) => ({ isDropdownOpen: !state.isDropdownOpen })),
  closeDropdown: () => set({ isDropdownOpen: false }),
}))
