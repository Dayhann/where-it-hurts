import type { Message, SummaryLine } from '@/contracts/types';

function normalize(text: string): string {
  return text
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(/[“”"']/gu, '')
    .replace(/\s+/gu, ' ')
    .trim();
}

/** Recompute verification from patient words; never trust a model's verified flag. */
export function verifyLine(
  line: SummaryLine,
  messages: Message[],
): SummaryLine {
  const patients = new Map(
    messages
      .filter((message) => message.role === 'patient')
      .map((message) => [message.id, message]),
  );
  const sources = line.sourceMessageIds.map((id) => patients.get(id));
  const quotes = line.quotes.map(normalize);
  const containsQuote = (message: Message, quote: string): boolean =>
    [message.text, message.textEn].some(
      (text) => Boolean(text) && normalize(text!).includes(quote),
    );
  const verified =
    sources.length > 0 &&
    quotes.length > 0 &&
    sources.every((source) => Boolean(source)) &&
    quotes.every(
      (quote) =>
        quote.length > 0 &&
        sources.some((source) => source && containsQuote(source, quote)),
    ) &&
    sources.every(
      (source) =>
        source && quotes.some((quote) => containsQuote(source, quote)),
    );
  return { ...line, verified: Boolean(verified) };
}
