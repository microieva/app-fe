import { EventEmitter, Injectable, Output } from "@angular/core";
import { Subscription, finalize, interval, take } from "rxjs";
import { DateTime, Duration } from "luxon";
import { AppDialogService } from "./app-dialog.service";

@Injectable({
    providedIn: 'root'
  })
  export class AppTimerService {   
    @Output() logout = new EventEmitter<boolean>(false);
    @Output() tokenCountDown = new EventEmitter<string>();
    @Output() nextAppointmentCountDown = new EventEmitter<string>();
    @Output() ok = new EventEmitter<boolean>(false);

    subscription!: Subscription;

    constructor(
        private dialog: AppDialogService
    ) {}

    startTokenTimer(timeStamp: string) {
        const now = DateTime.local();
        const momentExpire = DateTime.fromISO(timeStamp); 
        const duration = momentExpire.diff(now).as('seconds');
    
        const source = interval(1000);
        const counter = source.pipe(
            take(duration + 1), 
            finalize(() => {
                this.logout.emit(true);  
            }) 
        );
    
        this.subscription = counter.subscribe((val) => {
            const remainingSeconds = duration - val;
            const seconds = Duration.fromObject({ seconds: remainingSeconds });
            
            let tokenCountDown: string;

            if (remainingSeconds < 3600) {
                tokenCountDown = seconds.toFormat('mm:ss'); 
            } else {
                const remainingHours = Math.floor(remainingSeconds / 3600);
                const remainingMinutes = Math.floor((remainingSeconds % 3600) / 60);
                tokenCountDown = `session time: ${remainingHours}h ${remainingMinutes}min remaining`;
            }
    
            if (tokenCountDown === '00:05') {
                const dialogRef = this.dialog.open({data: { isAlert: true, message: "Session expired, please login to renew"}});
    
                dialogRef.componentInstance.ok.subscribe((value) => {
                    if (value) {
                        this.logout.emit(true); 
                        this.dialog.close();
                    }
                });
            }
    
            if (tokenCountDown === '00:00') {
                this.logout.emit(true); 
            }
    
            this.tokenCountDown.emit(tokenCountDown);
        });
    
        return this.subscription;
    }

    startAppointmentTimer(timeStamp: string) {
        console.log('appointment timer start')
        const now = DateTime.local();
        const start = DateTime.fromISO(timeStamp); 
        const duration = start.diff(now).as('seconds');

        const source = interval(1000);
        const counter = source.pipe(
            take(duration + 1), 
            finalize(() => {
                console.log('FINALIZE')
            }) 
        );
    
        this.subscription = counter.subscribe((val) => {
            const remainingSeconds = duration - val;
            const seconds = Duration.fromObject({ seconds: remainingSeconds });
            let appointmentCountDown: string;

            if (remainingSeconds < 3600) {
                appointmentCountDown = seconds.toFormat('hh:mm:ss'); 
            } else {
                const remainingHours = Math.floor(remainingSeconds / 3600);
                const remainingMinutes = Math.floor((remainingSeconds % 3600) / 60);
                appointmentCountDown = `${remainingHours}h ${remainingMinutes}min`
            }
            
            if (appointmentCountDown === '05:00') {
                const displayTime = `\n Starting at ${DateTime.fromISO(timeStamp).toFormat('hh:mm')}`
                this.dialog.open({data: {isAlert: true, message: `You have an appointment in 5 min${displayTime}`}})
            }
            this.nextAppointmentCountDown.emit(appointmentCountDown);
        });
    
        return this.subscription;
    }   
    
    cancelTimer() {
        this.subscription.unsubscribe();
    }
}

