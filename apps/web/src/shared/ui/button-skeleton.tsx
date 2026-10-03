import { Skeleton } from '@heroui/react';
import { buttonVariants } from '@heroui/styles';

interface ButtonSkeletonProps {
  /** HeroUI button size of the button it stands in for. */
  size?: 'sm' | 'md' | 'lg';
  /** The button's text: rendered invisibly, so the skeleton is exactly as wide as the button. */
  label: string;
  /** The button's own size classes (e.g. `w-full sm:w-auto`). */
  className?: string;
}

/**
 * A `<Suspense>` placeholder with exactly the size of a HeroUI button (no layout shift): it uses
 * the same `buttonVariants` sizing as the button itself and reserves the width with the invisible
 * label, and the skeleton just fills that box.
 */
export function ButtonSkeleton({ size = 'md', label, className }: ButtonSkeletonProps) {
  return (
    <span aria-hidden className={buttonVariants({ size, className })}>
      <Skeleton className="absolute inset-0 rounded-[inherit]" />
      <span className="invisible">{label}</span>
    </span>
  );
}
