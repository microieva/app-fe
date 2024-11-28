import { Injectable } from '@angular/core';
import { DateTime } from 'luxon';

@Injectable({
  providedIn: 'root',
})
export class AppTimeZoneService {
  private defaultTimeZone = 'UTC';

  convertToTimeZone(date: string | Date, timeZone: string = this.defaultTimeZone): string | null{
    return DateTime.fromJSDate(new Date(date)).setZone(timeZone).toISO();
  }

  toLocalTime(date: string): string | null{
    return DateTime.fromISO(date, { zone: 'utc' }).toLocal().toISO();
  }

  toUTC(date: string): string | null{
    return DateTime.fromISO(date).toUTC().toISO();
  }
}

