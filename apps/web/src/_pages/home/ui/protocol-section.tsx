import { Bars, CircleCheck, FileText, ListCheck } from '@gravity-ui/icons';
import { Card } from '@heroui/react';
import type { ComponentType, SVGProps } from 'react';
import type { Dictionary } from '@/shared/i18n';

const PROTOCOL_ICONS: ComponentType<SVGProps<SVGSVGElement>>[] = [
  FileText,
  Bars,
  ListCheck,
  CircleCheck,
];

export function ProtocolSection({ t }: { t: Dictionary['home']['protocol'] }) {
  return (
    <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <h2 className="text-center text-3xl font-semibold tracking-tight">{t.title}</h2>
      <p className="text-muted mx-auto mt-3 max-w-2xl text-center text-pretty">{t.subtitle}</p>
      <ul className="mt-10 grid gap-4 sm:grid-cols-2">
        {t.items.map((item, index) => {
          const Icon = PROTOCOL_ICONS[index];
          return (
            <li key={item.title}>
              <Card className="h-full">
                <Card.Header>
                  <div className="bg-accent/10 text-accent mb-2 flex size-10 items-center justify-center rounded-lg">
                    {Icon && <Icon aria-hidden />}
                  </div>
                  <Card.Title>{item.title}</Card.Title>
                  <Card.Description>{item.text}</Card.Description>
                </Card.Header>
              </Card>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
