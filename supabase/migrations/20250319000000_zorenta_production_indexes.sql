create index if not exists idx_care_jobs_care_type on public.care_jobs(care_type);
create index if not exists idx_care_jobs_city on public.care_jobs(city);
create index if not exists idx_care_jobs_region on public.care_jobs(region);
create index if not exists idx_job_applications_job_id on public.job_applications(job_id);
create index if not exists idx_job_applications_applicant_id on public.job_applications(applicant_id);
create index if not exists idx_messages_conversation_id on public.messages(conversation_id);
create index if not exists idx_reviews_reviewee_id on public.reviews(reviewee_id);
