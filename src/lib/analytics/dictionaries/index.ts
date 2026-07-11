import { ENGLISH_STOP_WORDS } from "./englishStopWords";
import { JAPANESE_STOP_WORDS } from "./japaneseStopWords";

export { ENGLISH_STOP_WORDS, JAPANESE_STOP_WORDS };

export const FREQUENT_WORD_STOP_WORDS: ReadonlySet<string> = new Set([
  ...JAPANESE_STOP_WORDS,
  ...ENGLISH_STOP_WORDS,
]);
