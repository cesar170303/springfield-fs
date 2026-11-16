import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Login from './Login'

// El cliente de Supabase es la frontera con el exterior: lo falseamos aquí y nada más.
const auth = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  signInWithOAuth: vi.fn(),
}))
vi.mock('../lib/supabase', () => ({ supabase: { auth } }))

async function fillForm(email = 'jugador@example.com', password = 'secreto123') {
  await userEvent.type(screen.getByPlaceholderText('Correo'), email)
  await userEvent.type(screen.getByPlaceholderText('Contraseña'), password)
}

beforeEach(() => {
  vi.resetAllMocks()
  auth.signInWithPassword.mockResolvedValue({ data: { session: {} }, error: null })
  auth.signUp.mockResolvedValue({ data: { session: {} }, error: null })
  auth.signInWithOAuth.mockResolvedValue({ error: null })
})

describe('Login', () => {
  it('inicia sesión con el correo y la contraseña escritos', async () => {
    render(<Login />)

    await fillForm('jugador@example.com', 'secreto123')
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(auth.signInWithPassword).toHaveBeenCalledWith({ email: 'jugador@example.com', password: 'secreto123' })
    expect(auth.signUp).not.toHaveBeenCalled()
  })

  it('muestra el error que devuelve Supabase', async () => {
    auth.signInWithPassword.mockResolvedValue({ data: {}, error: { message: 'Invalid login credentials' } })
    render(<Login />)

    await fillForm()
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid login credentials')
  })

  it('deshabilita el botón mientras se envía el formulario', async () => {
    auth.signInWithPassword.mockReturnValue(new Promise(() => {})) // nunca termina
    render(<Login />)

    await fillForm()
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(screen.getByRole('button', { name: 'Entrar' })).toBeDisabled()
  })

  it('al cambiar a "Regístrate" crea la cuenta en vez de iniciar sesión', async () => {
    render(<Login />)

    await userEvent.click(screen.getByRole('button', { name: '¿No tienes cuenta? Regístrate' }))
    await fillForm('nuevo@example.com', 'secreto123')
    await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    expect(auth.signUp).toHaveBeenCalledWith({ email: 'nuevo@example.com', password: 'secreto123' })
    expect(auth.signInWithPassword).not.toHaveBeenCalled()
  })

  it('pide confirmar el correo si el registro no devuelve sesión', async () => {
    auth.signUp.mockResolvedValue({ data: { session: null }, error: null })
    render(<Login />)

    await userEvent.click(screen.getByRole('button', { name: '¿No tienes cuenta? Regístrate' }))
    await fillForm()
    await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Revisa tu correo para confirmar la cuenta.')
  })

  it('continúa con Google redirigiendo de vuelta a la app', async () => {
    render(<Login />)

    await userEvent.click(screen.getByRole('button', { name: 'Continuar con Google' }))

    expect(auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
  })
})
