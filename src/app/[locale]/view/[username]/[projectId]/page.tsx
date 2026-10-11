import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import {
  Eye,
  Calendar,
  Tag,
  ArrowLeft,
  CheckCircle2,
  MessageCircle,
  Share2,
  Compass,
  Sparkles,
  Award,
  Layers,
  MapPin,
  Clock,
} from 'lucide-react';
import ShareButton from '@/app/[locale]/view/[projectId]/share-button';
import ProjectViewerContainer from '@/app/[locale]/view/[projectId]/project-viewer-container';
import { getProjectShareUrl } from '@/utils/site-url';

export default async function ClientProjectViewPage({
  params,
}: {
  params: Promise<{ locale: string; username: string; projectId: string }>;
}) {
  const { locale, username: rawUsername, projectId } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('ProjectView');
  const isRtl = locale === 'ar';

  const decodedUsername = decodeURIComponent(rawUsername);

  const supabase = await createClient();
  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single();

  if (!project) {
    notFound();
  }

  // Update project view count
  const viewCount = (project.view_count || 0) + 1;
  await supabase
    .from('projects')
    .update({ view_count: viewCount })
    .eq('id', projectId);

  // Fetch engineer profile
  let engineerProfile: any = null;
  const ownerId = project.owner_id || project.user_id;
  if (ownerId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', ownerId)
      .single();
    engineerProfile = profile;
  }

  const engineerName = engineerProfile?.full_name || project.author_name || decodedUsername || 'Engineer';
  const engineerRole = engineerProfile?.role === 'admin' ? 'Senior Architectural Director' : 'مهندس تصميم داخلي ومعماري معتمد';
  const fileUrl = project.model_url || project.glb_url || '';
  const isGLB = fileUrl.toLowerCase().endsWith('.glb') || fileUrl.toLowerCase().endsWith('.gltf');
  const canonicalShareUrl = getProjectShareUrl(engineerName, projectId, locale);

  const whatsappMessage = encodeURIComponent(
    isRtl
      ? `مرحباً مهندس ${engineerName}، لقد اطلعت على تصميم مشروع "${project.name}" عبر منصة View Interior Design وأود الاستفسار عن تفاصيل التنفيذ والتصميم:\n${canonicalShareUrl}`
      : `Hello Eng. ${engineerName}, I reviewed your design for "${project.name}" on View Interior Design and would like to inquire about implementation:\n${canonicalShareUrl}`
  );

  return (
    <main className="min-h-screen bg-neutral-950 text-white selection:bg-emerald-500/30">
      {/* Background Lighting Gradients */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[45%] h-[45%] rounded-full bg-emerald-600/15 blur-[140px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] rounded-full bg-blue-600/15 blur-[140px]"></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
      </div>

      {/* Top Navigation Bar */}
      <nav className="relative z-50 flex items-center justify-between p-4 lg:px-12 backdrop-blur-xl border-b border-white/5 bg-black/60">
        <div className="flex items-center gap-4">
          <Link
            href="/gallery"
            className="flex items-center gap-2 text-sm text-white/70 hover:text-emerald-400 transition"
          >
            <ArrowLeft size={18} className={isRtl ? 'rotate-180' : ''} />
            <span className="hidden sm:inline">{t('backToGallery')}</span>
          </Link>
        </div>

        {/* Engineer Identity Pill in Navbar */}
        <div className="flex items-center gap-3 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-xs font-bold shadow-md">
            {engineerName.slice(0, 1).toUpperCase()}
          </div>
          <div className="flex flex-col text-right">
            <span className="text-xs font-bold text-white flex items-center gap-1">
              <span>{engineerName}</span>
              <CheckCircle2 size={12} className="text-emerald-400" />
            </span>
            <span className="text-[10px] text-white/50">{engineerRole}</span>
          </div>
        </div>

        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-blue-500 flex items-center justify-center font-bold text-sm shadow-[0_0_15px_rgba(16,185,129,0.4)]">
            V
          </div>
          <span className="text-sm font-bold tracking-tight hidden md:inline">View Interior</span>
        </Link>
      </nav>

      {/* Engineer Verified Showcase Hero Banner */}
      <section className="relative z-10 pt-8 pb-4 px-4 lg:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 p-6 rounded-3xl bg-gradient-to-r from-white/[0.04] to-white/[0.01] border border-white/10 backdrop-blur-xl">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-blue-600 p-0.5 shadow-xl shadow-emerald-500/10">
                <div className="w-full h-full rounded-[14px] bg-neutral-900 flex items-center justify-center text-2xl font-black text-emerald-400">
                  {engineerName.slice(0, 2).toUpperCase()}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h2 className="text-xl font-bold tracking-tight text-white">{project.name || 'Untitled Project'}</h2>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
                    <Award size={12} />
                    <span>تصميم معتمد</span>
                  </span>
                </div>
                <p className="text-white/60 text-sm flex items-center gap-2">
                  <span>تم التصميم والتنفيذ بواسطة المهندس:</span>
                  <span className="text-white font-semibold underline decoration-emerald-500 underline-offset-4">{engineerName}</span>
                </p>
              </div>
            </div>

            {/* Inquire & Share Buttons */}
            <div className="flex items-center gap-3 w-full lg:w-auto">
              <a
                href={`https://wa.me/?text=${whatsappMessage}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-sm shadow-lg shadow-emerald-500/20 transition cursor-pointer"
              >
                <MessageCircle size={16} />
                <span>تواصل مع المهندس (واتساب)</span>
              </a>

              <ShareButton projectId={projectId} username={engineerName} variant="full" />
            </div>
          </div>
        </div>
      </section>

      {/* Main 3D Walkthrough & Project Content */}
      <section className="relative z-10 py-6 px-4 lg:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left 2 Cols: 3D Walkthrough Viewport */}
            <div className="lg:col-span-2 space-y-4">
              <ProjectViewerContainer
                projectId={projectId}
                projectName={project.name || 'Untitled Project'}
                fileUrl={fileUrl}
                isGLB={isGLB}
                streamingEnabled={project.streaming_enabled ?? true}
                sceneMetadata={project.scene_metadata}
              />

              {/* View stats and Canonical URL badge */}
              <div className="flex flex-wrap items-center justify-between gap-3 px-2 text-xs text-white/50">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
                  <Eye size={14} className="text-emerald-400" />
                  <span>{viewCount} مشاهدة للمشروع</span>
                </div>

                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md font-mono text-[11px] text-white/70">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>viewinteriordesign.com/view/{encodeURIComponent(engineerName)}/{projectId.slice(0, 8)}...</span>
                </div>
              </div>

              {/* Client Walkthrough Instructions Guide */}
              <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl">
                <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                  <Compass size={18} className="text-emerald-400" />
                  <span>دليل العميل للتجوال الافتراضي ثلاثي الأبعاد 🚶‍♂️</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-white/70">
                  <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5">
                    <p className="font-bold text-white mb-1">🎮 التحكم والتجوال</p>
                    <p>استخدم مفاتيح <b>W, A, S, D</b> أو الأسهم للتحرك داخل أرجاء الفيلا والشقة بحرية تامة.</p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5">
                    <p className="font-bold text-white mb-1">🚪 الانتقال بين الغرف</p>
                    <p>اضغط على قائمة الغرف (صالة المعيشة، الماستر، المطبخ، التراس) للانتقال الفوري.</p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5">
                    <p className="font-bold text-white mb-1">☀️ أجواء الإضاءة</p>
                    <p>غيّر الإضاءة بين ضوء النهار المشرق، وقت الغروب الذهبي، أو الإضاءة الليلية الفاخرة.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right 1 Col: Project Details & Specifications */}
            <div className="space-y-6">
              <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-6">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Layers size={18} className="text-emerald-400" />
                  <span>تفاصيل ومواصفات المشروع</span>
                </h3>

                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm py-2 border-b border-white/5">
                    <span className="text-white/50 flex items-center gap-2">
                      <Tag size={15} /> التصنيف المعماري
                    </span>
                    <span className="font-semibold text-white capitalize">{project.category || 'تصميم فيلا سكنية فاخرة'}</span>
                  </div>

                  <div className="flex items-center justify-between text-sm py-2 border-b border-white/5">
                    <span className="text-white/50 flex items-center gap-2">
                      <Clock size={15} /> تاريخ الإنجاز
                    </span>
                    <span className="font-semibold text-white">
                      {project.created_at
                        ? new Date(project.created_at).toLocaleDateString(isRtl ? 'ar-SA' : 'en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })
                        : 'حديث'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm py-2 border-b border-white/5">
                    <span className="text-white/50 flex items-center gap-2">
                      <Sparkles size={15} /> محرك الإظهار
                    </span>
                    <span className="font-semibold text-emerald-400">3ds Max Baked Lightmaps & WebGPU</span>
                  </div>
                </div>

                {project.description && (
                  <div className="mt-6 pt-6 border-t border-white/10">
                    <h4 className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2">الوصف المعماري</h4>
                    <p className="text-white/80 text-sm leading-relaxed">
                      {project.description}
                    </p>
                  </div>
                )}
              </div>

              {/* Engineer Contact Card */}
              <div className="backdrop-blur-xl bg-gradient-to-br from-emerald-950/40 via-neutral-900/60 to-black/80 border border-emerald-500/20 rounded-3xl p-6 shadow-xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-xl">
                    {engineerName.slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-base">{engineerName}</h4>
                    <p className="text-xs text-emerald-400">مهندس ديكور وتصميم داخلي</p>
                  </div>
                </div>

                <p className="text-xs text-white/70 leading-relaxed mb-5">
                  جاهز لمناقشة تعديلات المخططات واختيار خامات الأثاث والإضاءة المناسبة لمشروعك السكني أو التجاري.
                </p>

                <a
                  href={`https://wa.me/?text=${whatsappMessage}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm transition shadow-lg shadow-emerald-500/20"
                >
                  <MessageCircle size={16} />
                  <span>بدء محادثة استشارية</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-10 text-center text-white/40 border-t border-white/5 bg-black/80 text-xs backdrop-blur-md">
        <p>© 2026 View Interior Design — المنصة الاحترافية لاستعراض التصاميم المعمارية والداخلية بتقنية 3D السحابية.</p>
      </footer>
    </main>
  );
}
