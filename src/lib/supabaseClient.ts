import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jdkbinqctkheknbjfwep.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impka2JpbnFjdGtoZWtuYmpmd2VwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NTgwNDcsImV4cCI6MjA4ODUzNDA0N30.FHTo-tz_3uZJ_W_VlDR9zLUMREbfiuwvjRF8DwPXZhQ';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
