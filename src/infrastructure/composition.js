import { createAuthUseCases } from '../application/use-cases/auth'
import { supabase } from './supabase/client'
import { createSupabaseAuthGateway } from './supabase/auth-gateway'
import { createSupabaseProfileRepository } from './supabase/profile-repository'

// Raíz de composición: el único sitio donde se decide qué implementación real recibe cada caso de uso.
export const useCases = {
  ...createAuthUseCases({
    authGateway: createSupabaseAuthGateway(supabase),
    profileRepository: createSupabaseProfileRepository(supabase),
  }),
}
