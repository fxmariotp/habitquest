-- Añade campos de frecuencia y completado-único a habits
ALTER TABLE public.habits ADD COLUMN IF NOT EXISTS frequency text DEFAULT 'daily';
ALTER TABLE public.habits ADD COLUMN IF NOT EXISTS frequency_days integer[] DEFAULT '{}';
ALTER TABLE public.habits ADD COLUMN IF NOT EXISTS completed_once boolean DEFAULT false;
