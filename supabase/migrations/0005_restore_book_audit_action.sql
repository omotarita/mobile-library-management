-- Allow logging when a lost/damaged book is restored back to available.
alter table audit_log drop constraint if exists audit_log_action_check;
alter table audit_log add constraint audit_log_action_check check (action in (
  'BORROW', 'RETURN', 'REGISTER_MEMBER', 'ADD_BOOK', 'EDIT_BOOK',
  'MARK_LOST', 'MARK_DAMAGED', 'RESTORE_BOOK', 'OVERRIDE_BORROW_BLOCK', 'REGISTER_ADMIN'
));
