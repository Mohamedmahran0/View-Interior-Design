'use client';
import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/routing';
import { createClient } from '@/utils/supabase/client';
import { Search, Grid3X3, Box, Eye, User, Loader2, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';

type Tab = 'projects' | 'assets';
const ITEMS_PER_PAGE = 12;

export default function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const t = useTranslations('Search');
  const router = useRouter();
  const supabase = createClient();

  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('projects');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    searchParams.then((params) => {
      if (params.q) {
        setQuery(params.q);
      }
    });
  }, [searchParams]);

  const performSearch = useCallback(async () => {
    if (!query.trim()) {
      setResults([]);
      setTotalCount(0);
      return;
    }

    setLoading(true);
    const from = (page - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    if (activeTab === 'projects') {
      const { data, count } = await supabase
        .from('projects')
        .select('*', { count: 'exact' })
        .eq('is_public', true)
        .or(`name.ilike.%${query}%,description.ilike.%${query}%,author_name.ilike.%${query}%`)
        .order('view_count', { ascending: false })
        .range(from, to);
      if (data) setResults(data);
      if (count !== null) setTotalCount(count);
    } else {
      const { data, count } = await supabase
        .from('assets')
        .select('*', { count: 'exact' })
        .or(`name.ilike.%${query}%,description.ilike.%${query}%,category.ilike.%${query}%`)
        .order('name')
        .range(from, to);
      if (data) setResults(data);
      if (count !== null) setTotalCount(count);
    }
    setLoading(false);
  }, [query, activeTab, page, supabase]);

  useEffect(() => {
    performSearch();
  }, [performSearch]);

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    performSearch();
    router.push(`/search?q=${encodeURIComponent(query)}`);
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
          <span className="font-mono tracking-widest font-bold uppercase text-sm hidden sm:block">{t('title')}</span>
        </Link>
      </nav>

      <section className="relative z-10 pt-20 pb-8 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-center mb-8">{t('title')}</h1>

          <form onSubmit={handleSearch} className="relative mb-8">
            <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition backdrop-blur-md"
            />
          </form>

          <div className="flex items-center justify-center gap-1 mb-8 bg-white/5 border border-white/10 rounded-xl p-1 w-fit mx-auto">
            <button
              onClick={() => { setActiveTab('projects'); setPage(1); }}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'projects'
                  ? 'bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              <Grid3X3 size={16} />
              {t('tabProjects')}
            </button>
            <button
              onClick={() => { setActiveTab('assets'); setPage(1); }}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'assets'
                  ? 'bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              <Box size={16} />
              {t('tabAssets')}
            </button>
          </div>

          {query.trim() && !loading && (
            <p className="text-center text-sm text-white/40 mb-6">
              {totalCount} {t('resultsCount')}
            </p>
          )}
        </div>
      </section>

      <section className="relative z-10 pb-20 px-4">
        <div className="max-w-6xl mx-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 text-white/50">
              <Loader2 size={40} className="animate-spin text-emerald-400 mb-4" />
              <p>Searching...</p>
            </div>
          ) : results.length === 0 && query.trim() ? (
            <div className="flex flex-col items-center justify-center py-32 text-center">
              <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-6">
                <AlertCircle size={36} className="text-white/30" />
              </div>
              <h3 className="text-xl font-bold text-white/70 mb-2">{t('noResults')}</h3>
              <p className="text-white/40 text-sm">{t('noResultsDesc')}</p>
            </div>
          ) : results.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {results.map((item) => (
                  <Link
                    key={item.id}
                    href={activeTab === 'projects' ? `/view/${item.id}` : '#'}
                    className="group rounded-2xl bg-white/5 border border-white/10 overflow-hidden hover:bg-white/10 hover:border-white/20 transition-all duration-300"
                  >
                    <div className="aspect-[4/3] bg-gradient-to-br from-neutral-800 to-neutral-900 relative overflow-hidden">
                      {item.thumbnail_url || item.preview_url ? (
                        <img
                          src={item.thumbnail_url || item.preview_url}
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          {activeTab === 'projects' ? (
                            <Grid3X3 size={40} className="text-white/10" />
                          ) : (
                            <Box size={40} className="text-white/10" />
                          )}
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-white group-hover:text-emerald-400 transition-colors truncate">
                        {item.name || 'Untitled'}
                      </h3>
                      <div className="flex items-center gap-3 mt-2 text-xs text-white/40">
                        {activeTab === 'projects' && (
                          <>
                            <span className="flex items-center gap-1.5">
                              <User size={12} />
                              {item.author_name || 'Anonymous'}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Eye size={12} />
                              {item.view_count || 0}
                            </span>
                          </>
                        )}
                        {activeTab === 'assets' && item.category && (
                          <span className="capitalize">{item.category}</span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 mt-12">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm font-medium text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition"
                  >
                    <ChevronLeft size={16} />
                    {t('previous')}
                  </button>
                  <span className="text-sm text-white/40">
                    {t('page')} {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm font-medium text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition"
                  >
                    {t('next')}
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </>
          ) : null}
        </div>
      </section>

      <footer className="relative z-10 py-12 text-center text-white/40 border-t border-white/5 bg-black/80 text-sm backdrop-blur-md">
        <p>© 2026 View Interior Design. All rights reserved.</p>
      </footer>
    </main>
  );
}
