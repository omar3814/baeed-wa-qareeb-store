// src/lib/stores/authStore.ts
import { writable } from 'svelte/store';
import type { Session } from '@supabase/supabase-js';

// Create a writable Svelte store.
// It will hold the user's session info (if logged in) or null (if logged out).
// We initialize it to null, assuming the user is logged out initially.
export const authStore = writable<Session | null>(null);