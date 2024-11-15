import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
    selector: 'app-snackbar',
    templateUrl: 'app-snackbar.component.html',
    styleUrls: ['app-snackbar.component.scss']
})
export class AppSnackbarContainerComponent {
    constructor(
        private router: Router,
        private activatedRoute: ActivatedRoute
    ){}
    snackbars: { message: string, appointmentId: number | null, doctorRequestId: number | null, chatId: number | null, sender: string | null }[] = [];

    addSnackbar(message: string, appointmentId: number | null, doctorRequestId: number | null, chatId: number | null, sender: string | null) {
        this.snackbars.push({message, appointmentId, doctorRequestId, chatId, sender});
        setTimeout(() => this.removeSnackbar(), 10000); 
    }

    removeSnackbar() {
        this.snackbars.shift();
    }

    handleSnackbarOpen(snackbar: any){
        if (snackbar.doctorRequestId) {
            this.showDoctorRequest(snackbar.doctorRequestId);
        } else if (snackbar.chatId) {
            this.showChat(snackbar.chatId);
        } else {
            if (snackbar.message === 'New appointment request') {
                if (this.router.url.endsWith('appointments')) {
                    this.router.navigate(['/home/appointments']);
                }
                this.showAppointmentRequest(snackbar.appointmentId);
            } else {
                this.showAcceptedAppointment(snackbar.appointmentId);
            }
        }
    }

    showAcceptedAppointment(id: number){
        this.router.navigate(['/home/appointments'], {
            relativeTo: this.activatedRoute,
            queryParams: { tab: 1, id },
            queryParamsHandling: 'merge' 
        }); 
        
        const index = this.snackbars.findIndex(snack => snack.appointmentId === id);
        if (index !== -1) this.snackbars.splice(index, 1);
    }
    showDoctorRequest(id: number){
        this.router.navigate(['/home/users'], { queryParams: { tab: 0, id } }); 
        const index = this.snackbars.findIndex(snack => snack.doctorRequestId === id);
        if (index !== -1) this.snackbars.splice(index, 1);
    }
    showAppointmentRequest(id: number){
        this.router.navigate(['/home/appointments'], { queryParams: { tab: 0, id } }); 
        const index = this.snackbars.findIndex(snack => snack.appointmentId === id);
        if (index !== -1) this.snackbars.splice(index, 1);
    }
    showChat(id: number) {
        this.router.navigate(['/home/messages']); 
        const index = this.snackbars.findIndex(snack => snack.appointmentId === id);
        if (index !== -1) this.snackbars.splice(index, 1);
        this.snackbars.shift();
    }
}
