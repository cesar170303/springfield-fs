import { useEffect, useState } from 'react'

/**
 * Carga datos al montar, al cambiar `key` y al llamar a `reload` (que no quita los que hay mientras llegan los nuevos).
 * `data` es null mientras carga por primera vez. `key` identifica lo que se pide (p. ej. el id de la temporada): los
 * datos de otra clave no valen, y una respuesta que llega tarde se descarta.
 */
export function useAsync(load, key = null) {
  const [state, setState] = useState({ key, data: null, error: null })
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let stale = false
    load().then(
      (data) => !stale && setState({ key, data, error: null }),
      (error) => !stale && setState((prev) => ({ key, data: prev.key === key ? prev.data : null, error })),
    )
    return () => {
      stale = true
    }
  }, [key, version]) // eslint-disable-line react-hooks/exhaustive-deps -- `load` puede ser una función nueva en cada render

  const current = state.key === key ? state : { data: null, error: null }
  return { data: current.data, error: current.error, reload: () => setVersion((v) => v + 1) }
}
