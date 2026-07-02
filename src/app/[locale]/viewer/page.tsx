import { setRequestLocale } from 'next-intl/server';
import SplatViewer from '@/components/Viewer/SplatViewer';
import GLBViewer from '@/components/Viewer/GLBViewer';
import { ArrowLeft } from 'lucide-react';
import { Link } from '@/i18n/routing';

export default async function ViewerPage({
  params,
  searchParams
}: {
  params: Promise<{locale: string}>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const resolvedSearchParams = await searchParams;
  
  const url = typeof resolvedSearchParams.url === 'string' ? resolvedSearchParams.url : '';
  const isGLB = url.toLowerCase().endsWith('.glb') || url.toLowerCase().endsWith('.gltf');
  
  return (
    <main className="relative w-full h-screen overflow-hidden bg-black">
      <div className="absolute top-0 left-0 right-0 h-20 z-20 bg-gradient-to-b from-black/90 to-transparent flex items-center px-6 pointer-events-none">
        <Link href="/editor" className="p-2 hover:bg-white/10 rounded-full transition text-white pointer-events-auto">
          <ArrowLeft size={20} />
        </Link>
        <span className="ml-4 text-emerald-400 font-mono text-sm tracking-widest uppercase">Project Viewer</span>
      </div>
      
      {url ? (
        isGLB ? <GLBViewer url={url} /> : <SplatViewer url={url} />
      ) : (
        <div className="flex items-center justify-center w-full h-full text-white/50 font-mono">
          No project URL provided.
        </div>
      )}
    </main>
  );
}
