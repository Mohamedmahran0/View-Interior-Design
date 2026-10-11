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

  const modelUrl = project.glb_url || project.model_url || undefined;

  return (
    <main className="relative w-full h-screen overflow-hidden bg-slate-950">
      <Scene3D modelUrl={modelUrl} projectId={projectId} />
      <EditorUI projectId={projectId} projectName={project.name} />
    </main>
  );
}
