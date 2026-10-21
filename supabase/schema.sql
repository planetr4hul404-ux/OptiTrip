create table if not exists queries (
  id uuid primary key default gen_random_uuid(),
  pickup_lat double precision not null,
  pickup_lng double precision not null,
  dest_lat double precision not null,
  dest_lng double precision not null,
  pickup_label text,
  dest_label text,
  priority text not null check (priority in ('cheapest','fastest','reliable','balanced')),
  created_at timestamptz not null default now()
);

create table if not exists recommendations (
  id uuid primary key default gen_random_uuid(),
  query_id uuid not null references queries(id) on delete cascade,
  mode text not null check (mode in ('walk','auto','cab','bus')),
  price numeric not null,
  time_min numeric not null,
  wait_min numeric,
  availability_score numeric not null,
  final_score numeric not null,
  rank int not null
);

alter table queries enable row level security;
alter table recommendations enable row level security;

create policy "anon insert queries" on queries for insert to anon with check (true);
create policy "anon select queries" on queries for select to anon using (true);
create policy "anon insert recs" on recommendations for insert to anon with check (true);
create policy "anon select recs" on recommendations for select to anon using (true);
