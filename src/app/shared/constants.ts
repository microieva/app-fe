import { AppTreeNode } from "./types";
import { MatDateFormats } from '@angular/material/core';
import { EventInput } from '@fullcalendar/core';

export const TREE_DATA: AppTreeNode[] = [
    {
      name: 'Test Apps',
      isAuth: false
      //children: [{name: 'Apple'}, {name: 'Banana'}, {name: 'Fruit loops'}],
    },
    {
      name: 'My Account',
      //children: [{name: 'Apple'}, {name: 'Banana'}, {name: 'Fruit loops'}],
      isAuth: true
    },
    {
      name: 'Appointments',
      isAuth: true
    },
    {
      name: 'Medical Records',
      isAuth: true
    }
];

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
