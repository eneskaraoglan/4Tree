-- =============================================================================
-- 4Tree – Tam Şema (Frontend Servis Arayüzleriyle Uyumlu)
-- Tarih: 2026-10-10
-- Kapsam:
--   1. Auth trigger: yeni kullanıcıda users_profile otomatik oluşturulsun
--   2. users_profile: visibility, total_distance_m, active_days alanları
--   3. runs: activity_type, place, seeds_earned otomatik hesaplama
--   4. user_trees: INSERT politikası + ağaç sayısı güncelleme trigger'ı
--   5. badges + user_badges tabloları ve seed verisi
--   6. posts + post_reactions + comments (Feed)
--   7. privacy_zones tablosu
--   8. Tüm tablolara RLS politikaları
--   9. Feed için arkadaşlık desteği (friendships)
-- =============================================================================

-- =============================================================================
-- 1. USERS_PROFILE GENİŞLETME
-- =============================================================================

-- Görünürlük enum
DO $$ BEGIN
  CREATE TYPE visibility_type AS ENUM ('public', 'friends', 'private');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Seviye enum (frontend: seed | sapling | tree | forest)
DO $$ BEGIN
  CREATE TYPE level_name AS ENUM ('seed', 'sapling', 'tree', 'forest');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- users_profile'a eksik sütunları ekle
ALTER TABLE public.users_profile
  ADD COLUMN IF NOT EXISTS avatar_initial  text               NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS visibility      visibility_type    NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS total_distance_m bigint            NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS active_days     integer            NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_trees     integer            NOT NULL DEFAULT 0;

