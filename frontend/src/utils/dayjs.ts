import dayjs, { type Dayjs } from 'dayjs';
import utc from 'dayjs/plugin/utc';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(utc);
dayjs.extend(relativeTime);

// Extend Dayjs type to include plugin methods
declare module 'dayjs' {
  interface Dayjs {
    fromNow(): string;
  }
}

export default dayjs;
