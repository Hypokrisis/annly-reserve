-- Create a public bucket for business assets
-- Run this in your Supabase SQL Editor

-- 1. Create the bucket (if not exists)
insert into storage.buckets (id, name, public)
values ('business-assets', 'business-assets', true)
on conflict (id) do nothing;

-- 2. Set up RLS Policies for the bucket
-- Allow anyone to VIEW the assets
create policy "Public Access"
on storage.objects for select
using ( bucket_id = 'business-assets' );

-- Allow authenticated users to UPLOAD their own assets
-- We check if the user is authenticated
create policy "Authenticated Upload"
on storage.objects for insert
with check (
  bucket_id = 'business-assets' 
  and auth.role() = 'authenticated'
);

-- Allow owners to UPDATE/DELETE their own assets
-- Note: A more strict policy would check if the path belongs to their business_id.
-- For simplicity, we allow any authenticated user to manage objects for now, 
-- but in production you'd want: (storage.foldername(name))[1] == (select business_id from ...)
create policy "Authenticated Manage"
on storage.objects for update
using ( bucket_id = 'business-assets' and auth.role() = 'authenticated' );

create policy "Authenticated Delete"
on storage.objects for delete
using ( bucket_id = 'business-assets' and auth.role() = 'authenticated' );
