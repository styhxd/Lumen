
/*
 * =================================================================================
 * CLIENTE SUPABASE (src/supabaseClient.ts)
 * =================================================================================
 */

import { createClient } from '@supabase/supabase-js'

// Declarações de tipo para corrigir erros quando 'vite/client' não é encontrado
declare global {
  interface ImportMetaEnv {
    readonly VITE_SUPABASE_URL: string;
    readonly VITE_SUPABASE_ANON_KEY: string;
  }
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

// Chaves de fallback fornecidas para garantir que o app não quebre se o env falhar
const FALLBACK_URL = "https://apcxozejkkwfenlqtvvr.supabase.co";
const FALLBACK_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwY3hvemVqa2t3ZmVubHF0dnZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2MTEyMzcsImV4cCI6MjA4NTE4NzIzN30.hOzAmlymUdiS0kz5K_WBhsyPSQAovDRudGL7ReiTGAI";

// Acesso seguro ao import.meta.env usando optional chaining (?.) e fallback (||)
const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || FALLBACK_URL;
const supabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || FALLBACK_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
