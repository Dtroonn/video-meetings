import type { Metadata } from 'next';
import { getDictionary, getLocale } from '@/shared/i18n/server';
import { CtaSection } from './cta-section';
import { HeroSection } from './hero-section';
import { HomeFooter } from './home-footer';
import { HomeHeader } from './home-header';
import { ProtocolSection } from './protocol-section';
import { StepsSection } from './steps-section';

export async function generateMetadata(): Promise<Metadata> {
  const { title, description } = (await getDictionary()).home.metadata;
  return { title, description };
}

/**
 * The public landing page: describes the product for signed-in and signed-out visitors alike.
 * Everything but the guest-only buttons and closing call to sign up is the same for every visitor
 * of a locale, so it's prerendered into the static shell; those parts read the session and stream
 * in from `<Suspense>`, behind skeletons of the same size.
 */
export async function HomePage() {
  const locale = await getLocale();
  const { common, home: t } = await getDictionary();

  return (
    <>
      <HomeHeader locale={locale} localeSwitcherLabel={common.localeSwitcherLabel} t={t.header} />
      <main>
        <HeroSection locale={locale} t={t.hero} />
        <StepsSection t={t.steps} />
        <ProtocolSection t={t.protocol} />
        <CtaSection locale={locale} t={t.cta} />
      </main>
      <HomeFooter text={t.footer} />
    </>
  );
}
