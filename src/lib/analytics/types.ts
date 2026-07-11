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
