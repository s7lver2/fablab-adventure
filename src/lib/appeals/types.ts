export type AppealStatus = 'pending' | 'accepted' | 'rejected'

export interface NewAppeal {
  userId: number
  challengeId: number
  language: string
  submittedCode: string
  submittedOutput: string
  message: string
}

export interface Appeal {
  id: number
  userId: number
  challengeId: number
  language: string
  submittedCode: string
  submittedOutput: string
  message: string
  status: AppealStatus
  reviewerAdminId: number | null
  feedback: string
  createdAt: number
  resolvedAt: number | null
}
