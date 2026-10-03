import { CloudArrowUpIn, FileText, Plus } from '@gravity-ui/icons';
import { Card } from '@heroui/react';
import type { ComponentType, SVGProps } from 'react';
import type { Dictionary } from '@/shared/i18n';

const STEP_ICONS: ComponentType<SVGProps<SVGSVGElement>>[] = [Plus, CloudArrowUpIn, FileText];

export function StepsSection({ t }: { t: Dictionary['home']['steps'] }) {
  return (
    <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <h2 className="text-center text-3xl font-semibold tracking-tight">{t.title}</h2>
      <ol className="mt-10 grid gap-4 md:grid-cols-3">
        {t.items.map((step, index) => {
          const Icon = STEP_ICONS[index];
          return (
            <li key={step.title}>
              <Card className="h-full">
                <Card.Header>
                  <div className="mb-2 flex items-center gap-3">
                    <span className="bg-accent text-accent-foreground flex size-10 items-center justify-center rounded-full">
                      {Icon && <Icon aria-hidden />}
                    </span>
                    <span className="text-muted text-sm font-medium">{index + 1}</span>
                  </div>
                  <Card.Title>{step.title}</Card.Title>
                  <Card.Description>{step.text}</Card.Description>
                </Card.Header>
              </Card>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
