-- Seed the first administrator so someone can log in and register everyone else.
insert into admins (username, name, email, role, status)
values ('omotara00', 'Omotara', null, 'administrator', 'active')
on conflict (username_lower) do nothing;
