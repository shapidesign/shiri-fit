import type { Metadata } from "next";
import { LegalDoc, enProse, heProse } from "@/components/legal-doc";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "מדיניות הפרטיות של Shiri Fit — איך נאספים נתוני אימון ונתוני Google Calendar.",
};

export default function PrivacyPage() {
  return (
    <LegalDoc title="מדיניות פרטיות" kicker="Shiri Fit · Privacy Policy" updated="עודכן 23 באוקטובר 2026">
      <article className={heProse}>
        <p>
          Shiri Fit היא אפליקציית אימונים פרטית. המדיניות הזו מתארת איזה מידע נשמר, למה, ועם מי. היא חלה על האתר והאפליקציה בכתובת shiri-fit.vercel.app.
        </p>

        <h2>למי האפליקציה</h2>
        <p>
          הכניסה מוגבלת לחשבונות Google שהמפעיל הזמין. חשבון שלא ברשימה מנותק מיד. האפליקציה לא מיועדת לילדים מתחת לגיל 16.
        </p>

        <h2>מה נאסף</h2>
        <ul>
          <li>חשבון Google: כתובת אימייל, שם, ומזהה החשבון — דרך ההתחברות של Supabase.</li>
          <li>פרופיל: שם תצוגה, מגדר, משקל, גובה, שנת לידה, ציוד, ימי אימון, מטרות, סגנון אימון, יעד דקות, והעדפת תזכורת.</li>
          <li>אימונים: תבניות, שיבוצים, תיעוד (משך, עצימות, הערכת קלוריות, תרגילים, הערות) ותיעוד התאוששות (הרגשה, מצב גוף, הערות).</li>
          <li>יומן Google: אסימון רענון (refresh token) כדי לחדש גישה, ומזהי אירועים שהאפליקציה יצרה.</li>
          <li>התראות: אם מפעילים תזכורות, נשמר מנוי Push של הדפדפן (כתובת endpoint ומפתחות).</li>
          <li>חיפוש תרגילים: טקסט החיפוש נשלח ל-MuscleWiki כשמחפשים תרגיל שלא קיים בספרייה המקומית.</li>
        </ul>

        <h2>נתוני Google</h2>
        <p>
          ההתחברות מבקשת את ההרשאה <span dir="ltr">https://www.googleapis.com/auth/calendar.events</span>. משתמשים בה רק כדי ליצור, לעדכן ולמחוק אירועי אימון ביומן הראשי, עבור אימונים ששיבצת או תיעדת, ורק אם סנכרון היומן דלוק. האפליקציה לא קוראת אירועים אחרים ביומן ולא משתמשת בנתוני Google לפרסום, למכירה, או לאימון מודלים.
        </p>
        <p>
          Shiri Fit&apos;s use and transfer of information received from Google APIs will adhere to the{" "}
          <a href="https://developers.google.com/terms/api-services-user-data-policy">Google API Services User Data Policy</a>, including the Limited Use requirements.
        </p>

        <h2>למה</h2>
        <p>
          כדי להציג את התוכנית, לחשב הערכת קלוריות, לשבץ אימונים ביומן, ולשלוח תזכורת לפני אימון אם ביקשת. המשקל משמש לחישוב הקלוריות. אין שימוש לפרסום ואין מכירת מידע.
        </p>

        <h2>עם מי זה נשמר</h2>
        <ul>
          <li>Supabase — התחברות ומסד הנתונים (אזור פרנקפורט). אסימון היומן נשמר בטבלה שרק שרת האפליקציה יכול לקרוא.</li>
          <li>Vercel — אירוח האפליקציה.</li>
          <li>Google — התחברות ויומן.</li>
          <li>MuscleWiki — חיפוש תרגילים, כשמחפשים.</li>
          <li>שירות ההתראות של הדפדפן (Apple או Google) — רק אם התזכורות דלוקות.</li>
        </ul>
        <p>מפעיל האפליקציה יכול לגשת לנתונים השמורים כדי להפעיל ולתחזק אותה, ולא לשום מטרה אחרת.</p>

        <h2>שמירה ומחיקה</h2>
        <p>
          הנתונים נשמרים כל עוד החשבון קיים. יציאה מהחשבון לא מוחקת אותם. כיבוי הסנכרון מפסיק כתיבה ליומן. ביטול הגישה של Shiri Fit בחשבון Google מפסיק את החיבור ליומן. מחיקת המשתמש מוחקת גם את הפרופיל, האימונים, אסימון היומן ומנוי ההתראות. אין במסך כפתור מחיקה — פונים למפעיל האפליקציה ומבקשים למחוק.
        </p>

        <h2>יצירת קשר</h2>
        <p>שאלות על הפרטיות: למפעיל Shiri Fit, האדם שהזמין את החשבון לאפליקציה.</p>
      </article>

      <article lang="en" dir="ltr" className={enProse}>
        <h2>English</h2>
        <p>
          Shiri Fit is a private workout app at shiri-fit.vercel.app. This policy describes what it stores and why.
        </p>
        <h2>Who can use it</h2>
        <p>
          Sign-in is limited to Google accounts the operator has invited. Any other account is signed out immediately. The app is not directed at children under 16.
        </p>
        <h2>Data we store</h2>
        <ul>
          <li>Google account email, name, and id, via Supabase Auth.</li>
          <li>Profile: display name, gender, weight, height, birth year, equipment, training days, goals, workout style, minute and calorie targets, and reminder timing.</li>
          <li>Workouts: templates, scheduled sessions, logs (duration, intensity, an estimated calorie figure, exercises, notes), and recovery notes (feeling, body state, notes).</li>
          <li>Google Calendar: a refresh token, and the ids of events the app created.</li>
          <li>Push subscription endpoint and keys, only if reminders are turned on.</li>
          <li>Exercise search text, sent to MuscleWiki when a search misses the local library.</li>
        </ul>
        <h2>Google user data</h2>
        <p>
          Sign-in requests the scope <span className="break-all">https://www.googleapis.com/auth/calendar.events</span>. Shiri Fit uses it only to create, update, and delete workout events on the primary calendar for sessions the user schedules or logs, and only while calendar sync is on. The app does not read other calendar events. Google user data is not sold, not used for advertising, and not used to train models.
        </p>
        <p>
          Shiri Fit&apos;s use and transfer of information received from Google APIs will adhere to the{" "}
          <a href="https://developers.google.com/terms/api-services-user-data-policy">Google API Services User Data Policy</a>, including the Limited Use requirements.
        </p>
        <h2>Why</h2>
        <p>To show the plan, estimate calories from weight, write workouts to the calendar, and send a reminder before a session when requested.</p>
        <h2>Processors</h2>
        <ul>
          <li>Supabase (authentication and database, Frankfurt). The calendar refresh token is stored in a table only the app server can read.</li>
          <li>Vercel (hosting).</li>
          <li>Google (sign-in and Calendar).</li>
          <li>MuscleWiki (exercise search, when used).</li>
          <li>The browser push service (Apple or Google), only if reminders are on.</li>
        </ul>
        <p>The person who operates the app can access stored data to run and maintain it, and for no other purpose.</p>
        <h2>Retention and deletion</h2>
        <p>
          Data is kept while the account exists. Signing out does not delete it. Turning off calendar sync stops new calendar writes. Revoking Shiri Fit in the Google Account stops calendar access. Deleting the user also deletes the profile, workouts, calendar token, and push subscription. There is no delete button in the app — ask the operator to delete the account.
        </p>
        <h2>Contact</h2>
        <p>Privacy questions: the person who operates Shiri Fit and invited the account.</p>
      </article>
    </LegalDoc>
  );
}
