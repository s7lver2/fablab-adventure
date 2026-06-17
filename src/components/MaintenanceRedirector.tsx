'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { shouldBlockForMaintenance } from '@/lib/settings/maintenance'

export function MaintenanceRedirector() {
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    // Verificar estado de mantenimiento
    ;(async () => {
      try {
        const res = await fetch('/api/maintenance/status')
        const { enabled, isAdmin } = await res.json()
        if (shouldBlockForMaintenance({ enabled, isAdmin, path: pathname })) {
          router.push('/maintenance')
        }
      } catch (e) {
        // Ignorar errores
      }
    })()
  }, [pathname, router])

  return null
}
