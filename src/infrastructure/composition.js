import { createSeasonAdminUseCases } from '../application/use-cases/admin-seasons'
import { createAuthUseCases } from '../application/use-cases/auth'
import { createPlayerUseCases } from '../application/use-cases/player'
import { createSquadUseCases } from '../application/use-cases/squad'
import { supabase } from './supabase/client'
import { createSupabaseAuthGateway } from './supabase/auth-gateway'
import { createSupabasePlayerRepository } from './supabase/player-repository'
import { createSupabaseProfileRepository } from './supabase/profile-repository'
import { createSupabaseSeasonAdminRepository } from './supabase/season-admin-repository'
import { createSupabaseSquadRepository } from './supabase/squad-repository'

const squadRepository = createSupabaseSquadRepository(supabase)

// Raíz de composición: el único sitio donde se decide qué implementación real recibe cada caso de uso.
export const useCases = {
  ...createAuthUseCases({
    authGateway: createSupabaseAuthGateway(supabase),
    profileRepository: createSupabaseProfileRepository(supabase),
  }),
  ...createSquadUseCases({ squadRepository }),
  ...createPlayerUseCases({ squadRepository, playerRepository: createSupabasePlayerRepository(supabase) }),
  ...createSeasonAdminUseCases({ seasonAdminRepository: createSupabaseSeasonAdminRepository(supabase) }),
}
