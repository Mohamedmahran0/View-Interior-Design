'use client';
import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { createClient } from '@/utils/supabase/client';
import { Search, Eye, User, Grid3X3, Loader2, AlertCircle, ArrowRight } from 'lucide-react';

const categories = [
  'all',
  'livingRoom',
  'bedroom',
  'kitchen',
  'bathroom',
  'office',
  'commercial',
  'outdoor',
] as const;

export default function GalleryPage() {
  const t = useTranslations('Gallery');
  const supabase = createClient();

  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [filteredProjects, setFilteredProjects] = useState<any[]>([]);

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    let result = projects;
    if (activeCategory !== 'all') {
      result = result.filter((p) => p.category === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p: any) =>
          p.name?.toLowerCase().includes(q) ||
          p.author_name?.toLowerCase().includes(q)
      );
    }
    setFilteredProjects(result);
  }, [projects, activeCategory, searchQuery]);

  const fetchProjects = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('projects')
      .select('*')
      .eq('is_public', true)
      .order('view_count', { ascending: false })
      .limit(24);
    if (data) setProjects(data);
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-neutral-950 text-white selection:bg-emerald-500/30">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-600/15 blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/15 blur-[120px]"></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
      </div>

      <nav className="relative z-50 flex items-center justify-between p-6 lg:px-12 backdrop-blur-xl border-b border-white/5 bg-black/40">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-blue-500 flex items-center justify-center font-bold text-lg shadow-[0_0_20px_rgba(16,185,129,0.4)]">
            V
          </div>
          <span className="font-mono tracking-widest font-bold uppercase text-sm hidden sm:block">Gallery</span>
        </Link>
      </nav>

      <section className="relative z-10 pt-20 pb-8 px-4">
        <div className="max-w-6xl mx-auto text-center mb-10">
          <h1 className="text-5xl lg:text-6xl font-bold tracking-tight mb-4">{t('title')}</h1>
          <p className="text-lg text-white/50">{t('subtitle')}</p>
        </div>

        <div className="max-w-xl mx-auto relative mb-8">
          <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition backdrop-blur-md"
          />
        </div>

        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-5 py-2 rounded-xl text-sm font-medium transition-all backdrop-blur-md ${
                activeCategory === cat
                  ? 'bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                  : 'bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              {cat === 'all' ? t('allCategories') : t(`category${cat.charAt(0).toUpperCase() + cat.slice(1)}` as any)}
            </button>
          ))}
        </div>
      </section>

      <section className="relative z-10 pb-20 px-4">
        <div className="max-w-6xl mx-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 text-white/50">
              <Loader2 size={40} className="animate-spin text-emerald-400 mb-4" />
              <p>{t('loading')}</p>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 text-center">
              <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-6">
                <AlertCircle size={36} className="text-white/30" />
              </div>
              <h3 className="text-xl font-bold text-white/70 mb-2">{t('noProjects')}</h3>
              <p className="text-white/40 text-sm">{t('noProjectsDesc')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProjects.map((project) => (
                <Link
                  key={project.id}
                  href={`/view/${project.id}`}
                  className="group rounded-2xl bg-white/5 border border-white/10 overflow-hidden hover:bg-white/10 hover:border-white/20 transition-all duration-300"
                >
                  <div className="aspect-[4/3] bg-gradient-to-br from-neutral-800 to-neutral-900 relative overflow-hidden">
                    {project.thumbnail_url ? (
                      <img
                        src={project.thumbnail_url}
                        alt={project.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Grid3X3 size={40} className="text-white/10" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-white group-hover:text-emerald-400 transition-colors truncate">
                      {project.name || 'Untitled'}
                    </h3>
                    <div className="flex items-center justify-between mt-2 text-xs text-white/40">
                      <span className="flex items-center gap-1.5">
                        <User size={12} />
                        {project.author_name || 'Anonymous'}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Eye size={12} />
                        {project.view_count || 0} {t('views')}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <footer className="relative z-10 py-12 text-center text-white/40 border-t border-white/5 bg-black/80 text-sm backdrop-blur-md">
        <p>© 2026 View Interior Design. All rights reserved.</p>
      </footer>
    </main>
  );
}
