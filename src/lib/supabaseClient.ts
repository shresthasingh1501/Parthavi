// src/lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase'; // We'll generate this next

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL or Anon Key is missing in environment variables.");
}

// Use the Database type generic for type safety
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
