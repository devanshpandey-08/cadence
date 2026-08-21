/**
 * CSV writer with injection defense.
 * RFC 4180 quoting + the standard formula-injection guard: cells beginning
 * with `= + - @ \t \r` are prefixed with a single quote so spreadsheet apps
 * treat them as text instead of executing them. (OWASP "CSV Excel Macro Injection")
 */
export function csvEscape(value: unknown): string {
  let v = String(value ?? '');
  if (/^[=+\-@\t\r]/.test(v)) v = `'${v}`;
  return `"${v.replace(/"/g, '""')}"`;
}

export function toCsv(header: string[], rows: unknown[][]): string {
  return [header.join(','), ...rows.map(r => r.map(csvEscape).join(','))].join('\n');
}
