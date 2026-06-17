export type Role = 'user' | 'admin' | 'root'

export interface User {
  id: number
  username: string
  displayName: string
  avatar: string
  profileMessage: string
  role: Role
  hidden: boolean
  createdAt: number
  lastSeen: number
}

export interface ProfileUpdate {
  displayName: string
  avatar: string
  profileMessage: string
}
