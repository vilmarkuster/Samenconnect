-- Vacature-afbeeldingen: JSON array van publieke Storage-URLs + bucket `job-images`

alter table public.care_jobs
  add column if not exists image_urls jsonb not null default '[]'::jsonb;

comment on column public.care_jobs.image_urls is 'Public URLs of listing images (Supabase Storage bucket job-images).';

-- Storage bucket (public read; uploads via authenticated user matching poster + path)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
select
  'job-images',
  'job-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
where not exists (select 1 from storage.buckets b where b.id = 'job-images');

drop policy if exists "job_images_poster_insert" on storage.objects;
create policy "job_images_poster_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'job-images'
    and split_part(name, '/', 1) = auth.uid()::text
    and exists (
      select 1 from public.care_jobs j
      where j.id::text = split_part(name, '/', 2)
      and j.poster_id = auth.uid()
    )
  );
