-- Anatomical Hebrew for exercise names and steps already stored in public.exercises.
-- The function exists only for this update and is dropped in the same transaction.

create or replace function public.he_gloss(s text) returns text
language plpgsql immutable as $$
declare
  src text[] := array[
    'היד הקדמית (ביצפס)', 'ביצפס', 'יד אחורית', 'ירך קדמית', 'ירך אחורית',
    'חתירת רנגייד', 'דדליפט', 'סקוואט', 'לאנג''', 'קראנץ''', 'פולאובר',
    '(SMR)', 'SMR', 'דו ראשי', 'תלת ראשי'
  ];
  dst text[] := array[
    'הדו-ראשי', 'דו-ראשי', 'תלת-ראשי', 'ארבע-ראשי', 'מיתר הברך',
    'חתירת קרש', 'הרמה מהרצפה', 'כריעה', 'מכרע', 'כפיפת בטן', 'משיכה מעבר לראש',
    '(שחרור עצמי)', 'שחרור עצמי', 'דו-ראשי', 'תלת-ראשי'
  ];
  i int;
begin
  if s is null then return null; end if;
  for i in 1..array_length(src, 1) loop
    s := replace(s, src[i], dst[i]);
  end loop;
  -- Adjectives that agreed with the old loanword. The lookahead leaves an already-fixed phrase alone.
  s := regexp_replace(s, 'כריעה מלא(?!ה)', 'כריעה מלאה', 'g');
  s := regexp_replace(s, 'כריעה צידי(?!ת)', 'כריעה צידית', 'g');
  s := regexp_replace(s, 'כריעה קדמי(?!ת)', 'כריעה קדמית', 'g');
  s := regexp_replace(s, 'כפיפת בטן אלכסוני(?!ת)', 'כפיפת בטן אלכסונית', 'g');
  s := regexp_replace(s, 'כפיפת בטן הפוך(?!ה)', 'כפיפת בטן הפוכה', 'g');
  return s;
end $$;

update public.exercises
set name_he = public.he_gloss(name_he),
    steps_he = case
      when steps_he is null then null
      else (
        select coalesce(array_agg(public.he_gloss(step) order by ord), '{}')
        from unnest(steps_he) with ordinality as u(step, ord)
      )
    end
where name_he is not null or steps_he is not null;

drop function public.he_gloss(text);
