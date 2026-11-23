import { useRef, useState } from 'react'

/**
 * Estado de una lista que se edita en el sitio: qué formulario está abierto, qué se anuncia tras cada acción y adónde
 * vuelve el foco cuando desaparece el control que lo tenía (el botón de crear, con `newButton` como ref).
 */
export function useEditor(reload) {
  const [editing, setEditing] = useState(null) // null = sin formulario; 'new' o el id de lo que se edita
  const [result, setResult] = useState({ ok: '', error: '' })
  const newButton = useRef(null)

  function close() {
    setEditing(null)
    newButton.current?.focus()
  }

  return {
    editing,
    result,
    newButton,
    close,

    open(which) {
      setResult({ ok: '', error: '' })
      setEditing(which)
    },

    /** Guarda desde un formulario y lo cierra. Si falla, el error lo enseña el formulario, que sigue abierto. */
    async save(action, ok) {
      await action()
      setResult({ ok, error: '' })
      close()
      reload()
    },

    /** Acción de un botón de la lista, que desaparece si sale bien. Recarga también si falla, por si cambió algo. */
    async run(action, ok) {
      try {
        await action()
        setResult({ ok, error: '' })
        newButton.current?.focus()
      } catch (error) {
        setResult({ ok: '', error: error.message })
      }
      reload()
    },
  }
}
