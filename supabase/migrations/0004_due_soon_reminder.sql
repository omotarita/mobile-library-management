-- Tracks whether the "due tomorrow" reminder has been sent for a borrow,
-- alongside the existing overdue_email_1_sent / overdue_email_7_sent flags.
alter table borrow_records
  add column due_soon_email_sent boolean not null default false;
