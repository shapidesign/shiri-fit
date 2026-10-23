# Shiri Fit

אפליקציית אימונים אישית (PWA, עברית/RTL) — תוכנית חודשית, תבניות אימון, ספריית תרגילים, תיעוד אימונים ו-recovery, קלוריות, דשבורד טבעות, סנכרון ל-Google Calendar ותזכורות Push.

Stack: Next.js 16 (App Router) · Tailwind v4 · Supabase (Auth, Postgres, pg_cron) · Vercel · web-push.

## הפעלה מקומית

```bash
npm i
cp .env.example .env.local   # ולמלא את הערכים (ראי למטה)
npm run dev
```

## הקמה פעם אחת

### 1. Supabase

1. פרויקט חדש ב-[supabase.com](https://supabase.com) בשם `shiri-fit` (region: eu-central / Frankfurt).
2. SQL Editor → להריץ לפי הסדר:
   - `supabase/migrations/20261023000000_init.sql` (טבלאות, RLS, trigger לפרופיל)
   - `supabase/migrations/20261023000001_cron.sql` (תזכורות כל 5 דק׳)
3. Project Settings → API: להעתיק `URL`, `anon key`, `service_role key` ל-`.env.local`.
4. Authentication → URL Configuration:
   - Site URL: כתובת ה-Vercel (למשל `https://shiri-fit.vercel.app`)
   - Redirect URLs: `https://shiri-fit.vercel.app/auth/callback`, `http://localhost:3000/auth/callback`

### 2. Google OAuth (התחברות + יומן)

1. [Google Cloud Console](https://console.cloud.google.com) → פרויקט חדש → APIs & Services → להפעיל **Google Calendar API**.
2. OAuth consent screen → External → **Publish to Production** (אחרת refresh tokens פגים אחרי 7 ימים). Scopes: `openid`, `email`, `profile`, `https://www.googleapis.com/auth/calendar.events`.
3. Credentials → OAuth Client ID (Web). Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`.
4. Supabase → Authentication → Providers → Google: להדביק Client ID + Secret.
5. אותם Client ID/Secret גם ב-`.env.local` (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`) — משמשים לרענון טוקן היומן בצד השרת.

### 3. משתני סביבה

ראי `.env.example`. בנוסף:

```bash
npx web-push generate-vapid-keys        # → NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY
openssl rand -hex 32                     # → CRON_SECRET
```

`ALLOWED_EMAILS` — רק המיילים האלה יוכלו להיכנס (אחרים מנותקים מיד).

### 4. סודות ל-pg_cron (אחרי הדפלוי הראשון)

ב-SQL Editor:

```sql
select vault.create_secret('https://shiri-fit.vercel.app', 'app_url');
select vault.create_secret('<CRON_SECRET>', 'cron_secret');
```

### 5. ספריית תרגילים

```bash
npx tsx --env-file=.env.local scripts/seed-exercises.ts
```

מזריע ~800 תרגילים מ-free-exercise-db (ציבורי, עם תמונות). אם `MUSCLEWIKI_API_KEY` תקף (דרוש TESTING tier ומעלה — BASIC מחזיר 403) יתווספו גם תרגילי MuscleWiki עם וידאו, וחיפוש בספרייה יוכל להשלים תרגילים חסרים לפי דרישה.

### 6. Vercel

```bash
npx vercel link
npx vercel env pull            # או להזין ידנית ב-Dashboard → Settings → Environment Variables
npx vercel --prod
```

כל המשתנים מ-`.env.example` צריכים להיות מוגדרים ב-Production.

### 7. התקנה על האייפון

Safari → לפתוח את הכתובת → שיתוף → **הוספה למסך הבית**. Push notifications ב-iOS עובדות רק מהאפליקציה המותקנת — להפעיל אותן מתוך הפרופיל → תזכורות.

## מבנה

- `app/(app)/` — מסכים מאחורי התחברות: בית, תוכנית (`/plan`), אימונים (`/workouts`), התקדמות (`/progress`), אימון חי (`/session`), פרופיל.
- `app/api/calendar` — upsert/delete אירועי Google Calendar. `app/api/reminders/tick` — נקרא מ-pg_cron, שולח Push.
- `components/` — sheets (תיעוד, שיבוץ, recovery, תרגיל), ספרייה, UI בסיסי.
- `lib/met.ts` — חישוב קלוריות (`MET × kg × hours`, ±20% לפי עצימות). בדיקה: `node --experimental-strip-types lib/met.test.ts`.
- `proxy.ts` — רענון session, allowlist מיילים, הפניות.

## אבטחה

- RLS על כל הטבלאות (`user_id = auth.uid()`); `google_tokens` נגישה רק עם service role.
- מפתחות MuscleWiki / Google / VAPID — בצד השרת בלבד. אם מפתח דלף, לסובב אותו.
