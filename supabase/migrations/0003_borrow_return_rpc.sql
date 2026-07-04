-- Borrow/return are implemented as database functions so the
-- check-then-write is a single atomic transaction, closing the race window
-- between "is this book available?" and "mark it borrowed" when two
-- volunteers process books at nearly the same moment.
--
-- Errors are raised as plain exceptions whose message is a short error code
-- (e.g. 'BOOK_NOT_FOUND'); the app matches on that code to show a friendly
-- message.

create or replace function borrow_book(
  p_unique_code text,
  p_member_id uuid,
  p_admin_id uuid,
  p_override boolean default false
)
returns borrow_records
language plpgsql
as $$
declare
  v_book books;
  v_member members;
  v_active_count integer;
  v_overdue_count integer;
  v_due_date timestamptz;
  v_record borrow_records;
begin
  select * into v_member from members where id = p_member_id;
  if not found then
    raise exception 'MEMBER_NOT_FOUND';
  end if;

  select * into v_book from books where unique_code_lower = lower(p_unique_code);
  if not found then
    raise exception 'BOOK_NOT_FOUND';
  end if;

  if v_book.status <> 'available' then
    raise exception 'BOOK_UNAVAILABLE';
  end if;

  if v_member.age < v_book.min_age or v_member.age > v_book.max_age then
    raise exception 'AGE_NOT_APPROPRIATE';
  end if;

  select count(*) into v_active_count
  from borrow_records
  where member_id = p_member_id and returned_at is null;

  if v_active_count >= 2 then
    raise exception 'MAX_BOOKS_REACHED';
  end if;

  select count(*) into v_overdue_count
  from borrow_records
  where member_id = p_member_id and returned_at is null and due_date < now();

  if v_overdue_count > 0 and not p_override then
    raise exception 'OVERDUE_BLOCK';
  end if;

  -- Atomic guard: only proceeds if the book is still 'available' at the
  -- moment of write, even if another request read it as available earlier.
  update books
  set status = 'borrowed'
  where id = v_book.id and status = 'available';

  if not found then
    raise exception 'BOOK_UNAVAILABLE';
  end if;

  v_due_date := now() + interval '7 days';

  insert into borrow_records (
    book_id, member_id, borrowed_at, due_date, processed_by, override_used
  ) values (
    v_book.id, p_member_id, now(), v_due_date, p_admin_id, v_overdue_count > 0 and p_override
  )
  returning * into v_record;

  insert into audit_log (admin_id, action, target_type, target_id, details)
  values (
    p_admin_id, 'BORROW', 'book', v_book.id,
    jsonb_build_object('member_id', p_member_id, 'borrow_record_id', v_record.id)
  );

  if v_overdue_count > 0 and p_override then
    insert into audit_log (admin_id, action, target_type, target_id, details)
    values (
      p_admin_id, 'OVERRIDE_BORROW_BLOCK', 'member', p_member_id,
      jsonb_build_object('borrow_record_id', v_record.id)
    );
  end if;

  return v_record;
end;
$$;

create or replace function return_book(
  p_borrow_record_id uuid,
  p_admin_id uuid
)
returns borrow_records
language plpgsql
as $$
declare
  v_record borrow_records;
begin
  update borrow_records
  set returned_at = now(), returned_by = p_admin_id
  where id = p_borrow_record_id and returned_at is null
  returning * into v_record;

  if not found then
    raise exception 'BORROW_RECORD_NOT_FOUND';
  end if;

  update books set status = 'available' where id = v_record.book_id;

  insert into audit_log (admin_id, action, target_type, target_id, details)
  values (
    p_admin_id, 'RETURN', 'book', v_record.book_id,
    jsonb_build_object('member_id', v_record.member_id, 'borrow_record_id', v_record.id)
  );

  return v_record;
end;
$$;
