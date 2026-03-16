-- ============================================
-- SOCIAL FEED - POSTS
-- ============================================
create table if not exists public.feed_posts (
  id text primary key,
  user_id text not null references public.profiles(id),
  registro_id text,
  tipo_treino text,
  nome_treino text,
  duracao_segundos integer,
  resumo jsonb,
  texto text,
  foto_urls text[] default '{}',
  likes_count integer default 0,
  comments_count integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.feed_posts enable row level security;

create policy "Anyone can read posts"
  on public.feed_posts for select
  using (auth.role() = 'authenticated');

create policy "Users can insert own posts"
  on public.feed_posts for insert
  with check (auth.uid()::text = user_id);

create policy "Users can update own posts"
  on public.feed_posts for update
  using (auth.uid()::text = user_id);

create policy "Users can delete own posts"
  on public.feed_posts for delete
  using (auth.uid()::text = user_id);

create index if not exists idx_feed_posts_created on public.feed_posts(created_at desc);
create index if not exists idx_feed_posts_user on public.feed_posts(user_id);

-- ============================================
-- SOCIAL FEED - LIKES
-- ============================================
create table if not exists public.feed_likes (
  id text primary key default gen_random_uuid()::text,
  post_id text not null references public.feed_posts(id) on delete cascade,
  user_id text not null,
  created_at timestamptz default now(),
  unique(post_id, user_id)
);

alter table public.feed_likes enable row level security;

create policy "Anyone can read likes"
  on public.feed_likes for select
  using (auth.role() = 'authenticated');

create policy "Users can insert own likes"
  on public.feed_likes for insert
  with check (auth.uid()::text = user_id);

create policy "Users can delete own likes"
  on public.feed_likes for delete
  using (auth.uid()::text = user_id);

create index if not exists idx_feed_likes_post on public.feed_likes(post_id);
create index if not exists idx_feed_likes_user on public.feed_likes(user_id);

-- ============================================
-- SOCIAL FEED - COMMENTS
-- ============================================
create table if not exists public.feed_comments (
  id text primary key default gen_random_uuid()::text,
  post_id text not null references public.feed_posts(id) on delete cascade,
  user_id text not null references public.profiles(id),
  texto text not null,
  created_at timestamptz default now()
);

alter table public.feed_comments enable row level security;

create policy "Anyone can read comments"
  on public.feed_comments for select
  using (auth.role() = 'authenticated');

create policy "Users can insert own comments"
  on public.feed_comments for insert
  with check (auth.uid()::text = user_id);

create policy "Users can delete own comments"
  on public.feed_comments for delete
  using (auth.uid()::text = user_id);

create index if not exists idx_feed_comments_post on public.feed_comments(post_id);

-- ============================================
-- RPC: Toggle like (atomic)
-- ============================================
create or replace function public.toggle_like(p_post_id text, p_user_id text)
returns boolean as $$
declare
  already_liked boolean;
begin
  select exists(
    select 1 from public.feed_likes where post_id = p_post_id and user_id = p_user_id
  ) into already_liked;

  if already_liked then
    delete from public.feed_likes where post_id = p_post_id and user_id = p_user_id;
    update public.feed_posts set likes_count = greatest(likes_count - 1, 0) where id = p_post_id;
    return false;
  else
    insert into public.feed_likes (post_id, user_id)
    values (p_post_id, p_user_id);
    update public.feed_posts set likes_count = likes_count + 1 where id = p_post_id;
    return true;
  end if;
end;
$$ language plpgsql security definer;

-- ============================================
-- RPC: Add comment (atomic with counter)
-- ============================================
create or replace function public.add_comment(p_post_id text, p_user_id text, p_texto text)
returns text as $$
declare
  new_id text;
begin
  new_id := gen_random_uuid()::text;
  insert into public.feed_comments (id, post_id, user_id, texto)
  values (new_id, p_post_id, p_user_id, p_texto);
  update public.feed_posts set comments_count = comments_count + 1 where id = p_post_id;
  return new_id;
end;
$$ language plpgsql security definer;

-- ============================================
-- RPC: Delete comment (atomic with counter)
-- ============================================
create or replace function public.delete_comment(p_comment_id text, p_user_id text)
returns void as $$
declare
  v_post_id text;
begin
  select post_id into v_post_id from public.feed_comments
  where id = p_comment_id and user_id = p_user_id;

  if v_post_id is not null then
    delete from public.feed_comments where id = p_comment_id;
    update public.feed_posts set comments_count = greatest(comments_count - 1, 0) where id = v_post_id;
  end if;
end;
$$ language plpgsql security definer;

-- ============================================
-- Update profiles RLS: allow all authenticated to read
-- (Drop existing select policy first if needed)
-- ============================================
-- DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
create policy "Authenticated users can read all profiles"
  on public.profiles for select
  using (auth.role() = 'authenticated');

-- ============================================
-- Storage: create bucket 'feed-photos' (run in dashboard or via API)
-- Bucket should be PUBLIC with these policies:
-- INSERT: (bucket_id = 'feed-photos') AND (auth.uid()::text = (storage.foldername(name))[1])
-- SELECT: bucket_id = 'feed-photos'
-- DELETE: (bucket_id = 'feed-photos') AND (auth.uid()::text = (storage.foldername(name))[1])
-- ============================================
