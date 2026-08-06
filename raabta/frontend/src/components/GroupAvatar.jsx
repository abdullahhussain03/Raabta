// Reusable group display-picture avatar. Shows the Cloudinary image when the
// group has one, otherwise a branded initial circle. `size` is in px.
export default function GroupAvatar({ group, size = 40 }) {
  const style = { width: size, height: size };
  if (group?.profilePicture) {
    return (
      <img
        src={group.profilePicture}
        alt=""
        style={style}
        className="rounded-full object-cover border border-base-border bg-base-raised shrink-0"
      />
    );
  }
  return (
    <div
      style={{ ...style, fontSize: Math.max(12, Math.round(size * 0.38)) }}
      className="rounded-full bg-brand-500/20 border border-brand-500/40 flex items-center justify-center font-semibold text-brand-200 shrink-0"
    >
      {group?.name?.[0]?.toUpperCase() || '?'}
    </div>
  );
}
