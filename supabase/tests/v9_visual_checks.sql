-- =============================================================================
-- Design V9 gói 6 · Quyền trên dữ liệu Kanji trực quan (radicals, kanji_visuals, kanji_similar_pairs).
-- Nội dung: người đăng nhập chỉ đọc, chỉ seed (service role) ghi; anon không có quyền. Không ghi gì vào database.
-- =============================================================================
select t as bang,
       case when has_table_privilege('authenticated', 'public.' || t, 'select') then 'PASS' else 'FAIL' end as doc_duoc,
       case when not has_table_privilege('authenticated', 'public.' || t, 'insert')
             and not has_table_privilege('authenticated', 'public.' || t, 'update')
             and not has_table_privilege('authenticated', 'public.' || t, 'delete') then 'PASS' else 'FAIL' end as khong_ghi_duoc,
       case when not has_table_privilege('anon', 'public.' || t, 'select') then 'PASS' else 'FAIL' end as anon_khong_doc,
       case when (select relrowsecurity from pg_class where oid = ('public.' || t)::regclass) then 'PASS' else 'FAIL' end as bat_rls
  from unnest(array['radicals', 'kanji_visuals', 'kanji_similar_pairs']) as t;
