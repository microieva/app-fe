import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';

@Injectable({
  providedIn: 'root',
})
export class AppNotificationService {
    private socket: Socket;

    constructor() {
        this.socket = io('http://localhost:4001'); 
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
