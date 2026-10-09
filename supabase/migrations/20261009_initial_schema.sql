-- =============================================================================
-- 4Tree – İlk Veritabanı Şeması
-- Tarih: 2026-10-09
-- Proje: 4Tree (Supabase / PostgreSQL 17)
-- Açıklama: Kullanıcı profilleri, koşu kayıtları, ağaç türleri ve
--            sanal orman tablolarının ilk kurulumu.
-- =============================================================================

-- PostGIS eklentisi (GPS rota desteği için)
CREATE EXTENSION IF NOT EXISTS postgis;

-- =============================================================================
-- YARDIMCI FONKSİYONLAR
-- =============================================================================

-- updated_at alanını otomatik güncelleyen trigger fonksiyonu
CREATE OR REPLACE FUNCTION public.set_updated_at()
  RETURNS trigger
  LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Anti-cheat: Koşu geçerliliğini PostGIS ile doğrulayan trigger fonksiyonu
-- * Rota uzunluğu < 10 m ise reddeder
-- * Hız > 8.33 m/s (yaklaşık 30 km/saat) ise araç/sahte GPS şüphesiyle reddeder
-- * distance_meters alanını client'tan gelen değeri değil PostGIS'in
--   hesapladığı gerçek mesafeyle üzerine yazar (data spoofing koruması)
CREATE OR REPLACE FUNCTION public.check_run_validity()
  RETURNS trigger
  LANGUAGE plpgsql
AS $$
DECLARE
  v_actual_distance NUMERIC;
  v_speed_mps       NUMERIC;
  -- 8.33 m/s = Yaklaşık 30 km/saat. (Dünya rekoru maraton hızı 20-22 km/s civarıdır)
  v_max_speed_mps   NUMERIC := 8.33;
BEGIN
  -- 1. PostGIS kullanarak gönderilen koordinatların (rotanın) GERÇEK uzunluğunu hesapla (Metre cinsinden)
  v_actual_distance := ST_Length(NEW.route);

  -- 2. Eğer rota uzunluğu 10 metrenin altındaysa kaydetmeye değmez
  IF v_actual_distance < 10 THEN
    RAISE EXCEPTION 'Koşu mesafesi çok kısa, hareket algılanamadı.';
  END IF;

  -- 3. Gerçek hızı hesapla (Gerçek Mesafe / Süre)
  -- Sıfıra bölünme hatasını engellemek için NULLIF kullanıyoruz
  v_speed_mps := v_actual_distance / NULLIF(NEW.duration_secs, 1);

  -- 4. HIZ KONTROLÜ: Araç veya sahte konum şüphesi
  IF v_speed_mps > v_max_speed_mps THEN
    RAISE EXCEPTION 'Anti-Cheat: Araç kullanımı veya sahte GPS tespit edildi (Hız çok yüksek).';
  END IF;

  -- 5. GÜVENLİK (Data Spoofing Koruması):
  -- React tarafından "distance_meters: 50000" gönderilmiş olsa bile,
  -- biz PostGIS'in hesapladığı gerçek harita mesafesini veritabanına zorla yazıyoruz.
  NEW.distance_meters := ROUND(v_actual_distance);

  RETURN NEW;
END;
$$;

-- =============================================================================
-- TABLOLAR
-- =============================================================================

-- Kullanıcı profil bilgileri ve tohum bakiyesi
-- id -> auth.users.id ile eşleşir
CREATE TABLE IF NOT EXISTS public.users_profile (
  id           uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text        NOT NULL DEFAULT '''',
  seed_balance integer     NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

COMMENT ON TABLE public.users_profile IS 'Kullanıcı profil bilgileri ve tohum bakiyesi';

CREATE TRIGGER trg_users_profile_updated_at
  BEFORE UPDATE ON public.users_profile
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Kullanıcının tamamladığı koşu kayıtları
-- route -> PostGIS geography(LineString, 4326)
CREATE TABLE IF NOT EXISTS public.runs (
  id              uuid        NOT NULL DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  distance_meters integer     NOT NULL,
  duration_secs   integer     NOT NULL,
  seeds_earned    integer     NOT NULL DEFAULT 0,
  route           geography(LineString, 4326),
  started_at      timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

COMMENT ON TABLE public.runs IS 'Kullanıcının tamamladığı koşu kayıtları';

CREATE TRIGGER trg_anti_cheat_runs
  BEFORE INSERT ON public.runs
  FOR EACH ROW
  EXECUTE FUNCTION public.check_run_validity();

-- Forest mağazasında satılan ağaç türleri ve tohum maliyetleri
CREATE TABLE IF NOT EXISTS public.tree_types (
  id            text        NOT NULL,
  name          text        NOT NULL,
  cost_in_seeds integer     NOT NULL,
  description   text,
  created_at    timestamptz DEFAULT now(),
  PRIMARY KEY (id)
);

COMMENT ON TABLE public.tree_types IS 'Forest mağazasında satılan ağaç türleri ve tohum maliyetleri';

-- Kullanıcıların diktiği ağaçlar (Sanal Orman)
CREATE TABLE IF NOT EXISTS public.user_trees (
  id           uuid        NOT NULL DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tree_type_id text        NOT NULL REFERENCES public.tree_types(id),
  planted_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

COMMENT ON TABLE public.user_trees IS 'Kullanıcıların diktiği ağaçlar (Sanal Orman)';

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

ALTER TABLE public.users_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.runs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tree_types     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_trees     ENABLE ROW LEVEL SECURITY;

-- users_profile
CREATE POLICY "users_profile: kendi profilini oku"
  ON public.users_profile FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "users_profile: kendi profilini oluştur"
  ON public.users_profile FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "users_profile: kendi profilini güncelle"
  ON public.users_profile FOR UPDATE
  USING (auth.uid() = id);

-- runs
CREATE POLICY "runs: kendi koşularını oku"
  ON public.runs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "runs: kendi koşusunu ekle"
  ON public.runs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "runs: kendi koşusunu sil"
  ON public.runs FOR DELETE
  USING (auth.uid() = user_id);

-- tree_types (herkes okuyabilir)
CREATE POLICY "tree_types: herkes okuyabilir"
  ON public.tree_types FOR SELECT
  USING (true);

-- user_trees
CREATE POLICY "user_trees: kendi ormanını gör"
  ON public.user_trees FOR SELECT
  USING (auth.uid() = user_id);

-- =============================================================================
-- SEED VERİSİ – tree_types
-- =============================================================================

INSERT INTO public.tree_types (id, name, cost_in_seeds, description) VALUES
  ('pine',   'Çam Ağacı',             10, 'Hızlı büyüyen klasik ve dayanıklı bir çam ağacı.'),
  ('oak',    'Meşe Ağacı',            25, 'Kökleri derine inen, görkemli ulu meşe.'),
  ('sakura', 'Sakura (Kiraz Çiçeği)', 50, 'Baharın müjdecisi, nadir bulunan pembe yapraklı ağaç.')
ON CONFLICT (id) DO NOTHING;
