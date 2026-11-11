-- =============================================================================
-- Design V9, gói 6: dữ liệu Kanji trực quan (R12). Nội dung, chỉ pnpm seed ghi; người đăng nhập chỉ đọc.
-- - kanji_visuals: số bộ thủ, cây thành phần (đủ mọi tầng, có vị trí), nét viết SVG theo thứ tự (KanjiVG, CC BY-SA 3.0).
-- - radicals: 214 bộ thủ Khang Hy, tên tiếng Việt chờ chủ dự án duyệt (approved).
-- - kanji_similar_pairs: cặp chữ gần giống + lời giải thích tự động; chỉ cặp approved mới dùng cho câu hỏi.
-- Chỉ thêm; chạy lại nhiều lần vẫn an toàn.
-- =============================================================================
create table if not exists public.radicals (
  number     smallint primary key check (number between 1 and 214),
  character  text not null,
  name_vi    text not null,
  approved   boolean not null default false
);
comment on table public.radicals is 'V9: 214 bộ thủ Khang Hy. name_vi do Claude soạn; chỉ hiện cho người học khi approved.';

create table if not exists public.kanji_visuals (
  kanji_id        uuid primary key references public.kanji (id) on delete cascade,
  radical_number  smallint references public.radicals (number),
  parts           jsonb not null default '[]'::jsonb,
  strokes         jsonb not null default '[]'::jsonb check (jsonb_typeof(strokes) = 'array'),
  source          text not null
);
comment on table public.kanji_visuals is 'V9 R12: bộ thủ, thành phần và nét viết của chữ, từ KanjiVG (Ulrich Apel, CC BY-SA 3.0).';

create table if not exists public.kanji_similar_pairs (
  kanji_a      uuid not null references public.kanji (id) on delete cascade,
  kanji_b      uuid not null references public.kanji (id) on delete cascade,
  score        real not null check (score between 0 and 1),
  explanation  text not null,
  approved     boolean not null default false,
  primary key (kanji_a, kanji_b),
  constraint kanji_similar_pairs_distinct check (kanji_a <> kanji_b)
);
comment on table public.kanji_similar_pairs is 'V9 R12 dạng E: cặp chữ gần giống do script đề xuất; chỉ cặp approved mới được hỏi.';

alter table public.radicals enable row level security;
alter table public.kanji_visuals enable row level security;
alter table public.kanji_similar_pairs enable row level security;

drop policy if exists "Authenticated users can read radicals" on public.radicals;
create policy "Authenticated users can read radicals" on public.radicals for select to authenticated using ( true );
drop policy if exists "Authenticated users can read kanji_visuals" on public.kanji_visuals;
create policy "Authenticated users can read kanji_visuals" on public.kanji_visuals for select to authenticated using ( true );
drop policy if exists "Authenticated users can read kanji_similar_pairs" on public.kanji_similar_pairs;
create policy "Authenticated users can read kanji_similar_pairs" on public.kanji_similar_pairs for select to authenticated using ( true );

revoke all on public.radicals, public.kanji_visuals, public.kanji_similar_pairs from anon;
revoke insert, update, delete, truncate on public.radicals, public.kanji_visuals, public.kanji_similar_pairs from authenticated;
grant select on public.radicals, public.kanji_visuals, public.kanji_similar_pairs to authenticated;
