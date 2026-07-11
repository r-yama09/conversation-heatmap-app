import type { NormalizedMessage } from "@/lib/chatgpt-export/types";
import type { FrequentWord, FrequentWordsResult } from "./types";

export const FREQUENT_WORD_STOP_WORDS: ReadonlySet<string> = new Set([
  "これ", "それ", "あれ", "ここ", "そこ", "ため", "もの", "こと", "よう",
  "です", "ます", "する", "した", "して", "いる", "ある", "なる", "ない",
  "ください", "お願い", "自分", "なんか", "あと", "でも", "から", "まで", "ので",
]);

const DEFAULT_LIMIT = 20;
const URL_PATTERN = /(?:https?:\/\/|www\.)\S+/giu;
const VALID_TOKEN_PATTERN = /^[\p{L}\p{N}\p{M}]+$/u;
const LETTER_PATTERN = /\p{L}/u;
const NUMBER_ONLY_PATTERN = /^\p{N}+$/u;

type Segment = { segment: string; isWordLike?: boolean };

function createSegmenter(): { segment(input: string): Iterable<Segment> } | null {
  if (typeof Intl === "undefined" || !("Segmenter" in Intl)) return null;
  const SegmenterConstructor = Intl.Segmenter;
  return new SegmenterConstructor("ja", { granularity: "word" });
}

function fallbackSegments(input: string): string[] {
  return input.match(/[\p{L}\p{N}\p{M}]+/gu) ?? [];
}

function normalizeToken(value: string): string {
  return value.normalize("NFKC").toLowerCase();
}

function isUsableToken(value: string): boolean {
  if (!value || value.length < 2) return false;
  if (!VALID_TOKEN_PATTERN.test(value) || !LETTER_PATTERN.test(value)) return false;
  if (NUMBER_ONLY_PATTERN.test(value)) return false;
  return !FREQUENT_WORD_STOP_WORDS.has(value);
}

function tokenize(text: string): string[] {
  const normalizedText = text.normalize("NFKC").replace(URL_PATTERN, " ").toLowerCase();
  const segmenter = createSegmenter();
  const candidates = segmenter
    ? Array.from(segmenter.segment(normalizedText)).filter((item) => item.isWordLike !== false).map((item) => item.segment)
    : fallbackSegments(normalizedText);

  return candidates.map(normalizeToken).filter(isUsableToken);
}

function compareWords(left: FrequentWord, right: FrequentWord): number {
  if (left.count !== right.count) return right.count - left.count;
  if (left.messageCount !== right.messageCount) return right.messageCount - left.messageCount;
  return left.token < right.token ? -1 : left.token > right.token ? 1 : 0;
}

export function createFrequentWords(messages: NormalizedMessage[], limit = DEFAULT_LIMIT): FrequentWordsResult {
  const counts = new Map<string, FrequentWord>();
  let analyzedMessageCount = 0;
  let matchedMessageCount = 0;

  for (const message of messages) {
    if (message.role !== "user") continue;
    analyzedMessageCount += 1;
    const tokens = tokenize(message.text);
    if (!tokens.length) continue;
    matchedMessageCount += 1;
    const messageTokens = new Set(tokens);
    for (const token of tokens) {
      const existing = counts.get(token);
      if (existing) existing.count += 1;
      else counts.set(token, { token, count: 1, messageCount: 0 });
    }
    for (const token of messageTokens) {
      const existing = counts.get(token);
      if (existing) existing.messageCount += 1;
    }
  }

  const safeLimit = Math.max(0, Math.floor(limit));
  return {
    words: Array.from(counts.values()).sort(compareWords).slice(0, safeLimit),
    analyzedMessageCount,
    matchedMessageCount,
    excludedMessageCount: analyzedMessageCount - matchedMessageCount,
  };
}
