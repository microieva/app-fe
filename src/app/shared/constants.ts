import { EventInput } from '@fullcalendar/core';

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


export const DEMO_CREDENTIALS= `
  <p><strong>Choose Administrator path to log in with demo credentials</strong></p>
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

  export const SIGNICAT_CREDENTIALS= `
  <div class="flex-row">
  <h4>Welcome !</h4>
  </div>
  <p><strong>Choose Patient path to log in with FTN eIDs (demo users)</strong></p>
  <p>Authorizes access to Health Center as a patient</p>
  <p><em class="color--white--warm">Follow the link to view all credentials of FTN banks for test users of Finnish eIDs. OP and Aktia banks offer auto-filled authentication flow.</em></p>
  <div>
    <a href="https://developer.signicat.com/identity-methods/ftn/demo-ftn/" target="_blank" rel="noopener noreferrer">
      <div class="flex-row">
        <h5>Demo Credentials</h5>
        <span class="material-symbols-outlined" style="font-size: 1.5rem;">
                open_in_new
            </span>
      </div>  
    </<a>
  </div>
  
  `

  export const GOOGLE_CREDENTIALS= `
  <p><strong>Choose Doctor path to log in with your google credentials</strong></p>
  <p>Authorizes access to Health Center as a doctor</p>
  <p><em class="color--white--warm">First attempt will send the account activation request to the admin. Feel free to send the request, then log in as admin to approve the account activation request. Then you can login with your google account as a doctor.</em></p>
  `
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