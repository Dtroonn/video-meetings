/** Fills `{name}` placeholders: `('At most {max} characters', { max: 128 })` → `At most 128 characters`. */
export function formatMessage(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
    name in values ? String(values[name]) : placeholder,
  );
}
