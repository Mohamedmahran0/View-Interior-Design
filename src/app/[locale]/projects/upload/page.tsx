import { setRequestLocale } from 'next-intl/server';
import UploadForm from './upload-form';

export default async function UploadProjectPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <UploadForm />
    </div>
  );
}