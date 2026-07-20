export type HeatmapWeekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type HeatmapCell = { weekday: HeatmapWeekday; hour: number; count: number };

export type WeekdayHourHeatmapResult = {
  cells: HeatmapCell[];
  maxCount: number;
  includedMessageCount: number;
  excludedMessageCount: number;
  timeZone: "Asia/Tokyo";
};

export type FrequentWord = {
  token: string;
  count: number;
  messageCount: number;
};

export type FrequentWordsResult = {
  words: FrequentWord[];
  analyzedMessageCount: number;
  matchedMessageCount: number;
  excludedMessageCount: number;
};

export type MonthlyActivityItem = {
  month: string;
  conversationCount: number;
  userMessageCount: number;
  assistantMessageCount: number;
  totalMessageCount: number;
};

export type MonthlyActivityResult = {
  months: MonthlyActivityItem[];
  peakTotalMonth: MonthlyActivityItem | null;
  peakUserMonth: MonthlyActivityItem | null;
  analyzedMonthCount: number;
  datedMessageCount: number;
  excludedUnknownDateCount: number;
};

export type WrappedPeakMonth = {
  monthKey: string;
  label: string;
  totalMessageCount: number;
  userMessageCount: number;
  assistantMessageCount: number;
  share: number;
};

export type WrappedPeakUsage = {
  weekday: HeatmapWeekday | null;
  weekdayMessageCount: number;
  hour: number | null;
  hourMessageCount: number;
  daypart: "深夜" | "朝" | "昼" | "夜" | null;
  messageCount: number;
};

export type WrappedLongestConversation = {
  conversationId: string;
  title: string;
  messageCount: number;
  userMessageCount: number;
  assistantMessageCount: number;
  characterCount: number;
  startedAt: number | null;
};

export type WrappedSummary = {
  period: { startAt: number | null; endAt: number | null; monthCount: number };
  totals: { conversationCount: number; messageCount: number; userMessageCount: number; assistantMessageCount: number };
  peakMonth: WrappedPeakMonth | null;
  peakUsage: WrappedPeakUsage;
  topWords: FrequentWord[];
  messageRatio: { user: number; assistant: number; userPercentage: number; assistantPercentage: number };
  longestConversation: WrappedLongestConversation | null;
  insights: string[];
};
