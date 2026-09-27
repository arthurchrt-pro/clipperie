-- Clipperie : schéma initial
-- À coller dans Supabase → SQL Editor → New query, puis « Run ».

-- 1. Profils : un par compte, créé automatiquement (voir le déclencheur plus bas).
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  stripe_customer_id text unique,
  created_at timestamptz not null default now()
);

-- 2. Abonnements : copie de l'état Stripe, tenue à jour par le webhook.
create table public.subscriptions (
  id text primary key, -- identifiant Stripe (sub_…)
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null, -- active, past_due, canceled…
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  checkout_session_id text unique, -- paiement d'origine
  access_claimed_at timestamptz, -- accès direct depuis la page « Merci », utilisable une seule fois
  updated_at timestamptz not null default now()
);
create index subscriptions_user_id_idx on public.subscriptions (user_id);

-- 3. Vidéos : les lives et vidéos à découper.
create table public.videos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  source_type text not null check (source_type in ('twitch', 'youtube', 'fichier')),
  source_url text,
  title text,
  duration_seconds integer check (duration_seconds >= 0),
  layout text not null default 'plein_ecran' check (layout in ('plein_ecran', 'facecam_jeu')),
  facecam_box jsonb, -- position de la webcam : { x, y, w, h } en proportions de l'image
  status text not null default 'en_attente' check (
    status in ('en_attente', 'telechargement', 'transcription', 'analyse', 'rendu', 'pret', 'erreur')
  ),
  error_message text,
  is_trial boolean not null default false,
  created_at timestamptz not null default now()
);
create index videos_user_id_created_at_idx on public.videos (user_id, created_at desc);

-- 4. Clips : les moments découpés dans chaque vidéo (une minute maximum).
create table public.clips (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.videos (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  start_seconds numeric(10, 3) not null check (start_seconds >= 0),
  end_seconds numeric(10, 3) not null,
  title text, -- accroche proposée
  transcript text, -- texte dit pendant le clip
  score smallint check (score between 0 and 100),
  file_path text, -- fichier du clip rendu (vide tant qu'il n'est pas prêt)
  unlocked boolean not null default true, -- false pour les clips verrouillés de l'essai
  created_at timestamptz not null default now(),
  check (end_seconds > start_seconds and end_seconds - start_seconds <= 60)
);
create index clips_video_id_idx on public.clips (video_id);
create index clips_user_id_idx on public.clips (user_id);

-- 5. Sécurité : chaque client ne lit que ses propres lignes ; seul le serveur écrit.
alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.videos enable row level security;
alter table public.clips enable row level security;

create policy "Lecture de son profil" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "Lecture de ses abonnements" on public.subscriptions
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Lecture de ses vidéos" on public.videos
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Lecture de ses clips" on public.clips
  for select to authenticated using ((select auth.uid()) = user_id);

grant select on public.profiles, public.subscriptions, public.videos, public.clips to authenticated;
grant all on public.profiles, public.subscriptions, public.videos, public.clips to service_role;

-- 6. Création automatique du profil à chaque nouveau compte.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, lower(new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
