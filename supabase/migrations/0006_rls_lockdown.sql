-- Locks the database behind real staff authentication (Supabase Auth).
-- Only a logged-in ("authenticated") session can read or write anything —
-- the public anon key alone now grants zero access to any table. Members
-- (children) never authenticate; only volunteers/admins do, and only they
-- can access member/book/borrow data, via the app acting on their behalf.

alter table admins
  add column auth_user_id uuid unique references auth.users(id);

alter table admins enable row level security;
alter table members enable row level security;
alter table books enable row level security;
alter table borrow_records enable row level security;
alter table audit_log enable row level security;

create policy "staff full access" on admins
  for all to authenticated using (true) with check (true);
create policy "staff full access" on members
  for all to authenticated using (true) with check (true);
create policy "staff full access" on books
  for all to authenticated using (true) with check (true);
create policy "staff full access" on borrow_records
  for all to authenticated using (true) with check (true);
create policy "staff full access" on audit_log
  for all to authenticated using (true) with check (true);

-- These functions run as the calling role (no SECURITY DEFINER), so they're
-- already subject to the RLS policies above. Restricting who can even call
-- them is just extra tidiness on top of that.
revoke execute on function borrow_book(text, uuid, uuid, boolean) from public;
revoke execute on function return_book(uuid, uuid) from public;
grant execute on function borrow_book(text, uuid, uuid, boolean) to authenticated;
grant execute on function return_book(uuid, uuid) to authenticated;
