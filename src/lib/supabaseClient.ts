// src/lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/public'; // Import public env vars

// Create the Supabase client using the environment variables
export const supabase = createClient(
    env.PUBLIC_SUPABASE_URL,
    env.PUBLIC_SUPABASE_ANON_KEY
);