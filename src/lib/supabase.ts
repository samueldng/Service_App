import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tuzqqpdlxujygvkpxxnp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1enFxcGRseHVqeWd2a3B4eG5wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2MzY4NjQsImV4cCI6MjA4ODIxMjg2NH0.bB_MbVqtt0m7nix17HOm_ceU4Z4Rtwle8sUMAhx84Ns';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
