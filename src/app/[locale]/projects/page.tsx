import { setRequestLocale } from 'next-intl/server';
import ProjectsClient from './projects-client';

export default async function ProjectsPage({
  params
}: {
  params: Promise<{locale: string}>;
}) {
  const {locale} = await params;
  setRequestLocale(locale);

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <ProjectsClient />
    </div>
  );
}
