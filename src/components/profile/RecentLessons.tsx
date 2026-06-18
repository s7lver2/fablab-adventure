'use client'

import { StarRating } from '@/components/StarRating'

export interface RecentLesson {
  id: string
  title: string
  completedAt: number
  stars: number
}

function timeAgo(timestamp: number): string {
  const now = Date.now()
  const diffMs = now - timestamp
  const diffS = Math.floor(diffMs / 1000)
  const diffM = Math.floor(diffS / 60)
  const diffH = Math.floor(diffM / 60)
  const diffD = Math.floor(diffH / 24)

  if (diffD > 0) return `hace ${diffD}d`
  if (diffH > 0) return `hace ${diffH}h`
  if (diffM > 0) return `hace ${diffM}m`
  return 'ahora'
}

export function RecentLessons({ lessons }: { lessons: RecentLesson[] }) {
  if (lessons.length === 0) {
    return (
      <div className="pf-card">
        <h2 className="pf-section-title">Lecciones recientes</h2>
        <p className="pf-empty">No hay lecciones completadas aún.</p>
      </div>
    )
  }

  return (
    <div className="pf-card">
      <h2 className="pf-section-title">Lecciones recientes</h2>
      <ul className="pf-lessons">
        {lessons.map((lesson) => (
          <li key={lesson.id} className="pf-lesson">
            <div className="pf-lesson-info">
              <span className="pf-lesson-title">{lesson.title}</span>
              <span className="pf-lesson-time">{timeAgo(lesson.completedAt)}</span>
            </div>
            <StarRating stars={lesson.stars} />
          </li>
        ))}
      </ul>
    </div>
  )
}
