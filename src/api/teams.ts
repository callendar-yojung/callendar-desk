import { apiClient } from './client'
import type { TeamsResponse, TeamResponse } from '../types'

export const teamApi = {
  getMyTeams: () => apiClient.get<TeamsResponse>('/api/me/teams'),

  createTeam: (name: string, description?: string) =>
    apiClient.post<{ success: boolean; teamId: number; message: string }>(
      '/api/me/teams',
      { name, description }
    ),

  getTeam: (id: number) => apiClient.get<TeamResponse>(`/api/teams/${id}`),

  updateTeam: (id: number, name: string, description?: string) =>
    apiClient.patch<{ success: boolean; message: string }>(`/api/teams/${id}`, {
      name,
      description,
    }),

  deleteTeam: (id: number) =>
    apiClient.delete<{ success: boolean; message: string }>(`/api/teams/${id}`),
}