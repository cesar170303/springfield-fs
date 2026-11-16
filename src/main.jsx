import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { useCases } from './infrastructure/composition'
import App from './infrastructure/ui/App'
import { AuthProvider } from './infrastructure/ui/auth/AuthProvider'
import { UseCasesContext } from './infrastructure/ui/use-cases-context'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <UseCasesContext.Provider value={useCases}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </UseCasesContext.Provider>
  </StrictMode>,
)
