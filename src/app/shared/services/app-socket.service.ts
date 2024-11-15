import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';
import { User } from '../../graphql/user/user';

@Injectable({
  providedIn: 'root',
})
export class AppSocketService {
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
        this.socket.on('disconnect', () => {
            console.warn('Socket disconnected, attempting to reconnect...');
            this.reconnectSocket();
        });
    }
    private reconnectSocket(): Promise<void> {
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

    getOneUserStatus(id: number): Observable<any> {
        return new Observable<any>(observer => {
            this.socket.emit('onlineUser', id);
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
        return new Observable<string>((observer) => {
            this.socket.on('receiveNotification', (message: string) => {
                observer.next(message);
            });
        });
    }

    notifyDoctors(newAppointemnt: any){
        if (this.socket && this.socket.connected) {
            this.socket.emit('notifyDoctors', newAppointemnt);
        } else {
            this.reconnectSocket().then(() => {
                this.socket.emit('notifyDoctors', newAppointemnt);
            });
        }  
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
