import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Credenciais do projeto Supabase.
// Para usar seu próprio projeto: substitua pelos valores em
// supabase.com → Project Settings → API
const SUPABASE_URL = 'https://bfdpfriycauwkajerdmg.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmZHBmcml5Y2F1d2thamVyZG1nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwNjI2MzIsImV4cCI6MjA5MjYzODYzMn0.xBxNhYKQV-QkfLmYpTWxnyPPDw6FSG0SAULCiVCKgxY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
