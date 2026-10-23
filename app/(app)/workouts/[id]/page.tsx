import { TemplateEditor } from "./template-editor";

export default async function TemplatePage({ params }: PageProps<"/workouts/[id]">) {
  const { id } = await params;
  return <TemplateEditor id={id} />;
}
