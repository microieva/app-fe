import { MatDateFormats } from '@angular/material/core';
import { EventInput } from '@fullcalendar/core';

export const ME_QUERY = ` query {
                me {
                    id
                    userRole
                    firstName
                    lastName
                    dob
                    phone
                    email
                    streetAddress
                    city
                    postCode
                    updatedAt
                    lastLogOutAt
                }
            }`

export const LUXON_DATE_FORMATS: MatDateFormats = {
  parse: {
    dateInput: 'yyyy-MM-dd',
  },
  display: {
    dateInput: 'yyyy-MM-dd',
    monthYearLabel: 'MMM yyyy',
    dateA11yLabel: 'yyyy-MM-dd',
    monthYearA11yLabel: 'MMMM yyyy',
  }
};

let eventGuid = 0;
const TODAY_STR = new Date().toISOString().replace(/T.*$/, ''); // YYYY-MM-DD of today

export const INITIAL_EVENTS: EventInput[] = [
  {
    id: createEventId(),
    title: 'All-day event',
    start: TODAY_STR
  },
  {
    id: createEventId(),
    title: 'Timed event',
    start: TODAY_STR + 'T12:00:00'
  }
];

export function createEventId() {
  return String(eventGuid++);
}
