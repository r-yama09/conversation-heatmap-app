import type { NormalizedConversation, NormalizedMessage } from "@/lib/chatgpt-export/types";

export type ConversationFilterValues = {
  query: string;
  startDate: string;
  endDate: string;
};

export type ConversationFilterResult = {
  conversations: NormalizedConversation[];
  error: string | null;
};

function normalizedQuery(value: string): string {
  return value.trim().toLocaleLowerCase("ja-JP");
}

function isValidDateInput(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function startOfJapaneseDay(value: string): number {
  return Date.parse(`${value}T00:00:00+09:00`);
}

function conversationDate(conversation: NormalizedConversation): number | null {
  const value = conversation.createdAt ?? conversation.updatedAt;
  return value === null || !Number.isFinite(value) ? null : value * 1000;
}

export function filterConversations(
  conversations: NormalizedConversation[],
  messages: NormalizedMessage[],
  filters: ConversationFilterValues,
): ConversationFilterResult {
  const query = normalizedQuery(filters.query);
  const startDate = filters.startDate.trim();
  const endDate = filters.endDate.trim();

  if ((startDate && !isValidDateInput(startDate)) || (endDate && !isValidDateInput(endDate))) {
    return { conversations: [], error: "開始日と終了日には正しい日付を指定してください。" };
  }
  if (startDate && endDate && startDate > endDate) {
    return { conversations: [], error: "開始日は終了日以前の日付を指定してください。" };
  }

  const messagesByConversation = new Map<string, string[]>();
  for (const message of messages) {
    if (message.role !== "user" && message.role !== "assistant") continue;
    const texts = messagesByConversation.get(message.conversationId) ?? [];
    texts.push(normalizedQuery(message.text));
    messagesByConversation.set(message.conversationId, texts);
  }

  const startTime = startDate ? startOfJapaneseDay(startDate) : null;
  const endTime = endDate ? startOfJapaneseDay(endDate) + 24 * 60 * 60 * 1000 : null;
  const filtered = conversations.filter((conversation) => {
    if (query) {
      const title = normalizedQuery(conversation.title);
      const body = messagesByConversation.get(conversation.conversationId) ?? [];
      if (!title.includes(query) && !body.some((text) => text.includes(query))) return false;
    }

    if (startTime !== null || endTime !== null) {
      const date = conversationDate(conversation);
      if (date === null || (startTime !== null && date < startTime) || (endTime !== null && date >= endTime)) return false;
    }
    return true;
  });

  return { conversations: filtered, error: null };
}
