import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Login from './Login'
import { UseCasesContext } from '../use-cases-context'

// Casos de uso falsos: Login solo conoce lo que estos devuelven, no Supabase.
function renderLogin(overrides = {}) {
  const useCases = {
    signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
    signUp: vi.fn().mockResolvedValue({ status: 'signed-in', message: null }),
    signInWithGoogle: vi.fn().mockResolvedValue({ error: null }),
    ...overrides,
  }
  render(
    <UseCasesContext.Provider value={useCases}>
      <Login />
    </UseCasesContext.Provider>,
  )
  return useCases
}

async function fillForm(email = 'jugador@example.com', password = 'secreto123') {
  await userEvent.type(screen.getByPlaceholderText('Correo'), email)
  await userEvent.type(screen.getByPlaceholderText('Contraseña'), password)
}

describe('Login', () => {
  it('inicia sesión con el correo y la contraseña escritos', async () => {
    const useCases = renderLogin()

    await fillForm('jugador@example.com', 'secreto123')
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(useCases.signInWithPassword).toHaveBeenCalledWith({ email: 'jugador@example.com', password: 'secreto123' })
    expect(useCases.signUp).not.toHaveBeenCalled()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('muestra el error al iniciar sesión', async () => {
    renderLogin({ signInWithPassword: vi.fn().mockResolvedValue({ error: 'Invalid login credentials' }) })

    await fillForm()
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid login credentials')
  })

  it('deshabilita el botón mientras se envía el formulario', async () => {
    renderLogin({ signInWithPassword: vi.fn().mockReturnValue(new Promise(() => {})) }) // nunca termina

    await fillForm()
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(screen.getByRole('button', { name: 'Entrar' })).toBeDisabled()
  })

  it('al cambiar a "Regístrate" crea la cuenta en vez de iniciar sesión', async () => {
    const useCases = renderLogin()

    await userEvent.click(screen.getByRole('button', { name: '¿No tienes cuenta? Regístrate' }))
    await fillForm('nuevo@example.com', 'secreto123')
    await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    expect(useCases.signUp).toHaveBeenCalledWith({ email: 'nuevo@example.com', password: 'secreto123' })
    expect(useCases.signInWithPassword).not.toHaveBeenCalled()
  })

  it('muestra el mensaje que devuelve el registro (confirmar correo o error)', async () => {
    renderLogin({
      signUp: vi.fn().mockResolvedValue({
        status: 'confirmation-required',
        message: 'Revisa tu correo para confirmar la cuenta.',
      }),
    })

    await userEvent.click(screen.getByRole('button', { name: '¿No tienes cuenta? Regístrate' }))
    await fillForm()
    await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Revisa tu correo para confirmar la cuenta.')
  })

  it('continúa con Google', async () => {
    const useCases = renderLogin()

    await userEvent.click(screen.getByRole('button', { name: 'Continuar con Google' }))

    expect(useCases.signInWithGoogle).toHaveBeenCalledTimes(1)
  })

  it('muestra el error de Google si falla', async () => {
    renderLogin({ signInWithGoogle: vi.fn().mockResolvedValue({ error: 'provider is not enabled' }) })

    await userEvent.click(screen.getByRole('button', { name: 'Continuar con Google' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('provider is not enabled')
  })
})
