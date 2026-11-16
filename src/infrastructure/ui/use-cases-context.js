import { createContext, useContext } from 'react'

// Por aquí recibe la UI los casos de uso. Es su única puerta hacia la aplicación.
export const UseCasesContext = createContext(null)

export function useUseCases() {
  const useCases = useContext(UseCasesContext)
  if (!useCases) throw new Error('useUseCases debe usarse dentro de <UseCasesContext.Provider>')
  return useCases
}
