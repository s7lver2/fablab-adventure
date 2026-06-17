export function ProfileCard({
  avatar,
  displayName,
  profileMessage,
  action,
}: {
  avatar: string
  displayName: string
  profileMessage: string
  action?: React.ReactNode
}) {
  return (
    <div className="card profile-card">
      {action}
      <div className="profile-card__avatar">{avatar || '🦊'}</div>
      <div className="profile-card__name">{displayName}</div>
      {profileMessage && <p className="profile-card__msg">{profileMessage}</p>}
    </div>
  )
}
