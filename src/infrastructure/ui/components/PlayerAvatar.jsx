/**
 * Foto redonda del jugador o, si no tiene, sus iniciales. Es decorativa (el nombre va al lado): las iniciales se
 * pintan con CSS para que no se lean ni cuenten como texto.
 */
export default function PlayerAvatar({ name, photoUrl }) {
  if (photoUrl) {
    return <img src={photoUrl} alt="" width="32" height="32" className="size-8 shrink-0 rounded-full object-cover" />
  }
  return (
    <span
      aria-hidden="true"
      data-initials={name.slice(0, 2).toUpperCase()}
      className="grid size-8 shrink-0 place-items-center rounded-full bg-line type-label text-text-muted before:content-[attr(data-initials)]"
    />
  )
}
