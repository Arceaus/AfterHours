-- AFTERTHOUGHT: Row Level Security (RLS) Verification Test Suite
-- Run this in the Supabase SQL Editor to verify policy enforcement.

DO $$
DECLARE
    user_a UUID := '11111111-1111-1111-1111-111111111111';
    user_b UUID := '22222222-2222-2222-2222-222222222222';
    test_entry_id TEXT := 'test_entry_user_a';
    test_letter_id TEXT := 'test_letter_user_a';
    count_visible INT;
BEGIN
    RAISE NOTICE '=== TEST 1: Simulating User A inserting and viewing their own record ===';
    -- Set auth context to User A
    PERFORM set_config('request.jwt.claims', json_build_object('sub', user_a::text)::text, true);

    -- Clean up test records if present
    DELETE FROM public.entries WHERE id = test_entry_id;
    DELETE FROM public.future_letters WHERE id = test_letter_id;

    -- Insert as User A
    INSERT INTO public.entries (id, user_id, title, content, entry_date)
    VALUES (test_entry_id, user_a, 'User A Secret Thought', 'This belongs strictly to User A', '2026-10-30');

    INSERT INTO public.future_letters (id, user_id, title, content, scheduled_open_at, status)
    VALUES (test_letter_id, user_a, 'User A Letter', 'Future self note', '2027-01-01', 'sealed');

    -- Verify User A sees 1 entry and 1 letter
    SELECT COUNT(*) INTO count_visible FROM public.entries WHERE id = test_entry_id;
    ASSERT count_visible = 1, 'FAIL: User A should see their own entry';

    SELECT COUNT(*) INTO count_visible FROM public.future_letters WHERE id = test_letter_id;
    ASSERT count_visible = 1, 'FAIL: User A should see their own letter';

    RAISE NOTICE 'PASS: User A successfully created and viewed own records.';

    RAISE NOTICE '=== TEST 2: Simulating User B attempting to view User A records ===';
    -- Set auth context to User B
    PERFORM set_config('request.jwt.claims', json_build_object('sub', user_b::text)::text, true);

    -- User B tries to select User A's entry
    SELECT COUNT(*) INTO count_visible FROM public.entries WHERE id = test_entry_id;
    ASSERT count_visible = 0, 'SECURITY VIOLATION: User B saw User A entry!';

    SELECT COUNT(*) INTO count_visible FROM public.future_letters WHERE id = test_letter_id;
    ASSERT count_visible = 0, 'SECURITY VIOLATION: User B saw User A letter!';

    RAISE NOTICE 'PASS: User B cannot select User A records (returned 0 rows).';

    RAISE NOTICE '=== TEST 3: Simulating User B attempting to update or delete User A records ===';
    -- User B tries to update User A's record
    UPDATE public.entries SET content = 'Hacked by User B' WHERE id = test_entry_id;
    
    -- Switch back to User A to verify content was NOT modified
    PERFORM set_config('request.jwt.claims', json_build_object('sub', user_a::text)::text, true);
    SELECT COUNT(*) INTO count_visible FROM public.entries WHERE id = test_entry_id AND content = 'This belongs strictly to User A';
    ASSERT count_visible = 1, 'SECURITY VIOLATION: User B was able to modify User A content!';

    -- Switch back to User B and try to delete
    PERFORM set_config('request.jwt.claims', json_build_object('sub', user_b::text)::text, true);
    DELETE FROM public.entries WHERE id = test_entry_id;

    -- Switch back to User A to verify record still exists
    PERFORM set_config('request.jwt.claims', json_build_object('sub', user_a::text)::text, true);
    SELECT COUNT(*) INTO count_visible FROM public.entries WHERE id = test_entry_id;
    ASSERT count_visible = 1, 'SECURITY VIOLATION: User B was able to delete User A record!';

    RAISE NOTICE 'PASS: User B cannot update or delete User A records.';

    -- Clean up
    DELETE FROM public.entries WHERE id = test_entry_id;
    DELETE FROM public.future_letters WHERE id = test_letter_id;

    RAISE NOTICE '=== ALL RLS SECURITY TESTS PASSED SUCCESSFULLY ===';
END $$;
