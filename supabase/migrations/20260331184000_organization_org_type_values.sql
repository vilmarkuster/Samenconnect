-- Align legacy org_type codes with SamenConnect UI vocabulary (Zorginstelling, PGB, Bureau, Zelfstandig, Overig).
update public.organization_profiles
set org_type = case trim(lower(coalesce(org_type, '')))
  when 'home_care' then 'zorginstelling'
  when 'nursing_home' then 'zorginstelling'
  when 'hospital' then 'zorginstelling'
  when 'agency' then 'bureau'
  when 'other' then 'overig'
  else org_type
end
where org_type is not null
  and trim(lower(org_type)) in ('home_care', 'nursing_home', 'hospital', 'agency', 'other');
