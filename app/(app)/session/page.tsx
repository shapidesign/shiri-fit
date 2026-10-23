import { SessionScreen } from "./session-screen";

export default async function SessionPage({ searchParams }: PageProps<"/session">) {
  const sp = await searchParams;
  const scheduledId = typeof sp.scheduled === "string" ? sp.scheduled : null;
  const templateId = typeof sp.template === "string" ? sp.template : null;
  return <SessionScreen scheduledId={scheduledId} templateId={templateId} quick={sp.quick === "1"} />;
}
