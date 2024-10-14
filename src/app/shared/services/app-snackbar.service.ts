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
        const isOnMessagesPage = this.router.url.includes('messages');
        if (chatId && !isOnMessagesPage) {
            this.container?.addSnackbar(message, appointmentId, doctorRequestId, chatId, sender);
        } else if (!chatId){
            this.container?.addSnackbar(message, appointmentId, doctorRequestId, chatId, sender);
        }
    }
}
