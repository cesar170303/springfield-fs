import { createAccountAdminUseCases } from '../application/use-cases/admin-accounts'
import { createPlayerAdminUseCases } from '../application/use-cases/admin-players'
import { createRosterAdminUseCases } from '../application/use-cases/admin-roster'
import { createSeasonAdminUseCases } from '../application/use-cases/admin-seasons'
import { createAuthUseCases } from '../application/use-cases/auth'
import { createPlayerUseCases } from '../application/use-cases/player'
import { createSquadUseCases } from '../application/use-cases/squad'
import { supabase } from './supabase/client'
import { createSupabaseAccountAdminRepository } from './supabase/account-admin-repository'
import { createSupabaseAuthGateway } from './supabase/auth-gateway'
import { createSupabasePlayerAdminRepository } from './supabase/player-admin-repository'
import { createSupabasePlayerRepository } from './supabase/player-repository'
import { createSupabaseProfileRepository } from './supabase/profile-repository'
import { createSupabaseSeasonAdminRepository } from './supabase/season-admin-repository'
import { createSupabaseSquadRepository } from './supabase/squad-repository'

const squadRepository = createSupabaseSquadRepository(supabase)
const seasonAdminRepository = createSupabaseSeasonAdminRepository(supabase)
const playerAdminRepository = createSupabasePlayerAdminRepository(supabase)

// Raíz de composición: el único sitio donde se decide qué implementación real recibe cada caso de uso.
export const useCases = {
  ...createAuthUseCases({
    authGateway: createSupabaseAuthGateway(supabase),
    profileRepository: createSupabaseProfileRepository(supabase),
  }),
  ...createSquadUseCases({ squadRepository }),
  ...createPlayerUseCases({ squadRepository, playerRepository: createSupabasePlayerRepository(supabase) }),
  ...createSeasonAdminUseCases({ seasonAdminRepository }),
  ...createPlayerAdminUseCases({ playerAdminRepository }),
  ...createRosterAdminUseCases({ seasonAdminRepository, playerAdminRepository }),
  ...createAccountAdminUseCases({ accountAdminRepository: createSupabaseAccountAdminRepository(supabase) }),
}
