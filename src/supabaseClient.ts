
/*
 * =================================================================================
 * CLIENTE SUPABASE (src/supabaseClient.ts)
 * =================================================================================
 */

import { createClient } from '@supabase/supabase-js'

// IMPORTANTE: Certifique-se de que estas chaves estão corretas no .env.local
// PROJECT_URL deve ser algo como "https://xyz.supabase.co"
// PUBLIC_KEY deve ser a "anon key" (pública)
// SECRET_KEY deve ser a "service_role" (admin total) - CUIDADO AO USAR

const PROJECT_URL = "https://apcxozejkkwfenlqtvvr.supabase.co";
const PUBLIC_KEY = "sb_publishable_gIjBi6T4h_-7OtNdXx3YEw_y-jwUcGn";

// Cliente Padrão (Usuário Logado)
// Configuramos para persistir a sessão e detectar automaticamente.
export const supabase = createClient(PROJECT_URL, PUBLIC_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'lumen_user_session_v1' 
  }
});

// REMOVIDO: Cliente Admin
// Motivo: O uso da Service Role Key no front-end é extremamente inseguro e não deve ser necessário
// se as políticas RLS (no script SQL fornecido) estiverem corretas.
