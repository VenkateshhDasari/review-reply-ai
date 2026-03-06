interface CsvRow {
  reviewText: string;
  sentiment: string;
  reply: string;
  error?: string;
}

function escapeCsvField(value: string): string {
  let safe = value;
  // Prevent CSV injection — prefix cells that start with dangerous characters
  if (/^[=+\-@\t\r]/.test(safe)) {
    safe = `'${safe}`;
  }
  if (safe.includes('"') || safe.includes(',') || safe.includes('\n')) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

export function exportCsv(items: CsvRow[], filePrefix: string): void {
  const header = 'Review,Sentiment,Reply';
  const rows = items.map(item =>
    [
      escapeCsvField(item.reviewText),
      escapeCsvField(item.sentiment),
      escapeCsvField(item.reply)
    ].join(',')
  );

  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `${filePrefix.replace(/[^a-zA-Z0-9_-]/g, '_')}-replies-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
