-- ============================================================
-- MIGRACIÓN V2 — FICCT Campeonato de Fútbol
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Columnas nuevas en players (verificación estudiantil + foto)
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS carnet TEXT;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false NOT NULL;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 2. Columnas nuevas en matches
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'scheduled'
  CHECK (status IN ('scheduled','live','finished','cancelled'));
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS referee_notes TEXT;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 3. Timestamps en teams y tournaments
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 4. Tabla match_events (goles, tarjetas, MVP, asistencias)
CREATE TABLE IF NOT EXISTS public.match_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE NOT NULL,
  player_id UUID REFERENCES public.players(id) ON DELETE CASCADE NOT NULL,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL CHECK (
    event_type IN ('goal', 'yellow_card', 'red_card', 'assist', 'mvp', 'best_goalkeeper')
  ),
  is_own_goal BOOLEAN DEFAULT false NOT NULL,
  minute INTEGER CHECK (minute >= 0 AND minute <= 120),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. RLS en match_events
ALTER TABLE public.match_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read match_events"
  ON public.match_events FOR SELECT USING (true);

CREATE POLICY "Owner manage match_events"
  ON public.match_events FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.matches mt
      JOIN public.tournaments tr ON mt.tournament_id = tr.id
      WHERE mt.id = match_id AND tr.creator_id = auth.uid()
    )
  );

-- ============================================================
-- VERIFICACIÓN: Ejecuta esto al final para confirmar
-- ============================================================
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'players' AND table_schema = 'public'
-- ORDER BY ordinal_position;
--
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'matches' AND table_schema = 'public'
-- ORDER BY ordinal_position;
--
-- SELECT * FROM information_schema.tables
-- WHERE table_name = 'match_events' AND table_schema = 'public';
