import type { PaginationMeta } from '@core/application/pagination/pagination';
import type { CheckInRecordDto } from '../../mappers/checkin.mapper';

export type CheckInStatsDto = {
  expected: number;
  checkedIn: number;
  absent: number;
  cancelled: number;
  waitlisted: number;
  attendanceRate: number;
  attendanceRateLabel: string;
};

export type CheckInBoardOutputDto = {
  records: CheckInRecordDto[];
  stats: CheckInStatsDto;
  meta: PaginationMeta;
};
