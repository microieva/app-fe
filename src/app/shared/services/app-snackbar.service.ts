import _ from 'lodash-es';
import { BehaviorSubject } from 'rxjs';
import { Injectable } from '@angular/core';
import { AppNotificationEvent } from '../types';


@Injectable({
   providedIn: 'root'
})
export class AppSnackbarService {
    private snackbarsSubject = new BehaviorSubject<any[]>([]);
    snackbars$ = this.snackbarsSubject.asObservable();

        
    addSnackbar(info: AppNotificationEvent) {
        const id = Date.now(); 
        const snackbars = this.snackbarsSubject.value;

        if (!snackbars.some(snackbar => _.isEqual(_.omit(snackbar, 'id'), info))) {
            const newSnackbar = { id, ...info } as AppNotificationEvent;
            this.snackbarsSubject.next([...snackbars, newSnackbar]);

            setTimeout(() => this.removeSnackbar(id), 10000);
        }
    }

    removeSnackbar(id: number) {
        const snackbars = this.snackbarsSubject.value.filter(snack => snack?.id !== id);
        this.snackbarsSubject.next(snackbars);
    }

    clearSnackbars(){
        this.snackbarsSubject.next([]);
    }
}
