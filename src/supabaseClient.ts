
/*
 * =================================================================================
 * CLIENTE SUPABASE (src/supabaseClient.ts)
 * =================================================================================
 */

import { createClient } from '@supabase/supabase-js'

const PROJECT_URL = "https://apcxozejkkwfenlqtvvr.supabase.co";

// CHAVE PÚBLICA (Para operações normais)
const PUBLIC_KEY = "sb_publishable_gIjBi6T4h_-7OtNdXx3YEw_y-jwUcGn";

// CHAVE SECRETA (Service Role - ADMIN TOTAL)
const SECRET_KEY = "sb_secret_CyH04P1PGz-7N_NqTV5KdQ_nhZ-3mts";

// Cliente Padrão (Usuário)
// Adicionamos 'storageKey' para isolar a sessão e evitar o aviso de múltiplas instâncias
export const supabase = createClient(PROJECT_URL, PUBLIC_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'lumen_user_session_v1' 
  }
});

// Cliente Admin (Sistema)
// Totalmente isolado, sem persistência de sessão para não conflitar com o usuário
export const supabaseAdmin = createClient(PROJECT_URL, SECRET_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  },
  global: {
    headers: { 'x-application-name': 'lumen-admin-backup' }
  }
});
