import { createAuthUseCases } from '../application/use-cases/auth'
import { createSquadUseCases } from '../application/use-cases/squad'
import { supabase } from './supabase/client'
import { createSupabaseAuthGateway } from './supabase/auth-gateway'
import { createSupabaseProfileRepository } from './supabase/profile-repository'
import { createSupabaseSquadRepository } from './supabase/squad-repository'

// Raíz de composición: el único sitio donde se decide qué implementación real recibe cada caso de uso.
export const useCases = {
  ...createAuthUseCases({
    authGateway: createSupabaseAuthGateway(supabase),
    profileRepository: createSupabaseProfileRepository(supabase),
  }),
  ...createSquadUseCases({ squadRepository: createSupabaseSquadRepository(supabase) }),
}
