'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Share2, Check } from 'lucide-react';

export default function ShareButton({
  projectId,
  variant = 'icon',
}: {
  projectId: string;
  variant?: 'icon' | 'full';
}) {
  const t = useTranslations('ProjectView');
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const url = `${window.location.origin}/view/${projectId}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = url;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (variant === 'full') {
    return (
      <button
        onClick={handleShare}
        className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 font-medium transition text-sm"
      >
        {copied ? (
          <>
            <Check size={18} className="text-emerald-400" />
            {t('copied')}
          </>
        ) : (
          <>
            <Share2 size={18} />
            {t('share')}
          </>
        )}
      </button>
    );
  }

  return (
    <button
      onClick={handleShare}
      className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/60 backdrop-blur-md text-xs text-white/60 border border-white/10 hover:text-emerald-400 hover:border-emerald-500/30 transition"
    >
      {copied ? (
        <>
          <Check size={14} className="text-emerald-400" />
          {t('copied')}
        </>
      ) : (
        <>
          <Share2 size={14} />
          {t('share')}
        </>
      )}
    </button>
  );
}
