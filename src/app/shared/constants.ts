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


export const POPUP_CREDENTIALS= `
  <div class="flex-row">
  <h4>Welcome !</h4>
  <div class="hover--scale" style="float:right;" (click)="dialogRef.close()"> <span class="material-symbols-outlined">close</span></div>
  </div>
  <p>Choose Administrator path to log in with demo credentials</p>
  <div>
  <p><em class="color--white--warm">ADMIN: </em></p>
  <p><strong>Email:</strong> <span class="text--primary"> admin@email.com </span></p>
  <p><strong>Password:</strong> <span class="text--primary"> demo </span></p> 
  </div>
  <div>
  <p><em class="color--white--warm">DOCTOR: </em></p>
  <p><strong>Email:</strong> <span class="text--primary"> doctor@email.com </span></p>
  <p><strong>Password:</strong> <span class="text--primary"> demo </span></p> 
  </div>
  <div>
  <p><em class="color--white--warm">PATIENT: </em></p>
  <p><strong>Email:</strong> <span class="text--primary"> user@email.com </span></p>
  <p><strong>Password:</strong> <span class="text--primary"> demo </span></p> 
  </div>
  `

// export const POPUP_CREATE_APPOINTMENT = `
// <div class="flex-column" style="justify-self: center;">
// <a [routerLink]="['home/calendar']">
//   Book Appointment
//   </a>
// </div>`