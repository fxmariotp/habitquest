import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  throw new Error('Faltan las variables de entorno de Supabase. Copia .env.example a .env y rellena tus claves.')
}

export const supabase = createClient(url, key)
