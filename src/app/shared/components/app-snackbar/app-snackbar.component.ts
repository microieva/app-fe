import { Component, Input } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { AppSnackbarService } from '../../services/app-snackbar.service';
import { FeedbackComponent } from '../../../graphql/feedback/feedback/feedback.component';
import { AppSnackbar } from '../../types';
import { 
    APPOINTMENT_CREATED, 
    APPOINTMENT_ACCEPTED, 
    MESSAGE_CREATED, 
    FEEDBACK_CREATED, 
    DOCTOR_REQUEST_CREATED, 
    RECORD_CREATED 
} from '../../constants';

@Component({
    selector: 'app-snackbar',
    templateUrl: 'app-snackbar.component.html',
    styleUrls: ['app-snackbar.component.scss']
})
export class AppSnackbarContainerComponent  {
    @Input() snackbars$!: Observable<any>;
    constructor(
        private router: Router,
        private activatedRoute: ActivatedRoute,
        private snackbarService: AppSnackbarService,
        private dialog: MatDialog
    ){}

    onOpen(snackbar: AppSnackbar){
        switch (snackbar.event) {
            case APPOINTMENT_CREATED:
                this.router.navigate(['/home/appointments'], { queryParams: { tab: 0, id: snackbar.data.id } }); 
                this.snackbarService.removeSnackbar(snackbar.id);
                break;
            case APPOINTMENT_ACCEPTED:
                 this.router.navigate(['/home/appointments'], {
                    relativeTo: this.activatedRoute,
                    queryParams: { tab: 1, id: snackbar.data.id },
                    queryParamsHandling: 'merge' 
                }); 
                this.snackbarService.removeSnackbar(snackbar.id);
                break;
            case MESSAGE_CREATED:
                this.router.navigate(['/home/messages']); 
                this.snackbarService.removeSnackbar(snackbar.id);
                break; 
            case FEEDBACK_CREATED:
                this.dialog.open(FeedbackComponent, {data:{feedbackId: snackbar.data.id}});
                this.snackbarService.removeSnackbar(snackbar.id);
                break;
            case DOCTOR_REQUEST_CREATED:
                this.router.navigate(['/home/users'], { queryParams: { tab: 0, id: snackbar.data.id } }); 
                this.snackbarService.removeSnackbar(snackbar.id);
                break;
            case RECORD_CREATED:
                this.router.navigate(['/home/records']); 
                this.snackbarService.removeSnackbar(snackbar.id);
                break; 
        }
    }

}
