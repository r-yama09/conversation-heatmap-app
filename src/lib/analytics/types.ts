export type HeatmapWeekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type HeatmapCell = { weekday: HeatmapWeekday; hour: number; count: number };

export type WeekdayHourHeatmapResult = {
  cells: HeatmapCell[];
  maxCount: number;
  includedMessageCount: number;
  excludedMessageCount: number;
  timeZone: "Asia/Tokyo";
};
