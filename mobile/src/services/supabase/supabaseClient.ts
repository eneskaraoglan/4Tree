import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://amnextqkzzqrakkpnrmw.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtbmV4dHFrenpxcmFra3Bucm13Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE1NzQxNjIsImV4cCI6MjEwNzE1MDE2Mn0.WSqlRIXaVqd2wEt2iGBVEpEqqkv8-fjUH311OwjF-GY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
