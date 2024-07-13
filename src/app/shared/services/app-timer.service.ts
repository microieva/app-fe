import { EventEmitter, Injectable, Output } from "@angular/core";
import { Subscription, finalize, interval, take } from "rxjs";
import { DateTime, Duration } from "luxon";
import { AppDialogService } from "./app-dialog.service";

@Injectable({
    providedIn: 'root'
  })
  export class AppTimerService {   
    @Output() logout = new EventEmitter<boolean>(false);
    @Output() time = new EventEmitter<string>();
    @Output() ok = new EventEmitter<boolean>(false);

    subscription!: Subscription;

    constructor(
        private dialog: AppDialogService
    ) {}

    startTimer(expire: string) {
        const now = DateTime.local().toISO() 
        const momentNow = DateTime.fromISO(now);
        const momentExpire = DateTime.fromISO(expire); 
        const duration = momentExpire.diff(momentNow).as('seconds');

        const source = interval(1000);
        const example = source.pipe(
            take(duration + 1), 
            finalize(() => {
                this.logout.emit(true);  
                this.cancelTimer();
            }) 
        );
        this.subscription = example.subscribe((val) => {
            const remainingSeconds = duration - val; // remaining time in seconds
            const printing = Duration.fromObject({ seconds: remainingSeconds });
            const formattedTime = printing.toFormat('mm:ss'); 
            if (formattedTime === '00:05') {
                this.dialog.open({data: { message: "Session expired, please login to renew"}});

                // dialogRef.componentInstance.ok.subscribe((value)=> {
                //     if (value) {
                //         this.logout.emit(true); 
                //     }
                // })
            }
            if (formattedTime === '00:00') {
                this.logout.emit(true); 
            }
            this.time.emit(formattedTime);
        });
        return this.subscription;
    }
    cancelTimer() {
        this.subscription.unsubscribe();
    }
}

