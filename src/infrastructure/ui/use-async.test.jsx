import { describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { useAsync } from './use-async'

function deferred() {
  const d = {}
  d.promise = new Promise((resolve, reject) => Object.assign(d, { resolve, reject }))
  return d
}

describe('useAsync', () => {
  it('mientras carga no hay datos ni error; después, los datos', async () => {
    const load = vi.fn().mockResolvedValue(['a'])
    const { result } = renderHook(() => useAsync(load))

    expect(result.current).toMatchObject({ data: null, error: null })
    await waitFor(() => expect(result.current.data).toEqual(['a']))
  })

  it('si falla, da el error', async () => {
    const load = vi.fn().mockRejectedValue(new Error('sin red'))
    const { result } = renderHook(() => useAsync(load))

    await waitFor(() => expect(result.current.error?.message).toBe('sin red'))
    expect(result.current.data).toBeNull()
  })

  it('reload vuelve a pedirlos sin quitar los que hay mientras llegan', async () => {
    const second = deferred()
    const load = vi.fn().mockResolvedValueOnce(['a']).mockReturnValueOnce(second.promise)
    const { result } = renderHook(() => useAsync(load))
    await waitFor(() => expect(result.current.data).toEqual(['a']))

    act(() => result.current.reload())
    expect(result.current.data).toEqual(['a'])
    await act(async () => second.resolve(['a', 'b']))

    expect(result.current.data).toEqual(['a', 'b'])
  })

  it('al cambiar la clave, los datos anteriores dejan de valer y una respuesta vieja se descarta', async () => {
    const pending = { 1: deferred(), 2: deferred() }
    const { result, rerender } = renderHook(({ id }) => useAsync(() => pending[id].promise, id), {
      initialProps: { id: 1 },
    })

    rerender({ id: 2 })
    await act(async () => pending[2].resolve('dos'))
    await act(async () => pending[1].resolve('uno'))
    expect(result.current.data).toBe('dos')

    rerender({ id: 1 })
    expect(result.current.data).toBeNull()
    await waitFor(() => expect(result.current.data).toBe('uno'))
  })
})
