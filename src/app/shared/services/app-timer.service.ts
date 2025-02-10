import { EventEmitter, Injectable, Output } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { BehaviorSubject, Observable, Subscription, distinctUntilChanged, finalize, interval, map, startWith, take } from "rxjs";
import { DateTime, Duration } from "luxon";
import { AlertComponent } from "../components/app-alert/app-alert.component";
import { getHowLongAgo, getHowSoonUpcoming } from "../utils";
import { AppAuthService } from "./app-auth.service";

@Injectable({
    providedIn: 'root'
})
export class AppTimerService {   
    @Output() clock = new EventEmitter<string>();
    @Output() howSoonCountdown = new EventEmitter<string>();
    @Output() howLongAgoCountdown = new EventEmitter<string>();

    private countdown = new BehaviorSubject<string | null>(null);
    tokenCountdown$ = this.countdown.asObservable();
    tokenTimerSubscription: Subscription = new Subscription();

    private onLogout = new BehaviorSubject<boolean>(false);
    logout$ = this.onLogout.asObservable();

    private appointmentCountdownSubject = new BehaviorSubject<string | null>(null);
    appointmentCountdown$ = this.appointmentCountdownSubject.asObservable();
    private appointmentTimerSubscription!: Subscription;

    clockSubscription: Subscription | null = null;

    constructor(
        private dialog: MatDialog,
        private authService: AppAuthService
    ) {}

    startTokenTimer(timeStamp: string): void{
        const now = DateTime.local();
        const momentExpire = DateTime.fromISO(timeStamp); 
        const duration = momentExpire.diff(now).as('seconds');

        const source = interval(1000).pipe(
            take(duration + 1),
            finalize(() => this.onLogout.next(true))
        );

        this.tokenTimerSubscription = source.subscribe(async (val) => {
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
                const dialogRef = this.dialog.open(AlertComponent, { disableClose:true, data: { message: "Session expired, please login to renew" } });

                dialogRef.componentInstance.ok.subscribe(async () => {
                    //this.onLogout.next(true);
                    this.dialog.closeAll();
                    await this.authService.logOut();
                });
            }

            if (tokenCountdown === '00:00') {
                this.onLogout.next(true); 
            }

            this.countdown.next(tokenCountdown);
            return this.tokenTimerSubscription;
        });
    }

        startAppointmentTimer(timeStamp: string): void { 
            const now = DateTime.now().setZone('Europe/Helsinki').setLocale('fi-FI');
            const start = DateTime.fromISO(timeStamp, { setZone: true });
            const duration = start.diff(now).as('seconds');
            
            if (duration <= 0) {
                this.appointmentCountdownSubject.next('00:00:00');
                return;
            }
            
            interval(1000)
                .pipe(
                    take(duration + 1), 
                    map((elapsed) => {
                    const remainingSeconds = Math.max(0, duration - elapsed);
                    const timeLeft = Duration.fromObject({ seconds: remainingSeconds });
                        return timeLeft.toFormat('hh:mm:ss');
                    }),
                    distinctUntilChanged()
                )
                .subscribe({
                        next: (countdown) => {
                            this.appointmentCountdownSubject.next(countdown);
                        }
                });
        }
          
    startHowSoonCountdown(datetime: string): Observable<string> {
        return interval(1000).pipe(
            startWith(0), 
            map(() => getHowSoonUpcoming(datetime))
        );
    }
    startHowLongAgoCountdown(datetime: string): Observable<string> {
        return interval(1000).pipe(
            startWith(0), 
            map(() => getHowLongAgo(datetime))
        );
    }

    startClock(timeStamp: string): Subscription {
        if (this.clockSubscription) {
          this.clockSubscription.unsubscribe();
        }
    
        const startTime = DateTime.fromISO(timeStamp, { setZone: true }).setZone('Europe/Helsinki', { keepLocalTime: true });
        const source = interval(1000); 
    
        this.clockSubscription = source.subscribe(() => {
            const now = DateTime.now().setZone('Europe/Helsinki').setLocale('fi-FI'); 
            const forwardDuration = now.diff(startTime).as('seconds'); 
        
            const currentFormattedTime = startTime.plus({ seconds: forwardDuration }).toFormat('HH:mm:ss a');
            this.clock.emit(currentFormattedTime);
        });
    
        return this.clockSubscription;
      }
    
    cancelTokenTimer() {
            this.countdown.next(null); 
            if (this.tokenTimerSubscription) {
                this.tokenTimerSubscription.unsubscribe();
            }
    }
    cancelAppointmentTimer(){
        this.appointmentTimerSubscription.unsubscribe();
    }
    stopClock(): void {
        if (this.clockSubscription) {
          this.clockSubscription.unsubscribe();
          this.clockSubscription = null;
        }
      }
}

