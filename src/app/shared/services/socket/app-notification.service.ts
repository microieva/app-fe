import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AppSocketService } from './app-socket.service';

@Injectable({ providedIn: 'root' })
export class AppNotificationService {
    constructor(private socketService: AppSocketService) {}

    public onAppointmentCreated(event:string): Observable<any> {
        return this.socketService.fromEvent(event);
    }

    public onAppointmentAccepted(event:string): Observable<any> {        
       return this.socketService.fromEvent(event);
    }

    public onAppointmentUpdated(event:string): Observable<any> {          
        return this.socketService.fromEvent(event);
    }
    public onAppointmentCancelled(event:string): Observable<any> {         
        return this.socketService.fromEvent(event);
    }
    public onAppointmentDeleted(event:string): Observable<any> {        
        return this.socketService.fromEvent(event);
    }

    public onChatMessageCreated(event:string): Observable<any> {        
        return this.socketService.fromEvent(event);
    }

    public onFeedbackCreated(event:string): Observable<any> {          
        return this.socketService.fromEvent(event);
    }

    public onDoctorRequestCreated(event:string): Observable<any> {         
        return this.socketService.fromEvent(event);
    }

    public onRecordCreated(event:string): Observable<any> {         
        return this.socketService.fromEvent(event);
    }
}