import { Pipe, PipeTransform } from '@angular/core';
import { DateTime } from 'luxon';

@Pipe({ name: 'dateFormat' })
export class AppDateFormatPipe implements PipeTransform {
    private readonly defaultFormat = 'dd MMM yyyy, HH:mm';

    transform(
        value: DateTime | string | null, 
        timezone: string,
        format?: string,
    ): string {
        if (!value) return '';
        
        let dt = typeof value === 'string' 
            ? DateTime.fromISO(value, { zone: 'utc' })
            : DateTime.isDateTime(value) ? value : DateTime.fromJSDate(value);
            
        if (Boolean(timezone)) {
            const helsinki = "Europe/Helsinki"
            dt = dt.setZone(helsinki);
        } else {
            dt = dt.toUTC();
        }
        
        return dt.toFormat(format || this.defaultFormat);
    }
}
