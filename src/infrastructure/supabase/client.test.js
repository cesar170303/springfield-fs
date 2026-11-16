import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

describe('cliente de Supabase', () => {
  it('en los tests usa variables falsas, nunca el proyecto real', () => {
    expect(import.meta.env.VITE_SUPABASE_URL).toBe('http://localhost:54321')
    expect(import.meta.env.VITE_SUPABASE_ANON_KEY).toBe('test-anon-key')
  })

  it('exporta un cliente cuando las variables están definidas', async () => {
    const { supabase } = await import('./client')

    expect(typeof supabase.auth.getSession).toBe('function')
    expect(typeof supabase.rpc).toBe('function')
  })

  it('lanza un error claro si falta la URL', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '')

    await expect(import('./client')).rejects.toThrow('Faltan VITE_SUPABASE_URL')
  })

  it('lanza un error claro si falta la anon key', async () => {
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '')

    await expect(import('./client')).rejects.toThrow('Faltan VITE_SUPABASE_URL')
  })
})
