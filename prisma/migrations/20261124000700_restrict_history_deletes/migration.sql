-- Book order lines, fee-waiver requests and per-student attendance and grade
-- records are history: they must not vanish when a book, course, user or
-- enrollment row is deleted. The app already refuses those deletes (book
-- delete, course delete and enrollment removal check first), but that check
-- is not atomic. Swap ON DELETE CASCADE for ON DELETE RESTRICT, the same
-- guarded, re-runnable swap as 20261103000700_soft_delete_and_restrict.
-- No row changes; existing rows already satisfy every reference.
DO $$
DECLARE
  fk RECORD;
BEGIN
  FOR fk IN
    SELECT * FROM (VALUES
      ('BookOrderItem',          'BookOrderItem_bookId_fkey',                'bookId',       'Book',       'id'),
      ('CouponRequest',          'CouponRequest_userId_fkey',                'userId',       'User',       'id'),
      ('CouponRequest',          'CouponRequest_courseId_fkey',              'courseId',     'Course',     'id'),
      ('CourseAttendanceRecord', 'CourseAttendanceRecord_enrollmentId_fkey', 'enrollmentId', 'Enrollment', 'id'),
      ('CourseGradeRecord',      'CourseGradeRecord_enrollmentId_fkey',      'enrollmentId', 'Enrollment', 'id')
    ) AS t(tbl, con, col, ref_tbl, ref_col)
  LOOP
    -- Skip when the constraint already restricts (re-run safety).
    IF EXISTS (
      SELECT 1 FROM pg_constraint c
      WHERE c.conname = fk.con AND c.confdeltype = 'r'
    ) THEN
      CONTINUE;
    END IF;

    -- safety: allow the constraint is re-added straight away with ON DELETE RESTRICT
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I', fk.tbl, fk.con);
    EXECUTE format(
      'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES %I(%I) ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID',
      fk.tbl, fk.con, fk.col, fk.ref_tbl, fk.ref_col
    );
    EXECUTE format('ALTER TABLE %I VALIDATE CONSTRAINT %I', fk.tbl, fk.con);
  END LOOP;
END $$;
