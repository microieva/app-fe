import _ from 'lodash-es';
import { BehaviorSubject } from 'rxjs';
import { Injectable } from '@angular/core';
import { AppNotification, CancelledAppointmentNotification, NewAppointmentNotification, NewMessageNotification } from '../types';


@Injectable({
   providedIn: 'root'
})
export class AppSnackbarService {
    private snackbarsSubject = new BehaviorSubject<Partial<AppNotification[]>>([]);
    snackbars$ = this.snackbarsSubject.asObservable();

        
    addSnackbar(info: Partial<AppNotification>) {
        const id = Date.now(); 
        const snackbars = this.snackbarsSubject.value;

        if (!snackbars.some(sn => _.isEqual(_.omit(sn, 'id'), info))) {
            const newSnackbar = { id, ...info } as AppNotification;
            this.snackbarsSubject.next([...snackbars, newSnackbar]);

            setTimeout(() => this.removeSnackbar(id), 10000);
        }
    }

    removeSnackbar(id: number) {
        const snackbars = this.snackbarsSubject.value.filter(snack => snack?.id !== id);
        this.snackbarsSubject.next(snackbars);
    }
}
