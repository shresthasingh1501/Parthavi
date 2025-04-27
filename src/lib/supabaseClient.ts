// src/lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase'; // We'll generate this next

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Add console logs to check if env variables are loaded
console.log("Supabase URL Loaded:", !!supabaseUrl);
console.log("Supabase Anon Key Loaded:", !!supabaseAnonKey);
// IMPORTANT: Never log the actual key value!

if (!supabaseUrl || !supabaseAnonKey) {
  // Make the error more visible in the console
  console.error("FATAL ERROR: Supabase URL or Anon Key is missing!");
  console.error("Please ensure you have a .env file in the project root with:");
  console.error("VITE_SUPABASE_URL=your_supabase_url");
  console.error("VITE_SUPABASE_ANON_KEY=your_supabase_anon_key");
  throw new Error("Supabase URL or Anon Key is missing in environment variables.");
}

// Use the Database type generic for type safety
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Add log to confirm client creation
console.log("Supabase client initialized successfully.");
