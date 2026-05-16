create table if not exists public.sticky_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  content text not null default '',
  color text not null default '#fef08a',
  position_x numeric not null default 0,
  position_y numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.sticky_notes enable row level security;

drop policy if exists "Users can view their own sticky notes" on public.sticky_notes;
create policy "Users can view their own sticky notes"
on public.sticky_notes
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can create their own sticky notes" on public.sticky_notes;
create policy "Users can create their own sticky notes"
on public.sticky_notes
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own sticky notes" on public.sticky_notes;
create policy "Users can update their own sticky notes"
on public.sticky_notes
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own sticky notes" on public.sticky_notes;
create policy "Users can delete their own sticky notes"
on public.sticky_notes
for delete
to authenticated
using (auth.uid() = user_id);

create index if not exists idx_sticky_notes_user_updated
on public.sticky_notes(user_id, updated_at desc);

drop trigger if exists update_sticky_notes_updated_at on public.sticky_notes;
create trigger update_sticky_notes_updated_at
before update on public.sticky_notes
for each row
execute function public.update_updated_at_column();