export interface Report {
  id: string;
  username: string;
  cronSchedule: string;
  visualizationId: string;
  receiver: string;
  index: string;
  request: string;
  title: string;
  duration: number;
  durationUnit: string;
  timeFilter: number;
  timeFilterUnit: string;
  columns: string;
}
