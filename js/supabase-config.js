// ============================================
// Configuración de Supabase
// ============================================

const SUPABASE_URL = 'https://thgbqasrjpmkhanmotps.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRoZ2JxYXNyanBta2hhbm1vdHBzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NjQzMjIsImV4cCI6MjA5MDU0MDMyMn0.3WVb4WazwQHob6yliRoIb6YHXKq_52DKPjAYreEVKvM';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
