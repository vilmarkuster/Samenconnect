-- =============================================================================
-- Verificatie: vacaturefoto-setup (alleen lezen — veilig in SQL Editor)
-- Voer uit in Supabase Dashboard → SQL → New query
-- =============================================================================

-- 1) Kolom image_urls op care_jobs
SELECT
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'care_jobs'
  AND column_name = 'image_urls';
-- Verwacht: één rij, data_type = json (of jsonb), default leeg of '[]'::jsonb

-- 2) Storage bucket job-images
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id = 'job-images';
-- Verwacht: één rij, public = true

-- 3) Policy op storage.objects (job_images_poster_insert)
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'objects'
  AND schemaname = 'storage'
  AND policyname = 'job_images_poster_insert';
-- Verwacht: één rij, cmd = INSERT

-- 4) (Optioneel) Migratie-registratie — faalt als schema ontbreekt; dan negeren
SELECT * FROM supabase_migrations.schema_migrations
ORDER BY version DESC
LIMIT 25;
-- Zoek naar 20260321120000. Ontbreekt die terwijl (1)-(3) kloppen: DB is bijgewerkt, migratie niet geregistreerd.
