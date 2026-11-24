/**
 * Browser-only dispute letter exports. A tiny PDF writer keeps this feature
 * dependency-free while still producing a real, printable PDF file.
 */

const MAX_LINE_LENGTH = 92;
const LINES_PER_PAGE = 62;

const safeFilename = (value) =>
  String(value || 'dispute-letter')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'dispute-letter';

const wrapLine = (line) => {
  const source = String(line ?? '');
  if (source.length <= MAX_LINE_LENGTH) return [source];

  const words = source.split(' ');
  const wrapped = [];
  let current = '';

  words.forEach((word) => {
    if (word.length > MAX_LINE_LENGTH) {
      if (current) {
        wrapped.push(current);
        current = '';
      }
      for (let i = 0; i < word.length; i += MAX_LINE_LENGTH) {
        wrapped.push(word.slice(i, i + MAX_LINE_LENGTH));
      }
      return;
    }
    if (!current) {
      current = word;
    } else if (current.length + word.length + 1 <= MAX_LINE_LENGTH) {
      current += ` ${word}`;
    } else {
      wrapped.push(current);
      current = word;
    }
  });

  if (current) wrapped.push(current);
  return wrapped;
};

const escapePdfText = (value) =>
  String(value)
    .replace(/[^\x20-\x7E]/g, '?')
    .replace(/([\\()])/g, '\\$1');

const buildContentStream = (lines) => {
  const commands = lines.map((line) => `(${escapePdfText(line)}) Tj`).join('\n');
  return `BT\n/F1 10 Tf\n50 792 Td\n12 TL\n${commands}\nET`;
};

/** Build a minimal single-font PDF as bytes. Exported for local verification. */
export const buildPdfBytes = (text) => {
  const wrappedLines = String(text || '')
    .split(/\r?\n/)
    .flatMap(wrapLine);
  const pages = [];
  for (let i = 0; i < wrappedLines.length; i += LINES_PER_PAGE) {
    pages.push(wrappedLines.slice(i, i + LINES_PER_PAGE));
  }
  if (!pages.length) pages.push(['']);

  const pageRefs = pages.map((_, index) => `${4 + index * 2} 0 R`).join(' ');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Kids [${pageRefs}] /Count ${pages.length} >>`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
  ];

  pages.forEach((lines, index) => {
    const pageObject = 4 + index * 2;
    const contentObject = pageObject + 1;
    const stream = buildContentStream(lines);

    objects[pageObject - 1] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] ` +
      `/Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObject} 0 R >>`;
    objects[contentObject - 1] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  });

  let pdf = '%PDF-1.4\n';
  const offsets = [];
  objects.forEach((body, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new TextEncoder().encode(pdf);
};

const downloadBlob = (blob, filename) => {
  if (typeof window === 'undefined') throw new Error('Exports are only available in the browser');
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const downloadLetterText = (letterText, invoiceNumber = 'invoice') => {
  downloadBlob(
    new Blob([String(letterText || '')], { type: 'text/plain;charset=utf-8' }),
    `${safeFilename(invoiceNumber)}-dispute-letter.txt`,
  );
};

export const downloadLetterPdf = (letterText, invoiceNumber = 'invoice') => {
  downloadBlob(
    new Blob([buildPdfBytes(letterText)], { type: 'application/pdf' }),
    `${safeFilename(invoiceNumber)}-dispute-letter.pdf`,
  );
};
