import type { Metadata } from "next";
import Link from "next/link";
import { LegalDoc, enProse, heProse } from "@/components/legal-doc";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "תנאי השימוש של Shiri Fit.",
};

export default function TermsPage() {
  return (
    <LegalDoc title="תנאי שימוש" kicker="Shiri Fit · Terms of Service" updated="עודכן 23 באוקטובר 2026">
      <article className={heProse}>
        <p>
          תנאי השימוש האלה חלים על Shiri Fit בכתובת shiri-fit.vercel.app. כניסה לאפליקציה היא הסכמה לתנאים ול
          <Link href="/privacy">מדיניות הפרטיות</Link>.
        </p>

        <h2>מי יכול להיכנס</h2>
        <p>
          האפליקציה פרטית. נכנסים עם חשבון Google שהמפעיל אישר. חשבון אחר מנותק מיד. השימוש מיועד לבגירים, ולא לילדים מתחת לגיל 16.
        </p>

        <h2>מה השירות</h2>
        <p>
          תכנון אימונים, תבניות, ספריית תרגילים, תיעוד אימון והתאוששות, הערכת קלוריות, סנכרון אירועי אימון ליומן Google, ותזכורות. הערכת הקלוריות היא חישוב גס לפי משקל, משך ועצימות. היא לא מדידה רפואית.
        </p>

        <h2>לא ייעוץ רפואי</h2>
        <p>
          Shiri Fit אינה רופא, מאמן מורשה, או מכשיר רפואי. האימונים, ההערות והמספרים באפליקציה אינם ייעוץ רפואי, תזונתי או שיקומי. לפני שינוי בפעילות גופנית פונים לאיש מקצוע, במיוחד אם יש פציעה, כאב, או מצב רפואי.
        </p>

        <h2>יומן Google</h2>
        <p>
          אם מאשרים גישה ליומן, האפליקציה רשאית ליצור, לעדכן ולמחוק אירועי אימון ביומן הראשי. אפשר לכבות את הסנכרון בפרופיל, ולבטל את הגישה של Shiri Fit בהגדרות חשבון Google. פרטי השימוש בנתונים כתובים ב
          <Link href="/privacy">מדיניות הפרטיות</Link>.
        </p>

        <h2>החשבון שלך</h2>
        <p>
          מה שמזינים — הערות, תבניות, תיעוד — נשאר של המשתמש. אי אפשר להשתמש באפליקציה כדי לפגוע בחשבון Google, להעלות תוכן בלתי חוקי, או לעקוף את הגבלת החשבונות. המפעיל רשאי להסיר גישה או להפסיק את השירות.
        </p>

        <h2>זמינות ואחריות</h2>
        <p>
          השירות ניתן כמות שהוא. אין התחייבות לזמינות, לגיבוי, לתוצאת אימון, או לכך שהיומן והתזכורות יגיעו תמיד. במידה המרבית שהדין מתיר, המפעיל לא אחראי לנזק עקיף שנגרם משימוש באפליקציה או מאי-יכולת להשתמש בה.
        </p>

        <h2>שינויים ודין</h2>
        <p>
          התנאים עשויים להתעדכן; התאריך בראש העמוד הוא תאריך הגרסה. המשך שימוש אחרי עדכון הוא הסכמה לגרסה החדשה. על התנאים חל דין מדינת ישראל.
        </p>
      </article>

      <article lang="en" dir="ltr" className={enProse}>
        <h2>English</h2>
        <p>
          These terms cover Shiri Fit at shiri-fit.vercel.app. Signing in accepts these terms and the <Link href="/privacy">Privacy Policy</Link>.
        </p>
        <h2>Who can sign in</h2>
        <p>
          The app is private. Only a Google account the operator has allowed may stay signed in. Anyone else is signed out immediately. It is for adults, and is not directed at children under 16.
        </p>
        <h2>The service</h2>
        <p>
          Planning workouts, templates, an exercise library, workout and recovery logs, a rough calorie estimate, syncing workout events to Google Calendar, and reminders. The calorie figure is an estimate from weight, duration, and intensity. It is not a medical measurement.
        </p>
        <h2>Not medical advice</h2>
        <p>
          Shiri Fit is not a doctor, a licensed trainer, or a medical device. Workouts, notes, and numbers in the app are not medical, nutrition, or rehabilitation advice. Talk to a professional before changing physical activity, especially with an injury, pain, or a medical condition.
        </p>
        <h2>Google Calendar</h2>
        <p>
          If calendar access is granted, the app may create, update, and delete workout events on the primary calendar. Sync can be turned off in the profile, and Shiri Fit can be revoked in the Google Account settings. How that data is used is described in the <Link href="/privacy">Privacy Policy</Link>.
        </p>
        <h2>Your account</h2>
        <p>
          Notes, templates, and logs you enter stay yours. You may not use the app to harm a Google account, upload illegal content, or bypass the account allowlist. The operator may remove access or stop the service.
        </p>
        <h2>Availability and liability</h2>
        <p>
          The service is provided as is. There is no promise of uptime, backups, a training result, or that calendar events and reminders will always arrive. To the fullest extent the law allows, the operator is not liable for indirect damage from using the app or from being unable to use it.
        </p>
        <h2>Changes and law</h2>
        <p>
          These terms may be updated; the date at the top is the version date. Continuing to use the app after an update accepts the new version. The laws of the State of Israel govern these terms.
        </p>
      </article>
    </LegalDoc>
  );
}
