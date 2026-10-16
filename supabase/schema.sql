-- Indie Arcade shared leaderboard. Paste into Supabase → SQL Editor → Run.
-- Players sign in anonymously (Authentication → Sign In / Providers → "Allow anonymous sign-ins" ON),
-- so every browser gets its own auth.uid() and can only write its own rows.

create table if not exists public.scores (
  player_id  uuid not null default auth.uid() references auth.users on delete cascade,
  game_id    text not null check (game_id ~ '^[a-z0-9-]{1,24}$'),
  nickname   text not null check (char_length(nickname) between 1 and 16),
  best       double precision,
  plays      integer not null default 0 check (plays >= 0),
  updated_at timestamptz not null default now(),
  primary key (player_id, game_id)
);

create index if not exists scores_game_best on public.scores (game_id, best);

alter table public.scores enable row level security;

drop policy if exists "anyone can read the leaderboard" on public.scores;
create policy "anyone can read the leaderboard" on public.scores
  for select using (true);

drop policy if exists "players insert their own rows" on public.scores;
create policy "players insert their own rows" on public.scores
  for insert to authenticated with check (player_id = auth.uid());

drop policy if exists "players update their own rows" on public.scores;
create policy "players update their own rows" on public.scores
  for update to authenticated using (player_id = auth.uid()) with check (player_id = auth.uid());

-- No delete policy: rows can't be deleted from the site.
grant select on public.scores to anon, authenticated;
grant insert, update on public.scores to authenticated;
