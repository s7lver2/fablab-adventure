export function shouldBlockForMaintenance(args: {
  enabled: boolean
  isAdmin: boolean
  path: string
}): boolean {
  if (!args.enabled || args.isAdmin) return false
  if (args.path.startsWith('/admin') || args.path === '/maintenance') return false
  return true
}
