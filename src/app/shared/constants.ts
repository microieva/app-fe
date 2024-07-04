import { authGuard } from "./services/app-auth-guard.service";
import { AppTreeNode } from "./types";
import { MatDateFormats } from '@angular/material/core';

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