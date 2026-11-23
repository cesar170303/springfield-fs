import { useRef, useState } from 'react'

/**
 * Estado de una lista que se edita en el sitio: qué formulario está abierto, qué se anuncia tras cada acción y adónde
 * vuelve el foco cuando desaparece el control que lo tenía (el botón de crear, con `newButton` como ref).
 */
export function useEditor(reload) {
  const [editing, setEditing] = useState(null) // null = sin formulario; 'new' o el id de lo que se edita
  const [result, setResult] = useState({ ok: '', error: '' })
  const newButton = useRef(null)
  const turn = useRef(0) // cambia al abrir o cerrar un formulario: así una respuesta lenta sabe si ya no es el suyo
  const running = useRef(false)

  function show(which) {
    turn.current += 1
    setEditing(which)
  }

  function close() {
    show(null)
    newButton.current?.focus()
  }

  return {
    editing,
    result,
    newButton,
    close,

    open(which) {
      setResult({ ok: '', error: '' })
      show(which)
    },

    /**
     * Guarda desde un formulario y lo cierra. Si falla, el error lo enseña el formulario, que sigue abierto. Si entretanto
     * se ha abierto otro, ese no se toca y el resultado se anuncia en la lista.
     */
    async save(action, ok) {
      const mine = turn.current
      try {
        await action()
      } catch (error) {
        if (turn.current === mine) throw error
        setResult({ ok: '', error: error.message })
        return
      }
      setResult({ ok, error: '' })
      if (turn.current === mine) close()
      reload()
    },

    /**
     * Acción de un botón de la lista, que desaparece si sale bien. Un segundo toque mientras trabaja no hace nada. Recarga
     * también si falla, por si cambió algo.
     */
    async run(action, ok) {
      if (running.current) return
      running.current = true
      const mine = turn.current
      try {
        await action()
        setResult({ ok, error: '' })
        if (turn.current === mine) newButton.current?.focus()
      } catch (error) {
        setResult({ ok: '', error: error.message })
      }
      running.current = false
      reload()
    },
  }
}
