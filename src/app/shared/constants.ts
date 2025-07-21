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
export const APPOINTMENT_CREATED = 'APPOINTMENT_CREATED';
export const APPOINTMENT_ACCEPTED = 'APPOINTMENT_ACCEPTED';
export const APPOINTMENT_UPDATED = 'APPOINTMENT_UPDATED';
export const APPOINTMENT_DELETED = 'APPOINTMENT_DELETED';
export const APPOINTMENT_CANCELLED = 'APPOINTMENT_CANCELLED';
export const MESSAGE_CREATED = 'MESSAGE_CREATED';
export const MESSAGE_READ = 'MESSAGE_READ';
export const FEEDBACK_CREATED = 'FEEDBACK_CREATED';
export const DOCTOR_REQUEST_CREATED = 'DOCTOR_REQUEST_CREATED';
export const RECORD_CREATED = 'RECORD_CREATED';
export const USER_UPDATED = 'USER_UPDATED'; 
export const DOCTOR_ROOM_UPDATE = 'DOCTOR_ROOM_UPDATE';
export const USER_STATUS = 'USER_STATUS';
export const DOCTOR_ACCOUNT_CREATED = 'DOCTOR_ACCOUNT_CREATED';
