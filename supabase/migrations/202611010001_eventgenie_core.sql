create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 120),
  event_type text not null,
  event_date date not null,
  location text not null default '',
  guest_count integer not null check (guest_count between 1 and 100000),
  currency text not null default 'INR' check (char_length(currency) = 3),
  theme text not null default '',
  preferences text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.event_members (
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'viewer' check (role in ('owner', 'editor', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null unique references public.events (id) on delete cascade,
  total_amount numeric(14, 2) not null default 0 check (total_amount >= 0),
  currency text not null default 'INR' check (char_length(currency) = 3),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.budget_categories (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  allocated_amount numeric(14, 2) not null default 0 check (allocated_amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, name)
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  category_id uuid references public.budget_categories (id) on delete set null,
  description text not null check (char_length(description) between 1 and 240),
  amount numeric(14, 2) not null check (amount >= 0),
  expense_date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  description text not null default '',
  due_date date,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed')),
  assigned_to text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.vendors (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 160),
  category text not null,
  contact_email text not null default '',
  contact_phone text not null default '',
  estimated_cost numeric(14, 2) not null default 0 check (estimated_cost >= 0),
  quoted_cost numeric(14, 2) check (quoted_cost is null or quoted_cost >= 0),
  final_cost numeric(14, 2) check (final_cost is null or final_cost >= 0),
  booking_status text not null default 'unconfirmed'
    check (booking_status in ('unconfirmed', 'inquiry', 'booked', 'cancelled')),
  payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'partial', 'paid')),
  contract_information text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, event_id)
);

create table public.vendor_quotes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  vendor_id uuid not null,
  amount numeric(14, 2) not null check (amount >= 0),
  details text not null default '',
  received_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  foreign key (vendor_id, event_id)
    references public.vendors (id, event_id) on delete cascade
);

create table public.guests (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 160),
  email text not null default '',
  phone text not null default '',
  rsvp_status text not null default 'pending'
    check (rsvp_status in ('pending', 'invited', 'confirmed', 'declined')),
  guest_count integer not null default 1 check (guest_count between 1 and 100),
  dietary_preferences text not null default '',
  seating_information text not null default '',
  accessibility_requirements text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.event_ideas (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  category text not null,
  title text not null,
  content text not null,
  is_saved boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  title text not null,
  remind_at timestamptz not null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'Event planning chat',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.conversation_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'tool')),
  content text not null,
  tool_name text,
  created_at timestamptz not null default now()
);

