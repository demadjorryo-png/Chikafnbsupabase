-- Extensions
create extension if not exists "pgcrypto";

-- Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  display_name text,
  avatar_url text,
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;

create policy if not exists "profiles_select_own"
  on public.profiles for select using (auth.uid() = id);

create policy if not exists "profiles_update_own"
  on public.profiles for update using (auth.uid() = id)
  with check (auth.uid() = id);

-- Posts
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  content text,
  created_at timestamptz default now()
);
alter table public.posts enable row level security;

create policy if not exists "posts_read_all"
  on public.posts for select using (true);

create policy if not exists "posts_insert_own"
  on public.posts for insert with check (auth.uid() = user_id);

create policy if not exists "posts_update_own"
  on public.posts for update using (auth.uid() = user_id);

create policy if not exists "posts_delete_own"
  on public.posts for delete using (auth.uid() = user_id);

-- Trigger: create profile on new user
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Storage RLS for bucket 'avatars'
alter table if exists storage.objects enable row level security;

create policy if not exists "avatars_public_read"
  on storage.objects for select using (bucket_id = 'avatars');

create policy if not exists "avatars_insert_own_folder"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (name like (auth.uid()::text || '/%')));

create policy if not exists "avatars_update_own_folder"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (name like (auth.uid()::text || '/%')));

create policy if not exists "avatars_delete_own_folder"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (name like (auth.uid()::text || '/%')));

-- Note: create bucket 'avatars' via Dashboard/CLI first.

-- Storage RLS for bucket 'products'
create policy if not exists "products_public_read"
  on storage.objects for select using (bucket_id = 'products');

create policy if not exists "products_insert_auth"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'products');

create policy if not exists "products_update_auth"
  on storage.objects for update to authenticated
  using (bucket_id = 'products');

create policy if not exists "products_delete_auth"
  on storage.objects for delete to authenticated
  using (bucket_id = 'products');

-- Storage RLS for bucket 'topup-proofs'
create policy if not exists "topup_public_read"
  on storage.objects for select using (bucket_id = 'topup-proofs');

create policy if not exists "topup_insert_auth"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'topup-proofs');

create policy if not exists "topup_update_auth"
  on storage.objects for update to authenticated
  using (bucket_id = 'topup-proofs');

create policy if not exists "topup_delete_auth"
  on storage.objects for delete to authenticated
  using (bucket_id = 'topup-proofs');