-- =============================================================================
-- 2. AUTH TRIGGER: Yeni kullanıcı → users_profile otomatik oluştur
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users_profile (id, display_name, avatar_initial)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    UPPER(LEFT(COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- 3. RUNS GENİŞLETME
-- =============================================================================

-- activity_type enum (frontend: 'run' | 'walk')
DO $$ BEGIN
  CREATE TYPE activity_type AS ENUM ('run', 'walk');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.runs
  ADD COLUMN IF NOT EXISTS type   activity_type NOT NULL DEFAULT 'run',
  ADD COLUMN IF NOT EXISTS place  text          NOT NULL DEFAULT '';

-- Koşu bitince seeds_earned ve kullanıcı istatistiklerini otomatik güncelle
-- Kural: Her 20 km = 1 tohum (seed) — architecture.md karar günlüğü
CREATE OR REPLACE FUNCTION public.update_stats_after_run()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_km          NUMERIC;
  v_seeds       INTEGER;
  v_old_total_m BIGINT;
  v_new_total_m BIGINT;
  v_old_trees   INTEGER;
  v_new_trees   INTEGER;
BEGIN
  -- KM hesapla (distance_meters anti-cheat trigger tarafından PostGIS ile yazıldı)
  v_km    := NEW.distance_meters / 1000.0;
  v_seeds := FLOOR(v_km / 20);

  -- seeds_earned'ı yaz
  NEW.seeds_earned := v_seeds;

  -- Kullanıcı profilini güncelle (toplam mesafe, aktif gün, tohum bakiyesi, toplam ağaç)
  SELECT total_distance_m INTO v_old_total_m FROM public.users_profile WHERE id = NEW.user_id;
  v_new_total_m := v_old_total_m + NEW.distance_meters;

  -- toplam ağaç sayısını km cinsinden hesapla
  v_old_trees := FLOOR(v_old_total_m / 1000.0 / 20);
  v_new_trees := FLOOR(v_new_total_m / 1000.0 / 20);

  UPDATE public.users_profile
  SET
    total_distance_m = v_new_total_m,
    seed_balance     = seed_balance + v_seeds,
    total_trees      = v_new_trees,
    active_days      = active_days + 1
  WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_stats_after_run ON public.runs;
CREATE TRIGGER trg_update_stats_after_run
  BEFORE INSERT ON public.runs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_stats_after_run();

-- =============================================================================
-- 4. USER_TREES: INSERT POLİTİKASI + TOHUM BAKIYE KONTROLÜ
-- =============================================================================

-- Ağaç dikme fonksiyonu: tohum bakiyesi yeterliyse düşür
CREATE OR REPLACE FUNCTION public.deduct_seeds_on_plant()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_cost    INTEGER;
  v_balance INTEGER;
BEGIN
  SELECT cost_in_seeds INTO v_cost FROM public.tree_types WHERE id = NEW.tree_type_id;
  SELECT seed_balance  INTO v_balance FROM public.users_profile WHERE id = NEW.user_id;

  IF v_balance < v_cost THEN
    RAISE EXCEPTION 'Yetersiz tohum bakiyesi. Gerekli: %, Mevcut: %', v_cost, v_balance;
  END IF;

  UPDATE public.users_profile
  SET seed_balance = seed_balance - v_cost
  WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_deduct_seeds_on_plant ON public.user_trees;
CREATE TRIGGER trg_deduct_seeds_on_plant
  BEFORE INSERT ON public.user_trees
  FOR EACH ROW
  EXECUTE FUNCTION public.deduct_seeds_on_plant();

-- user_trees INSERT politikası (eksikti)
DROP POLICY IF EXISTS "user_trees: kendi ormanına ağaç dik" ON public.user_trees;
CREATE POLICY "user_trees: kendi ormanına ağaç dik"
  ON public.user_trees FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- 5. BADGES + USER_BADGES
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.badges (
  id          text        NOT NULL,
  name        text        NOT NULL,
  description text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

COMMENT ON TABLE public.badges IS 'Tanımlı rozet kataloğu';

CREATE TABLE IF NOT EXISTS public.user_badges (
  id         uuid        NOT NULL DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id   text        NOT NULL REFERENCES public.badges(id),
  earned_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE (user_id, badge_id)
);

COMMENT ON TABLE public.user_badges IS 'Kullanıcının kazandığı rozetler';

ALTER TABLE public.badges      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "badges: herkes okuyabilir"
  ON public.badges FOR SELECT USING (true);

CREATE POLICY "user_badges: kendi rozetlerini gör"
  ON public.user_badges FOR SELECT
  USING (auth.uid() = user_id);

-- Rozet seed verisi (mock ile birebir eşleşiyor)
INSERT INTO public.badges (id, name, description) VALUES
  ('first-5k',       'İlk 5 km',             'Tek seferde 5 km tamamla.'),
  ('first-tree',     'İlk ağaç',             'İlk 20 km''ni tamamla, ilk ağacın dikilsin.'),
  ('weekend-warrior','Hafta sonu savaşçısı', 'Aynı hafta sonu hem cumartesi hem pazar hareket et.'),
  ('km-100',         '100 km kulübü',         'Toplam 100 km''ye ulaş.'),
  ('early-bird',     'Erken kuş',             'Sabah 07:00''den önce başlayan bir koşu yap.'),
  ('tree-hero-10',   '10 ağaç kahramanı',    '10 ağaç dikilmesini sağla.'),
  ('half-marathon',  'Yarı maraton',          'Tek seferde 21,1 km koş.'),
  ('streak-7',       'Yedi gün üst üste',    'Art arda 7 gün hareket et.'),
  ('forest-keeper',  'Orman bekçisi',         '25 ağaca ulaş, Orman seviyesine geç.')
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 6. FRIENDSHIPS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.friendships (
  id          uuid        NOT NULL DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id   uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE (user_id, friend_id),
  CHECK (user_id <> friend_id)
);

COMMENT ON TABLE public.friendships IS 'Kullanıcılar arası arkadaşlık ilişkisi (çift yönlü)';

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "friendships: kendi arkadaşlıklarını gör"
  ON public.friendships FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "friendships: arkadaş ekle"
  ON public.friendships FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "friendships: arkadaş sil"
  ON public.friendships FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================================================
-- 7. POSTS + POST_REACTIONS + COMMENTS (Feed)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.posts (
  id              uuid          NOT NULL DEFAULT gen_random_uuid(),
  user_id         uuid          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  run_id          uuid          REFERENCES public.runs(id) ON DELETE SET NULL,
  caption         text,
  -- Aktivite özeti (frontend FeedActivitySummary): snapshot olarak tutulur
  activity_type   activity_type NOT NULL DEFAULT 'run',
  distance_m      integer       NOT NULL DEFAULT 0,
  duration_secs   integer       NOT NULL DEFAULT 0,
  place           text          NOT NULL DEFAULT '',
  trees_earned    integer       NOT NULL DEFAULT 0,
  clap_count      integer       NOT NULL DEFAULT 0,
  water_count     integer       NOT NULL DEFAULT 0,
  comment_count   integer       NOT NULL DEFAULT 0,
  created_at      timestamptz   NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

COMMENT ON TABLE public.posts IS 'Feed gönderileri; her koşu sonrası paylaşılabilir aktivite kartı';

-- post_reactions: clap | water — idempotent upsert için (user_id, post_id, reaction_type) unique
DO $$ BEGIN
  CREATE TYPE reaction_type AS ENUM ('clap', 'water');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.post_reactions (
  id            uuid          NOT NULL DEFAULT gen_random_uuid(),
  post_id       uuid          NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id       uuid          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction      reaction_type NOT NULL,
  created_at    timestamptz   NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE (post_id, user_id, reaction)
);

COMMENT ON TABLE public.post_reactions IS 'Alkış (clap) ve su verme (water) tepkileri; idempotent';

CREATE TABLE IF NOT EXISTS public.comments (
  id          uuid        NOT NULL DEFAULT gen_random_uuid(),
  post_id     uuid        NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body        text        NOT NULL CHECK (char_length(body) > 0),
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

COMMENT ON TABLE public.comments IS 'Gönderi yorumları';

-- clap_count / water_count / comment_count otomatik güncelleme
CREATE OR REPLACE FUNCTION public.update_post_counts()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF TG_TABLE_NAME = 'post_reactions' THEN
    UPDATE public.posts SET
      clap_count  = (SELECT COUNT(*) FROM public.post_reactions WHERE post_id = COALESCE(NEW.post_id, OLD.post_id) AND reaction = 'clap'),
      water_count = (SELECT COUNT(*) FROM public.post_reactions WHERE post_id = COALESCE(NEW.post_id, OLD.post_id) AND reaction = 'water')
    WHERE id = COALESCE(NEW.post_id, OLD.post_id);
  ELSIF TG_TABLE_NAME = 'comments' THEN
    UPDATE public.posts SET
      comment_count = (SELECT COUNT(*) FROM public.comments WHERE post_id = COALESCE(NEW.post_id, OLD.post_id))
    WHERE id = COALESCE(NEW.post_id, OLD.post_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_reaction_counts ON public.post_reactions;
CREATE TRIGGER trg_reaction_counts
  AFTER INSERT OR DELETE ON public.post_reactions
  FOR EACH ROW EXECUTE FUNCTION public.update_post_counts();

DROP TRIGGER IF EXISTS trg_comment_counts ON public.comments;
CREATE TRIGGER trg_comment_counts
  AFTER INSERT OR DELETE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.update_post_counts();

-- RLS
ALTER TABLE public.posts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments      ENABLE ROW LEVEL SECURITY;

-- posts: herkese açık profilde herkes görebilir; friends gizliyse sadece arkadaşlar
CREATE POLICY "posts: herkese açık gönderileri gör"
  ON public.posts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users_profile up
      WHERE up.id = posts.user_id
        AND (
          up.visibility = 'public'
          OR up.id = auth.uid()
          OR (up.visibility = 'friends' AND EXISTS (
            SELECT 1 FROM public.friendships f
            WHERE (f.user_id = auth.uid() AND f.friend_id = up.id)
               OR (f.friend_id = auth.uid() AND f.user_id = up.id)
          ))
        )
    )
  );

CREATE POLICY "posts: kendi gönderini paylaş"
  ON public.posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "posts: kendi gönderini sil"
  ON public.posts FOR DELETE
  USING (auth.uid() = user_id);

-- post_reactions: idempotent upsert (setClap / setWater)
CREATE POLICY "reactions: tepki gör"
  ON public.post_reactions FOR SELECT
  USING (true);

CREATE POLICY "reactions: tepki ver"
  ON public.post_reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "reactions: tepki geri al"
  ON public.post_reactions FOR DELETE
  USING (auth.uid() = user_id);

-- comments
CREATE POLICY "comments: yorumları gör"
  ON public.comments FOR SELECT
  USING (true);

CREATE POLICY "comments: yorum yap"
  ON public.comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "comments: kendi yorumunu sil"
  ON public.comments FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================================================
-- 8. PRIVACY_ZONES
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.privacy_zones (
  id         uuid             NOT NULL DEFAULT gen_random_uuid(),
  user_id    uuid             NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label      text             NOT NULL CHECK (char_length(label) > 0),
  center     geography(Point, 4326) NOT NULL,
  radius_m   integer          NOT NULL CHECK (radius_m > 0),
  created_at timestamptz      NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

COMMENT ON TABLE public.privacy_zones IS 'Kullanıcının gizli bölgeleri (ev, iş vb.) — rota paylaşımında kırpılır';

ALTER TABLE public.privacy_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "privacy_zones: kendi bölgelerini gör"
  ON public.privacy_zones FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "privacy_zones: bölge ekle"
  ON public.privacy_zones FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "privacy_zones: bölge sil"
  ON public.privacy_zones FOR DELETE
  USING (auth.uid() = user_id);

-- Computed columns (Sanal Sütunlar) for Supabase JS
-- PostgREST bunları otomatik olarak center_lat ve center_lng olarak döner.
CREATE OR REPLACE FUNCTION center_lat(pz public.privacy_zones) RETURNS float AS $$
  SELECT ST_Y(pz.center::geometry);
$$ LANGUAGE sql IMMUTABLE;

CREATE OR REPLACE FUNCTION center_lng(pz public.privacy_zones) RETURNS float AS $$
  SELECT ST_X(pz.center::geometry);
$$ LANGUAGE sql IMMUTABLE;

-- =============================================================================
-- 9. YARDIMCI VIEW: feed_posts_view
-- Frontend FeedPost tipini tek sorguda döner
-- =============================================================================

CREATE OR REPLACE VIEW public.feed_posts_view AS
SELECT
  p.id,
  p.user_id,
  up.display_name    AS author_name,
  up.avatar_initial  AS author_avatar_initial,
  up.visibility      AS author_visibility,
  p.caption,
  p.activity_type,
  p.distance_m,
  p.duration_secs,
  p.place,
  p.trees_earned,
  p.clap_count,
  p.water_count,
  p.comment_count,
  p.created_at,
  -- isFriend: giriş yapan kullanıcıyla arkadaş mı?
  (
    p.user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.friendships f
      WHERE (f.user_id = auth.uid() AND f.friend_id = p.user_id)
         OR (f.friend_id = auth.uid() AND f.user_id = p.user_id)
    )
  ) AS is_friend
FROM public.posts p
JOIN public.users_profile up ON up.id = p.user_id;
