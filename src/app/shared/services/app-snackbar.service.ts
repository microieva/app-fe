import { Injectable } from '@angular/core';
import { AppSnackbarContainerComponent } from '../components/app-snackbar/app-snackbar.component';


@Injectable({
   providedIn: 'root'
})
export class AppSnackbarService {
   private container: AppSnackbarContainerComponent | undefined;

    setContainer(container: AppSnackbarContainerComponent) {
        this.container = container;
    }

    show(message: string, appointmentId: number | null, doctorRequestId: number | null) {
        // if (appointmentId) {
        //     this.container?.addSnackbar(message, appointmentId, null);
        // } else if (doctorRequestId) {
        //     this.container?.addSnackbar(message, null, doctorRequestId);
        // } else if (!appointmentId && !doctorRequestId) {
        //     this.container?.addSnackbar(message, null, null);
        // }
        this.container?.addSnackbar(message, appointmentId, doctorRequestId);
    }
}
