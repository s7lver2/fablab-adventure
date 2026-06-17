import Link from 'next/link'
import { StarRating } from './StarRating'

export function ChallengeRow({
  title,
  href,
  state,
  stars,
}: {
  title: string
  href: string
  state: 'done' | 'current' | 'future'
  stars: number
}) {
  return (
    <li>
      <Link href={href} className={`challenge challenge--${state}`}>
        <span className="challenge__title">
          {state === 'done' && <span aria-label="completado">✅</span>}
          {title}
        </span>
        {state === 'done' ? (
          <StarRating stars={stars} />
        ) : (
          <span className="challenge__cta">
            {state === 'current' ? '¡seguir! →' : 'jugar →'}
          </span>
        )}
      </Link>
    </li>
  )
}
