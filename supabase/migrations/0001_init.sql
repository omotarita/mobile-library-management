-- Mobile Library Management System — initial schema
--
-- Security model: this app has no passwords and does not use Supabase Auth.
-- It is used in person by 1-3 trusted volunteers/admins at a time. Access
-- control (who can see/do what) is enforced in the React app layer, not in
-- the database. Row Level Security is intentionally left disabled on every
-- table below so the anon key (used by the app) can read/write freely.
-- Do not put this project's anon key in a context where untrusted users
-- could discover it and call the Supabase REST API directly.

create extension if not exists pgcrypto;

create table admins (
  id uuid primary key default gen_random_uuid(),
  username text not null,
  username_lower text generated always as (lower(username)) stored,
  name text not null,
  email text,
  role text not null check (role in ('administrator', 'volunteer')),
  created_at timestamptz not null default now(),
  last_login timestamptz,
  status text not null default 'active' check (status in ('active', 'inactive'))
);
create unique index admins_username_lower_key on admins (username_lower);

create table members (
  id uuid primary key default gen_random_uuid(),
  username text not null,
  username_lower text generated always as (lower(username)) stored,
  name text not null,
  age integer not null check (age between 4 and 11),
  school text not null,
  trusted_adult_name text not null,
  trusted_adult_email text not null,
  created_at timestamptz not null default now(),
  registered_by uuid references admins(id)
);
create unique index members_username_lower_key on members (username_lower);

create table books (
  id uuid primary key default gen_random_uuid(),
  unique_code text not null,
  unique_code_lower text generated always as (lower(unique_code)) stored,
  title text not null,
  author text not null,
  min_age integer not null check (min_age between 4 and 11),
  max_age integer not null check (max_age between 4 and 11),
  donor text,
  status text not null default 'available' check (status in ('available', 'borrowed', 'lost', 'damaged')),
  added_at timestamptz not null default now(),
  added_by uuid references admins(id),
  check (max_age >= min_age)
);
create unique index books_unique_code_lower_key on books (unique_code_lower);
create index books_status_idx on books (status);

create table borrow_records (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references books(id),
  member_id uuid not null references members(id),
  borrowed_at timestamptz not null default now(),
  due_date timestamptz not null,
  returned_at timestamptz,
  processed_by uuid references admins(id),
  returned_by uuid references admins(id),
  overdue_email_1_sent boolean not null default false,
  overdue_email_7_sent boolean not null default false,
  override_used boolean not null default false
);
create index borrow_records_member_idx on borrow_records (member_id);
create index borrow_records_book_idx on borrow_records (book_id);
-- Fast lookup of a member's/book's currently-active (unreturned) borrow.
create index borrow_records_active_idx on borrow_records (member_id, book_id) where returned_at is null;
create index borrow_records_overdue_idx on borrow_records (due_date) where returned_at is null;

create table audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references admins(id),
  action text not null check (action in (
    'BORROW', 'RETURN', 'REGISTER_MEMBER', 'ADD_BOOK', 'EDIT_BOOK',
    'MARK_LOST', 'MARK_DAMAGED', 'OVERRIDE_BORROW_BLOCK', 'REGISTER_ADMIN'
  )),
  target_type text not null check (target_type in ('book', 'member', 'admin')),
  target_id uuid,
  details jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_created_at_idx on audit_log (created_at desc);
