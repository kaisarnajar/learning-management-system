DO $$
BEGIN
  -- a comment that only mentions the marker word: safety
  EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I', 'Enrollment', 'Enrollment_userId_fkey');
END $$;
