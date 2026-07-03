import { setRequestLocale } from 'next-intl/server';
import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import Scene3D from '@/components/Editor/Scene3D';
import EditorUI from '@/components/Editor/EditorUI';
import type { Project } from '@/types/database';

export default async function EditProjectPage({
  params
}: {
  params: Promise<{locale: string; projectId: string}>;
}) {
  const {locale, projectId} = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single();

  if (!project) {
    notFound();
  }

  return (
    <main className="relative w-full h-screen overflow-hidden bg-slate-950">
      <div className="absolute top-3 left-3 z-20 px-3 py-1.5 bg-black/60 backdrop-blur-md border border-white/10 rounded-lg text-sm font-medium text-white/80">
        {project.name}
      </div>
      <Scene3D />
      <EditorUI />
    </main>
  );
}
