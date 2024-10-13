import { Injectable, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';
import { User } from '../../graphql/user/user';

@Injectable({
  providedIn: 'root',
})
export class AppSocketService implements OnInit {
    private socket: Socket;

    constructor() {
        this.socket = io(environment.socketUrl, {
            withCredentials: true,
            transports: ['websocket'],
            extraHeaders: {
              'Content-Type': 'application/json',  
              'x-apollo-operation-name': 'HealthCenter',  
            }
        }); 
    }

    ngOnInit(): void {
        this.socket.on("connect_error", (err: any) => {
            // the reason of the error, for example "xhr poll error"
            console.log('ERROR MSG: ', err.message);
          
            // some additional description, for example the status code of the initial HTTP response
            console.log('ERROR DESCRIPTION: ', err.description);
          
            // some additional context, for example the XMLHttpRequest object
            console.log('ERROR CONTEXT: ', err.context);
          });
    }
    registerUser(user: User) {
        if (this.socket && this.socket.connected) {
            this.socket.emit('registerUser', user);
        } else {
            console.error('Socket not connected');
        }
    }

    getOnlineUsers(): Observable<any[]> {
        return new Observable<any[]>(observer => {
            this.socket.on('onlineUsers', (onlineUsers: any[]) => {
                observer.next(onlineUsers);
            });

            return () => this.socket.off('onlineUsers');
        });
    }

    getOneUserStatus(id: number): Observable<any> {
        return new Observable<any>(observer => {
            this.socket.emit('onlineUser', id);
            this.socket.on('online', (online) => {
                observer.next(online);
            });

            return () => this.socket.off('online');
        });
    }

    requestOnlineUsers() {
        this.socket.emit('getOnlineUsers');
    }

    requestOneUserStatus(id: number) {
        this.socket.emit('getOneUserStatus', id);
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

    notifyDoctors(newAppointemnt: any){
        this.socket.emit('notifyDoctors', newAppointemnt);
    }

    newAppointmentRequest() {
        return new Observable<any>((observer) => {
            this.socket.on('newAppointmentRequest', (info: any) => {
                observer.next(info);
            });

            return () => {
                this.socket.off('newAppointmentRequest');
            };
        });
    }

    notifyDoctor(info: any){
        this.socket.emit('notifyDoctor', info);
    }
    
    deletedAppointmentInfo() {
        return new Observable<any>((observer) => {
            this.socket.on('deletedAppointmentInfo', (info: any) => {
                observer.next(info);
            });

            return () => {
                this.socket.off('deletedAppointmentInfo');
            };
        });
    }
}
