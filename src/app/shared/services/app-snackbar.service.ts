import { Injectable } from '@angular/core';
import { AppSnackbarContainerComponent } from '../components/app-snackbar/app-snackbar.component';
import { Router } from '@angular/router';


@Injectable({
   providedIn: 'root'
})
export class AppSnackbarService {
   private container: AppSnackbarContainerComponent | undefined;
   constructor(private router: Router) {}

    setContainer(container: AppSnackbarContainerComponent) {
        this.container = container;
    }

    show(message: string, appointmentId: number | null, doctorRequestId: number | null, chatId: number | null, sender :string | null) {
        if (chatId && !this.router.url.includes('messages')) {
            this.container?.addSnackbar(message, appointmentId, doctorRequestId, chatId, sender);
        } else {
            this.container?.addSnackbar(message, appointmentId, doctorRequestId, chatId, sender);
        }
    }
}
