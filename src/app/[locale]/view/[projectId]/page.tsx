import { setRequestLocale } from 'next-intl/server';
import { createClient } from '@/utils/supabase/server';
import { notFound, redirect } from 'next/navigation';

export default async function ProjectViewPage({
  params,
}: {
  params: Promise<{ locale: string; projectId: string }>;
}) {
  const { locale, projectId } = await params;
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

  const ownerId = project.owner_id || project.user_id;
  let username = project.author_name || 'engineer';
  if (ownerId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', ownerId)
      .single();
    if (profile?.full_name) {
      username = profile.full_name;
    } else if (profile?.email) {
      username = profile.email.split('@')[0];
    }
  }

  const cleanUser = username.trim().replace(/\s+/g, '-').replace(/[^\p{L}\p{N}_-]/gu, '') || 'engineer';
  redirect(`/${locale}/view/${encodeURIComponent(cleanUser)}/${projectId}`);
}
