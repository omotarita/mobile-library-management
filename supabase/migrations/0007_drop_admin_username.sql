-- Staff no longer log in by username (real email + password via Supabase
-- Auth, see 0006_rls_lockdown.sql) and nothing in the app reads or displays
-- admins.username anymore. Dropping it — CASCADE also removes the
-- generated username_lower column and its unique index, which existed only
-- to support the old username lookup.
alter table admins drop column username cascade;
