import { Component, Input } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AppNotification, NewAppointmentNotification, NewDoctorRequestNotification, NewMessageNotification } from '../../types';
import { Observable } from 'rxjs';
import { AppSnackbarService } from '../../services/app-snackbar.service';

@Component({
    selector: 'app-snackbar',
    templateUrl: 'app-snackbar.component.html',
    styleUrls: ['app-snackbar.component.scss']
})
export class AppSnackbarContainerComponent {
    constructor(
        private router: Router,
        private activatedRoute: ActivatedRoute,
        private snackbarService: AppSnackbarService
    ){}

    @Input() snackbars$!: Observable<Partial<AppNotification[]>>;

    handleSnackbarOpen(snackbar: any){
        if (snackbar.doctorRequestId) {
            this.showDoctorRequest(snackbar);
        } else if (snackbar.chatId) {
            this.showChat(snackbar);
        } else {
            if (snackbar.message === 'New appointment request') {
                if (this.router.url.endsWith('appointments')) {
                    this.router.navigate(['/home/appointments']);
                }
                this.showAppointmentRequest(snackbar);
            } else {
                this.showAcceptedAppointment(snackbar);
            }
        }
    }

    showAcceptedAppointment(snackbar: any){
        this.router.navigate(['/home/appointments'], {
            relativeTo: this.activatedRoute,
            queryParams: { tab: 1, id: snackbar.appointmentId },
            queryParamsHandling: 'merge' 
        }); 
        
        this.snackbarService.removeSnackbar(snackbar.id);
    }
    showDoctorRequest(snackbar: NewDoctorRequestNotification){
        this.router.navigate(['/home/users'], { queryParams: { tab: 0, id: snackbar.doctorRequestId } }); 
        this.snackbarService.removeSnackbar(snackbar.id);
    }
    showAppointmentRequest(snackbar: NewAppointmentNotification){
        this.router.navigate(['/home/appointments'], { queryParams: { tab: 0, id: snackbar.appointmentId } }); 
        this.snackbarService.removeSnackbar(snackbar.id);
    }
    showChat(snackbar: NewMessageNotification) {
        this.router.navigate(['/home/messages']); 
        this.snackbarService.removeSnackbar(snackbar.id);
    }
}
