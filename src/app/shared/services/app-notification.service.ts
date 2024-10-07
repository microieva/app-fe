import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AppNotificationService {
    private socket: Socket;

    constructor() {
        this.socket = io(environment.socketUrl); 
    }

    sendNotification(message: string) {
        this.socket.emit('sendNotification', message);
    }

    receiveNotification() {
        return new Observable<string>((observer) => {
        this.socket.on('receiveNotification', (message: string) => {
            observer.next(message);
        });

        return () => {
            this.socket.off('receiveNotification');
        };
        });
    }
}