create table public.action_logs (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

create table public.event_documents (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  file_name text not null,
  storage_path text not null,
  content_type text not null,
  created_at timestamptz not null default now()
);

create table public.api_rate_limits (
  user_id uuid not null references auth.users (id) on delete cascade,
  bucket_start timestamptz not null,
  request_count integer not null check (request_count > 0),
  primary key (user_id, bucket_start)
);

create index events_owner_date_idx on public.events (owner_id, event_date);
create index event_members_user_idx on public.event_members (user_id, event_id);
create index expenses_event_date_idx on public.expenses (event_id, expense_date);
create index tasks_event_status_due_idx on public.tasks (event_id, status, due_date);
create index vendors_event_category_idx on public.vendors (event_id, category);
create index guests_event_rsvp_idx on public.guests (event_id, rsvp_status);
create index conversations_user_updated_idx on public.conversations (user_id, updated_at desc);
create index conversation_messages_conversation_date_idx
  on public.conversation_messages (conversation_id, created_at);
create index action_logs_event_date_idx on public.action_logs (event_id, created_at desc);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.can_access_event(target_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.events
    where id = target_event_id and owner_id = auth.uid()
  ) or exists (
    select 1 from public.event_members
    where event_id = target_event_id and user_id = auth.uid()
  );
$$;

create or replace function public.can_edit_event(target_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.events
    where id = target_event_id and owner_id = auth.uid()
  ) or exists (
    select 1 from public.event_members
    where event_id = target_event_id
      and user_id = auth.uid()
      and role in ('owner', 'editor')
  );
$$;

create or replace function public.is_event_owner(target_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.events
    where id = target_event_id and owner_id = auth.uid()
  );
$$;

revoke all on function public.can_access_event(uuid) from public;
grant execute on function public.can_access_event(uuid) to authenticated;
revoke all on function public.can_edit_event(uuid) from public;
grant execute on function public.can_edit_event(uuid) to authenticated;
revoke all on function public.is_event_owner(uuid) from public;
grant execute on function public.is_event_owner(uuid) to authenticated;

create or replace function public.create_event_with_budget(
  p_name text,
  p_event_type text,
  p_event_date date,
  p_location text,
  p_guest_count integer,
  p_currency text,
  p_theme text,
  p_preferences text,
  p_total_budget numeric
)
returns uuid
language plpgsql
set search_path = public, pg_temp
as $$
declare
  created_event_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  insert into public.events (
    owner_id, name, event_type, event_date, location,
    guest_count, currency, theme, preferences
  ) values (
    auth.uid(), p_name, p_event_type, p_event_date, p_location,
    p_guest_count, p_currency, p_theme, p_preferences
  )
  returning id into created_event_id;

  insert into public.budgets (event_id, total_amount, currency)
  values (created_event_id, p_total_budget, p_currency);

  return created_event_id;
end;
$$;

revoke all on function public.create_event_with_budget(
  text, text, date, text, integer, text, text, text, numeric
) from public, anon;
grant execute on function public.create_event_with_budget(
  text, text, date, text, integer, text, text, text, numeric
) to authenticated;

create or replace function public.consume_assistant_rate_limit()
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_bucket timestamptz;
  current_count integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  current_bucket := date_trunc('minute', now());
  delete from public.api_rate_limits
  where user_id = auth.uid()
    and bucket_start < current_bucket - interval '1 day';

  insert into public.api_rate_limits (user_id, bucket_start, request_count)
  values (auth.uid(), current_bucket, 1)
  on conflict (user_id, bucket_start)
  do update set request_count = api_rate_limits.request_count + 1
  returning request_count into current_count;

  return current_count <= 20;
end;
$$;

revoke all on function public.consume_assistant_rate_limit() from public, anon;
grant execute on function public.consume_assistant_rate_limit() to authenticated;
revoke all on public.api_rate_limits from public, anon, authenticated;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.prevent_event_owner_change()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.owner_id is distinct from old.owner_id then
    raise exception 'Event ownership cannot be changed';
  end if;
  return new;
end;
$$;

create or replace function public.log_event_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  record_data jsonb;
  target_event_id uuid;
  target_entity_id uuid;
  actor_id uuid := auth.uid();
begin
  if actor_id is null then
    return new;
  end if;

  record_data := to_jsonb(new);

  if tg_table_name = 'events' then
    target_event_id := (record_data ->> 'id')::uuid;
  else
    target_event_id := (record_data ->> 'event_id')::uuid;
  end if;
  target_entity_id := (record_data ->> 'id')::uuid;

  insert into public.action_logs (event_id, user_id, action, entity_type, entity_id)
  values (target_event_id, actor_id, lower(tg_op), tg_table_name, target_entity_id);

  return new;
end;
$$;

create trigger prevent_event_owner_change
  before update on public.events
  for each row execute function public.prevent_event_owner_change();

do $$
declare
  timestamped_table text;
begin
  foreach timestamped_table in array array[
    'profiles', 'events', 'budgets', 'budget_categories', 'expenses', 'tasks',
    'vendors', 'guests', 'event_ideas', 'reminders', 'conversations'
  ] loop
    execute format(
      'create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      timestamped_table
    );
  end loop;
end;
$$;

do $$
declare
  audited_table text;
begin
  foreach audited_table in array array[
    'events', 'budgets', 'budget_categories', 'expenses', 'tasks',
    'vendors', 'vendor_quotes', 'guests', 'event_ideas', 'reminders'
  ] loop
    execute format(
      'create trigger log_change after insert or update on public.%I for each row execute function public.log_event_change()',
      audited_table
    );
  end loop;
end;
$$;

alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.event_members enable row level security;
alter table public.budgets enable row level security;
alter table public.budget_categories enable row level security;
alter table public.expenses enable row level security;
alter table public.tasks enable row level security;
alter table public.vendors enable row level security;
alter table public.vendor_quotes enable row level security;
alter table public.guests enable row level security;
alter table public.event_ideas enable row level security;
alter table public.reminders enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_messages enable row level security;
alter table public.action_logs enable row level security;
alter table public.event_documents enable row level security;

create policy "Profiles are private to their owner"
  on public.profiles for all
  using (id = auth.uid()) with check (id = auth.uid());

create policy "Members can view and owners can change membership"
  on public.event_members for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.events e
      where e.id = event_id and e.owner_id = auth.uid()
    )
  );
create policy "Owners can manage event membership"
  on public.event_members for all
  using (
    exists (
      select 1 from public.events e
      where e.id = event_id and e.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.events e
      where e.id = event_id and e.owner_id = auth.uid()
    )
  );

create policy "Event members can view events"
  on public.events for select
  using (public.can_access_event(id));
create policy "Users can create owned events"
  on public.events for insert
  with check (owner_id = auth.uid());
create policy "Event editors can update events"
  on public.events for update
  using (public.can_edit_event(id))
  with check (public.can_edit_event(id));
create policy "Only the event owner can delete events"
  on public.events for delete
  using (public.is_event_owner(id));

do $$
declare
  scoped_table text;
begin
  foreach scoped_table in array array[
    'budgets', 'budget_categories', 'expenses', 'tasks', 'vendors',
    'vendor_quotes', 'guests', 'event_ideas', 'reminders', 'event_documents'
  ] loop
    execute format(
      'create policy %I on public.%I for select using (public.can_access_event(event_id))',
      'Event members can read ' || scoped_table,
      scoped_table
    );
    execute format(
      'create policy %I on public.%I for insert with check (public.can_edit_event(event_id))',
      'Event editors can create ' || scoped_table,
      scoped_table
    );
    execute format(
      'create policy %I on public.%I for update using (public.can_edit_event(event_id)) with check (public.can_edit_event(event_id))',
      'Event editors can update ' || scoped_table,
      scoped_table
    );
    execute format(
      'create policy %I on public.%I for delete using (public.can_edit_event(event_id))',
      'Event editors can delete ' || scoped_table,
      scoped_table
    );
  end loop;
end;
$$;

create policy "Event members can read action logs"
  on public.action_logs for select
  using (public.can_access_event(event_id));
create policy "Event editors can create their action logs"
  on public.action_logs for insert
  with check (public.can_edit_event(event_id) and user_id = auth.uid());

create policy "Users access their event conversations"
  on public.conversations for all
  using (
    user_id = auth.uid()
    and (event_id is null or public.can_access_event(event_id))
  )
  with check (
    user_id = auth.uid()
    and (event_id is null or public.can_access_event(event_id))
  );

create policy "Users access messages in their conversations"
  on public.conversation_messages for all
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  );
