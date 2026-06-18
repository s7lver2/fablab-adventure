export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE'
export type AuthLevel = 'none' | 'user' | 'admin'

export interface ApiEndpointParam {
  name: string
  example: string
}

export interface ApiEndpointBody {
  name: string
  example: string
}

export interface ApiEndpoint {
  group: string
  method: HttpMethod
  path: string
  description: string
  auth: AuthLevel
  destructive?: boolean
  pathParams?: ApiEndpointParam[]
  body?: ApiEndpointBody[]
}

export const API_ENDPOINTS: ApiEndpoint[] = [
  // Auth endpoints
  {
    group: 'Auth',
    method: 'POST',
    path: '/api/auth/login',
    description: 'Login or register with username (no password required)',
    auth: 'none',
    body: [{ name: 'username', example: 'alice' }],
  },

  // User profile endpoints
  {
    group: 'Me',
    method: 'GET',
    path: '/api/me',
    description: 'Get current user profile',
    auth: 'user',
  },
  {
    group: 'Me',
    method: 'PATCH',
    path: '/api/me',
    description: 'Update current user profile (displayName, avatar, profileMessage, banner, etc)',
    auth: 'user',
    body: [{ name: 'displayName', example: 'Alice' }],
  },
  {
    group: 'Me',
    method: 'POST',
    path: '/api/me/language',
    description: 'Set the user\'s chosen programming language',
    auth: 'user',
    body: [{ name: 'language', example: 'js' }],
  },
  {
    group: 'Me',
    method: 'DELETE',
    path: '/api/me/language',
    description: 'Delete chosen language (resets progress)',
    auth: 'user',
    destructive: true,
  },

  // Challenge endpoints
  {
    group: 'Challenges',
    method: 'GET',
    path: '/api/challenges/[slug]',
    description: 'Get challenge data including variants and inputs',
    auth: 'user',
    pathParams: [{ name: 'slug', example: 'saludo' }],
  },
  {
    group: 'Challenges',
    method: 'POST',
    path: '/api/challenges/[slug]/submit',
    description: 'Submit code outputs for grading',
    auth: 'user',
    pathParams: [{ name: 'slug', example: 'saludo' }],
    body: [
      { name: 'outputs', example: '["Hola"]' },
      { name: 'hintsUsed', example: '0' },
    ],
  },

  // Public profile endpoint
  {
    group: 'Profile',
    method: 'GET',
    path: '/api/u/[username]',
    description: 'Get public profile for a user',
    auth: 'none',
    pathParams: [{ name: 'username', example: 'alice' }],
  },

  // Admin: Manage users
  {
    group: 'Admin / Users',
    method: 'GET',
    path: '/api/admin/users',
    description: 'List all users with roles and stats',
    auth: 'admin',
  },
  {
    group: 'Admin / Users',
    method: 'PATCH',
    path: '/api/admin/users/[userId]/role',
    description: 'Change a user\'s role (user, admin, root)',
    auth: 'admin',
    destructive: true,
    pathParams: [{ name: 'userId', example: '2' }],
    body: [{ name: 'role', example: 'admin' }],
  },

  // Admin: Manage appeals
  {
    group: 'Admin / Appeals',
    method: 'GET',
    path: '/api/admin/appeals',
    description: 'List pending solution reviews/appeals',
    auth: 'admin',
  },
  {
    group: 'Admin / Appeals',
    method: 'PATCH',
    path: '/api/admin/appeals/[id]/resolve',
    description: 'Approve or reject an appeal',
    auth: 'admin',
    destructive: true,
    pathParams: [{ name: 'id', example: '1' }],
    body: [
      { name: 'approved', example: 'true' },
      { name: 'feedback', example: 'Looks good!' },
    ],
  },

  // Admin: Analytics
  {
    group: 'Admin / Analytics',
    method: 'GET',
    path: '/api/admin/analytics',
    description: 'Get high-level platform analytics (users, submissions, etc)',
    auth: 'admin',
  },
  {
    group: 'Admin / Analytics',
    method: 'GET',
    path: '/api/admin/analytics/daily',
    description: 'Get daily analytics summary',
    auth: 'admin',
  },

  // Admin: Sessions
  {
    group: 'Admin / Sessions',
    method: 'GET',
    path: '/api/admin/sessions',
    description: 'List active user sessions',
    auth: 'admin',
  },

  // Admin: Geolocation
  {
    group: 'Admin / Geography',
    method: 'GET',
    path: '/api/admin/geo',
    description: 'Get geographic distribution of users',
    auth: 'admin',
  },

  // Admin: Live events
  {
    group: 'Admin / Live',
    method: 'GET',
    path: '/api/admin/live',
    description: 'Get real-time event stream (recent submissions, logins, etc)',
    auth: 'admin',
  },

  // Admin: Settings
  {
    group: 'Admin / Settings',
    method: 'GET',
    path: '/api/admin/settings',
    description: 'Get platform settings (maintenance mode, feature flags, etc)',
    auth: 'admin',
  },
  {
    group: 'Admin / Settings',
    method: 'PATCH',
    path: '/api/admin/settings',
    description: 'Update platform settings',
    auth: 'admin',
    destructive: true,
    body: [
      { name: 'maintenanceEnabled', example: 'false' },
      { name: 'maintenanceMessage', example: 'System maintenance in progress' },
    ],
  },

  // Admin: Audit log
  {
    group: 'Admin / Audit',
    method: 'GET',
    path: '/api/admin/audit',
    description: 'Get audit log of admin actions and system events',
    auth: 'admin',
  },

  // Maintenance status
  {
    group: 'Status',
    method: 'GET',
    path: '/api/maintenance/status',
    description: 'Check if platform is in maintenance mode',
    auth: 'none',
  },
]
