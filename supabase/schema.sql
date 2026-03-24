-- ============================================
-- VALERE APP - Supabase Schema (RESET SCRIPT)
-- ============================================

-- 0. LIMPAR TUDO (Para evitar erro de tipo text = uuid)
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
drop table if exists public.strava_auth;
drop table if exists public.peso_historico;
drop table if exists public.alimentos_custom;
drop table if exists public.perfil_corporal;
drop table if exists public.dieta_metas;
drop table if exists public.dieta_diarios;
drop table if exists public.exercicios_custom;
drop table if exists public.treino_ativo;
drop table if exists public.historico;
drop table if exists public.sessoes;
drop table if exists public.profiles;

-- Habilitar extensão UUID
create extension if not exists "uuid-ossp";

-- ============================================
-- 1. PROFILES (users)
-- ============================================
create table public.profiles (
  id text primary key, -- Text para aceitar Firebase UIDs
  display_name text,
  photo_url text,
  email text,
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile" on public.profiles for select using (auth.uid()::text = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid()::text = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid()::text = id);

-- Trigger para criar profile automaticamente
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, photo_url, email)
  values (
    new.id::text,
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name'),
    new.raw_user_meta_data->>'avatar_url',
    new.email
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================
-- 2. SESSÕES DE TREINO
-- ============================================
create table public.sessoes (
  id text primary key,
  user_id text not null,
  nome text not null,
  tipo text not null default 'musculacao',
  dia_semana text,
  exercicios jsonb not null default '[]'::jsonb,
  corrida jsonb,
  natacao jsonb,
  criado_em timestamptz default now(),
  posicao integer,
  created_at timestamptz default now()
);

alter table public.sessoes enable row level security;
create policy "Users can CRUD own sessoes" on public.sessoes for all using (auth.uid()::text = user_id) with check (auth.uid()::text = user_id);
create index idx_sessoes_user_id on public.sessoes(user_id);

-- ============================================
-- 3. HISTÓRICO DE TREINOS
-- ============================================
create table public.historico (
  id text primary key,
  user_id text not null,
  sessao_id text not null,
  nome text not null,
  tipo text not null default 'musculacao',
  exercicios jsonb not null default '[]'::jsonb,
  corrida jsonb,
  natacao jsonb,
  concluido_em timestamptz not null default now(),
  duracao_total_segundos integer,
  xp_earned integer default 0,
  strava_data jsonb,
  created_at timestamptz default now()
);

alter table public.historico enable row level security;
create policy "Users can CRUD own historico" on public.historico for all using (auth.uid()::text = user_id) with check (auth.uid()::text = user_id);
-- Leitura pública restrita: apenas autenticados podem ler (necessário para feed de treinos compartilhados)
create policy "Authenticated can read historico" on public.historico for select using (auth.role() = 'authenticated');
create index idx_historico_user_id on public.historico(user_id);

-- ============================================
-- 4. TREINO ATIVO
-- ============================================
create table public.treino_ativo (
  user_id text primary key,
  sessao_id text not null,
  iniciado_em bigint not null,
  pausado_em bigint,
  tempo_pausado_total bigint default 0,
  distance_km double precision default 0,
  coordinates jsonb default '[]'::jsonb,
  updated_at timestamptz default now()
);

alter table public.treino_ativo enable row level security;
create policy "Users can CRUD own treino_ativo" on public.treino_ativo for all using (auth.uid()::text = user_id) with check (auth.uid()::text = user_id);

-- ============================================
-- 5. EXERCÍCIOS CUSTOM
-- ============================================
create table public.exercicios_custom (
  id text primary key,
  user_id text not null,
  nome text not null,
  grupo_muscular text not null,
  musculos_secundarios text,
  descricao text,
  equipamento text,
  gif_url text,
  is_custom boolean default true,
  created_at timestamptz default now()
);

alter table public.exercicios_custom enable row level security;
create policy "Users can CRUD own exercicios_custom" on public.exercicios_custom for all using (auth.uid()::text = user_id) with check (auth.uid()::text = user_id);

-- ============================================
-- 6. DIÁRIOS DE DIETA
-- ============================================
create table public.dieta_diarios (
  id text not null,
  user_id text not null,
  data text not null,
  refeicoes jsonb not null default '[]'::jsonb,
  agua_ml integer default 0,
  meta_calorias integer default 2000,
  meta_proteinas integer default 150,
  meta_carboidratos integer default 250,
  meta_gorduras integer default 65,
  updated_at timestamptz default now(),
  primary key (id, user_id)
);

alter table public.dieta_diarios enable row level security;
create policy "Users can CRUD own dieta_diarios" on public.dieta_diarios for all using (auth.uid()::text = user_id) with check (auth.uid()::text = user_id);

-- ============================================
-- 7. METAS DE DIETA
-- ============================================
create table public.dieta_metas (
  user_id text primary key,
  calorias integer default 2000,
  proteinas integer default 150,
  carboidratos integer default 250,
  gorduras integer default 65,
  agua integer default 2500,
  updated_at timestamptz default now()
);

alter table public.dieta_metas enable row level security;
create policy "Users can CRUD own dieta_metas" on public.dieta_metas for all using (auth.uid()::text = user_id) with check (auth.uid()::text = user_id);

-- ============================================
-- 8. PERFIL CORPORAL
-- ============================================
create table public.perfil_corporal (
  user_id text primary key,
  sexo text,
  idade integer,
  peso double precision,
  altura double precision,
  gordura_corporal double precision,
  nivel_atividade text,
  faz_musculacao boolean default false,
  musculacao_dias integer default 0,
  musculacao_duracao integer default 0,
  musculacao_intensidade text,
  faz_cardio boolean default false,
  cardio_dias integer default 0,
  cardio_duracao integer default 0,
  cardio_intensidade text,
  objetivo text,
  meta_semanal double precision,
  proteina_g_kg double precision default 2.0,
  gordura_g_kg double precision default 0.8,
  updated_at timestamptz default now()
);

alter table public.perfil_corporal enable row level security;
create policy "Users can CRUD own perfil_corporal" on public.perfil_corporal for all using (auth.uid()::text = user_id) with check (auth.uid()::text = user_id);

-- ============================================
-- 9. ALIMENTOS CUSTOM
-- ============================================
create table public.alimentos_custom (
  id text not null,
  user_id text not null,
  nome text not null,
  marca text,
  porcao double precision not null default 100,
  unidade text not null default 'g',
  calorias double precision not null default 0,
  proteinas double precision not null default 0,
  carboidratos double precision not null default 0,
  gorduras double precision not null default 0,
  is_custom boolean default true,
  created_at timestamptz default now(),
  primary key (id, user_id)
);

alter table public.alimentos_custom enable row level security;
create policy "Users can CRUD own alimentos_custom" on public.alimentos_custom for all using (auth.uid()::text = user_id) with check (auth.uid()::text = user_id);

-- ============================================
-- 10. HISTÓRICO DE PESO
-- ============================================
create table public.peso_historico (
  id text not null,
  user_id text not null,
  data text not null,
  peso double precision not null,
  created_at timestamptz default now(),
  primary key (id, user_id)
);

alter table public.peso_historico enable row level security;
create policy "Users can CRUD own peso_historico" on public.peso_historico for all using (auth.uid()::text = user_id) with check (auth.uid()::text = user_id);

-- ============================================
-- 11. INTEGRAÇÃO STRAVA
-- ============================================
create table public.strava_auth (
  user_id text primary key,
  access_token text not null,
  refresh_token text not null,
  expires_at bigint not null,
  athlete_id bigint,
  updated_at timestamptz default now()
);

alter table public.strava_auth enable row level security;
create policy "Users can CRUD own strava_auth" on public.strava_auth for all using (auth.uid()::text = user_id) with check (auth.uid()::text = user_id);

-- ============================================
-- Storage Bucket para avatares
-- ============================================
-- Execute no Supabase Dashboard > Storage:
-- 1. Criar bucket "avatars" (público)
-- 2. Policy: authenticated users can upload to their own folder
-- INSERT policy: (bucket_id = 'avatars') AND (auth.uid()::text = (storage.foldername(name))[1])
-- SELECT policy: bucket_id = 'avatars' (público)
-- UPDATE policy: (bucket_id = 'avatars') AND (auth.uid()::text = (storage.foldername(name))[1])
-- DELETE policy: (bucket_id = 'avatars') AND (auth.uid()::text = (storage.foldername(name))[1])
