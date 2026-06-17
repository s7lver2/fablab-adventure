export function StarRating({ stars, max = 3 }: { stars: number; max?: number }) {
  return (
    <span className="stars" aria-label={`${stars} de ${max} estrellas`}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={i < stars ? 'star' : 'star star--off'}>
          ⭐
        </span>
      ))}
    </span>
  )
}
