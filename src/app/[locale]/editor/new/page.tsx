import { setRequestLocale } from 'next-intl/server';
import Scene3D from '@/components/Editor/Scene3D';
import EditorUI from '@/components/Editor/EditorUI';

export default async function NewEditorPage({
  params
}: {
  params: Promise<{locale: string}>;
}) {
  const {locale} = await params;
  setRequestLocale(locale);

  return (
    <main className="relative w-full h-screen overflow-hidden bg-slate-950">
      <Scene3D />
      <EditorUI />
    </main>
  );
}
