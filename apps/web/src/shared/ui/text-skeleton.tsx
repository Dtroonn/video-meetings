import { skeletonVariants } from '@heroui/styles';

/**
 * A skeleton for use inside text (`<h1>`, `<p>`, …), one line high (`1lh`, the parent's line
 * height), so the text replaces it without a layout shift. HeroUI's `Skeleton` renders a `<div>`,
 * which is invalid inside headings and paragraphs (React reports it as a hydration error); this is
 * the same look as a `<span>`. Set the width with `className`.
 */
export function TextSkeleton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={skeletonVariants().base({
        className: ['inline-block h-[1lh] max-w-full rounded-lg align-top', className],
      })}
    />
  );
}
