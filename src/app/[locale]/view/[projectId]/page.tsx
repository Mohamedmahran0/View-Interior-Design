import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import { Eye, Share2, Calendar, Tag, ArrowLeft, Monitor, Copy, Check } from 'lucide-react';
import ShareButton from './share-button';

export default async function ProjectViewPage({
  params,
}: {
  params: Promise<{ locale: string; projectId: string }>;
}) {
  const { locale, projectId } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('ProjectView');
  const isRtl = locale === 'ar';

  const supabase = await createClient();
  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single();

  if (!project) {
    notFound();
  }

  const viewCount = (project.view_count || 0) + 1;
  await supabase
    .from('projects')
    .update({ view_count: viewCount })
    .eq('id', projectId);

  return (
    <main className="min-h-screen bg-neutral-950 text-white selection:bg-emerald-500/30">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-600/20 blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/20 blur-[120px]"></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
      </div>

      <nav className="relative z-50 flex items-center justify-between p-6 lg:px-12 backdrop-blur-xl border-b border-white/5 bg-black/40">
        <div className="flex items-center gap-4">
          <Link href="/gallery" className="flex items-center gap-2 text-sm text-white/60 hover:text-emerald-400 transition">
            <ArrowLeft size={18} className={isRtl ? 'rotate-180' : ''} />
            {t('backToGallery')}
          </Link>
        </div>
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-blue-500 flex items-center justify-center font-bold text-lg shadow-[0_0_20px_rgba(16,185,129,0.4)]">
            V
          </div>
        </Link>
      </nav>

      <section className="relative z-10 py-12 px-4 lg:px-12">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="aspect-[16/9] rounded-[2rem] bg-gradient-to-br from-neutral-900 to-black border border-white/10 overflow-hidden relative group shadow-2xl">
                {project.glb_url ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center">
                      <Monitor size={64} className="text-emerald-500/30 mx-auto mb-4" />
                      <p className="text-white/40 text-sm">{t('viewerPlaceholder')}</p>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Monitor size={64} className="text-white/10 mx-auto mb-4" />
                    <p className="text-white/20">{t('viewerLoading')}</p>
                  </div>
                )}
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md text-xs text-white/60 border border-white/10">
                    <Eye size={14} />
                    {viewCount} {t('viewCount')}
                  </div>
                  <ShareButton projectId={projectId} />
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-[2rem] p-6">
                <h1 className="text-3xl font-bold mb-2">{project.name || 'Untitled Project'}</h1>
                {project.author_name && (
                  <p className="text-white/50 text-sm flex items-center gap-2">
                    {t('by')} <span className="text-white/70">{project.author_name}</span>
                  </p>
                )}

                <div className="mt-6 space-y-3">
                  <div className="flex items-center gap-3 text-sm text-white/50">
                    <Tag size={16} className="text-white/30" />
                    <span>{t('category')}:</span>
                    <span className="text-white/70 capitalize">{project.category || 'Uncategorized'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-white/50">
                    <Calendar size={16} className="text-white/30" />
                    <span>{t('created')}:</span>
                    <span className="text-white/70">
                      {project.created_at
                        ? new Date(project.created_at).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })
                        : 'N/A'}
                    </span>
                  </div>
                </div>

                {project.description && (
                  <p className="mt-6 text-white/60 text-sm leading-relaxed border-t border-white/10 pt-6">
                    {project.description}
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <ShareButton projectId={projectId} variant="full" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="relative z-10 py-12 text-center text-white/40 border-t border-white/5 bg-black/80 text-sm backdrop-blur-md">
        <p>© 2026 View Interior Design. All rights reserved.</p>
      </footer>
    </main>
  );
}
