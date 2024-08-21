import { EventEmitter, Injectable, Output } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { Subscription, finalize, interval, take } from "rxjs";
import { DateTime, Duration } from "luxon";
import { AlertComponent } from "../components/app-alert/app-alert.component";

@Injectable({
    providedIn: 'root'
  })
  export class AppTimerService {   
    @Output() logout = new EventEmitter<boolean>(false);
    @Output() tokenCountdown = new EventEmitter<string>();
    @Output() nextAppointmentCountdown = new EventEmitter<string>();
    @Output() howSoonCountdown = new EventEmitter<string>();
    @Output() howLongAgoCountdown = new EventEmitter<string>();
    @Output() ok = new EventEmitter<boolean>(false);

    tokenTimerSubscription!: Subscription;
    appointmentTimerSubscription!: Subscription;

    constructor(
        private dialog: MatDialog
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
    
        this.tokenTimerSubscription = counter.subscribe((val) => {
            const remainingSeconds = duration - val;
            const seconds = Duration.fromObject({ seconds: remainingSeconds });
            
            let tokenCountdown: string;

            if (remainingSeconds < 3600) {
                tokenCountdown = seconds.toFormat('mm:ss'); 
            } else {
                const remainingHours = Math.floor(remainingSeconds / 3600);
                const remainingMinutes = Math.floor((remainingSeconds % 3600) / 60);
                tokenCountdown = `${remainingHours}h ${remainingMinutes}min`;
            }
    
            if (tokenCountdown === '00:05') {
                const dialogRef = this.dialog.open(AlertComponent, {data: {message: "Session expired, please login to renew"}});
    
                dialogRef.componentInstance.ok.subscribe((value) => {
                    if (value) {
                        this.logout.emit(true); 
                        this.dialog.closeAll();
                    }
                });
            }
    
            if (tokenCountdown === '00:00') {
                this.logout.emit(true); 
            }
    
            this.tokenCountdown.emit(tokenCountdown);
        });
    
        return this.tokenTimerSubscription;
    }

    startAppointmentTimer(timeStamp: string) {
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
    
        this.appointmentTimerSubscription = counter.subscribe((val) => {
            const remainingSeconds = duration - val;
            const seconds = Duration.fromObject({ seconds: remainingSeconds });
            let appointmentCountdown: string = seconds.toFormat('hh:mm:ss'); 

            if (appointmentCountdown === '00:05:00') {
                const displayTime = `\n Starting at ${DateTime.fromISO(timeStamp).toFormat('hh:mm a')}`
                this.dialog.open(AlertComponent, {data: { message: `You have an appointment in 5 min, at ${displayTime}`}})
            }
            this.nextAppointmentCountdown.emit(appointmentCountdown);
        });
    
        return this.appointmentTimerSubscription;
    }  
    
    cancelTokenTimer() {
        this.tokenTimerSubscription.unsubscribe();
    }
    cancelAppointmentTimer(){
        this.appointmentTimerSubscription.unsubscribe();
    }
}

