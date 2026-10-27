import { cacheLife } from 'next/cache';

export function HomeFooter({ text }: { text: string }) {
  return (
    <footer className="border-separator text-muted border-t py-6 text-center text-sm">
      © <CurrentYear /> {text}
    </footer>
  );
}

/**
 * With Cache Components, reading the clock (`new Date()`) while prerendering the static shell is a
 * build error. Cached, the year becomes part of the shell and is refreshed daily.
 */
async function CurrentYear() {
  'use cache';
  cacheLife('days');
  return new Date().getFullYear();
}
