import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';
import { User } from '../../graphql/user/user';

@Injectable({
  providedIn: 'root',
})
export class AppSocketService {
    private socket: Socket;
    private refreshSub = new BehaviorSubject<boolean>(false);
    refresh$ = this.refreshSub.asObservable();

    constructor() {
        this.socket = io(environment.socketUrl, {
            withCredentials: true,
            transports: ['websocket'],
            extraHeaders: {
              'Content-Type': 'application/json',  
              'x-apollo-operation-name': 'HealthCenter',  
            }
        }); 
        this.socket.connect();
        this.listenForEvents();
        this.socket.on('disconnect', () => {
            console.warn('Socket disconnected, attempting to reconnect...');
            this.reconnectSocket();
        });
    }
    listenForEvents(){
        this.socket.on('refreshEvent', (isUpdated: boolean) => {
            this.refreshSub.next(isUpdated);
          });
    }
    reconnectSocket(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.socket.connected) {
                this.socket.connect();  
                this.socket.on('connect', () => {
                    console.log('Reconnected successfully');
                    resolve();
                });

                this.socket.on('connect_error', (error) => {
                    console.error('Reconnection failed', error);
                    reject(error);
                    this.reconnectSocket();
                });
            } else {
                resolve(); 
            }
        });
    }
    registerUser(user: User) {
        if (this.socket && this.socket.connected) {
            this.socket.emit('registerUser', user);
        } else {
            console.error('Socket not connected');
            this.reconnectSocket().then(() => {
                this.socket.emit('registerUser', user);
            });
        }
    }

    getOnlineUsers(): Observable<any[]> {
        return new Observable<any[]>(observer => {
            this.socket.on('onlineUsers', (onlineUsers: any[]) => {
                observer.next(onlineUsers);
            });
        });
    }

    getMissedAppointmentsCount(): Observable<boolean> {
        return new Observable<boolean>(observer => {
            this.socket.on('updateMissedAppointmentsCount', (isUpdated: boolean) => {
                observer.next(isUpdated);
            });
        });
    }
    refresh(): Observable<boolean> {
        return new Observable<boolean>(observer => {
            this.socket.on('refresh', (isUpdated: boolean) => {
                observer.next(isUpdated);
            });
        });
    }

    getOneUserStatus(id: number): Observable<any> {
        this.socket.emit('onlineUser', id);
        return new Observable<any>(observer => {
            this.socket.on('online', (online) => {
                observer.next(online);
            });
        });
    }

    requestOnlineUsers() {
        if (this.socket && this.socket.connected) {
            this.socket.emit('getOnlineUsers');
        } else {
            this.reconnectSocket().then(() => {
                this.socket.emit('getOnlineUsers');
            });
        }
    }
    requestCountMissedAppointments(){
        if (this.socket && this.socket.connected) {
            this.socket.emit('getMissedAppointmentsCount');
        } else {
            this.reconnectSocket().then(() => {
                this.socket.emit('getMissedAppointmentsCount');
            });
        }
    }

    requestOneUserStatus(id: number) {
        if (this.socket && this.socket.connected) {
            this.socket.emit('getOneUserStatus', id);
        } else {
            this.reconnectSocket().then(() => {
                this.socket.emit('getOneUserStatus', id);
            });
        }
    }

    sendNotification(message: string) {
        if (this.socket && this.socket.connected) {
            this.socket.emit('sendNotification', message);
        } else {
            this.reconnectSocket().then(() => {
                this.socket.emit('sendNotification', message);
            });
        }
    }

    receiveNotification() {
        return new Observable<any>((observer) => {
            this.socket.on('receiveNotification', (message) => {
                observer.next(message);
            });
        });
    }

    notifyDoctors(newAppointemnt: any){
        if (this.socket && this.socket.connected) {
            this.socket.emit('notifyDoctors', newAppointemnt);
        } 
        // else {
        //     this.reconnectSocket().then(() => {
        //         this.socket.emit('notifyDoctors', newAppointemnt);
        //     });
        // }  
    }

    newAppointmentRequest() {
        return new Observable<any>((observer) => {
            this.socket.on('newAppointmentRequest', (info: any) => {
                observer.next(info);
            });
        });
    }

    notifyDoctor(info: any){
        if (this.socket && this.socket.connected) {
            this.socket.emit('notifyDoctor', info);
        } else {
            this.reconnectSocket().then(() => {
                this.socket.emit('notifyDoctor', info);
            });
        }    
    }
    
    deletedAppointmentInfo() {
        return new Observable<any>((observer) => {
            this.socket.on('deletedAppointmentInfo', (info: any) => {
                observer.next(info);
            });
        });
    }
}
