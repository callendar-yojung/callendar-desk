// Workspace types
export type WorkspaceType = 'personal' | 'team'

export interface Workspace {
  workspace_id: number
  type: WorkspaceType
  owner_id: number  // personal일 경우 member_id, team일 경우 team_id
  created_at: string
  name: string
  created_by: number
  memberCount?: number
}

// Team types
export interface Team {
  id: number  // 백엔드에서 id로 반환
  name: string
  created_at: string
  created_by: number
  description?: string
}

export interface TeamMember {
  member_id: number
  team_id: number
  role: 'owner' | 'admin' | 'member'
  joined_at: string
}

// Task types
export type TaskStatus = 'todo' | 'in_progress' | 'done'
export type BackendTaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE'

export type OwnerType = 'team' | 'personal'

export interface Tag {
  tag_id: number
  name: string
  color: string
}

export interface Task {
  id: number
  title: string
  start_time: string
  end_time: string
  content?: string
  color?: string
  tag_ids?: number[]
  status?: TaskStatus
  created_at: string
  updated_at: string
  created_by: number
  updated_by: number
  workspace_id: number
}

export interface CreateTaskPayload {
  title: string
  start_time: string
  end_time: string
  content?: string
  color: string
  tag_ids: number[]
  status?: TaskStatus | BackendTaskStatus
  workspace_id: number
}

export interface UpdateTaskPayload {
  task_id: number
  title?: string
  start_time?: string
  end_time?: string
  content?: string
  color?: string
  tag_ids?: number[]
  status?: TaskStatus | BackendTaskStatus
}

export interface CreateTagPayload {
  name: string
  color: string
  owner_type: OwnerType
  owner_id: number
}

// Member types
export interface Member {
  memberId: number
  nickname: string
  email?: string
  provider: string
}

// API Response types
export interface WorkspacesResponse {
  workspaces: Workspace[]
}

export interface WorkspaceResponse {
  workspace: Workspace
}

export interface TeamsResponse {
  teams: Team[]
}

export interface TeamResponse {
  team: Team
}

export interface TasksResponse {
  tasks: Task[]
}

export interface TagsResponse {
  tags: Tag[]
}

export interface CreateTaskResponse {
  success: boolean
  taskId: number
}

export interface UpdateTaskResponse {
  success: boolean
}

export interface DeleteTaskResponse {
  success: boolean
}

export interface CreateTagResponse {
  success: boolean
  tagId?: number
  tag?: Tag
}

export interface CalendarResponse {
  taskCounts: Record<string, number>
}

// Auth types
export interface AuthResponse {
  success: boolean
  user: Member
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export interface RefreshTokenResponse {
  success: boolean
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export interface MeResponse {
  user: Member
}

// Mode type
export type Mode = 'PERSONAL' | 'TEAM'

// Modal type
export type ModalType = 'DETAIL' | 'EDIT' | 'CREATE' | 'TEAM_CREATE' | 'SETTINGS' | null
