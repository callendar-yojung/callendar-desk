import { apiClient } from './client'
import type {
  TasksResponse,
  CreateTaskPayload,
  CreateTaskResponse,
  UpdateTaskPayload,
  UpdateTaskResponse,
  DeleteTaskResponse,
} from '../types'

export const taskApi = {
  getTasks: (workspaceId: number) =>
    apiClient.get<TasksResponse>(`/api/tasks?workspace_id=${workspaceId}`),

  createTask: (payload: CreateTaskPayload) =>
    apiClient.post<CreateTaskResponse>('/api/tasks', payload),

  updateTask: (payload: UpdateTaskPayload) =>
    apiClient.patch<UpdateTaskResponse>('/api/tasks', payload),

  deleteTask: (taskId: number) =>
    apiClient.delete<DeleteTaskResponse>(`/api/tasks?task_id=${taskId}`),
}
