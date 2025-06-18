import { Injectable, OnDestroy } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AppAuthService } from '../app-auth.service';


@Injectable({ providedIn: 'root' })
export class AppSocketService implements OnDestroy {
    private socket: Socket;
    private connectedSubject = new BehaviorSubject<boolean>(false);
    public connected$ = this.connectedSubject.asObservable();

    constructor(private authService: AppAuthService) {
        this.socket = io(environment.socketUrl, {
            transports: ['websocket'],
            autoConnect: false,
            auth: (cb) => {
              const token = this.authService.getToken();
              cb({ token });
            }
          });
        this.initializeSocket();
    }

    private initializeSocket(): void {
        this.socket.on('connect', () => {
            this.connectedSubject.next(true);
        });

        this.socket.on('disconnect', () => {
            this.connectedSubject.next(false);
        });
    }

    public connect(user: any): void {
        if (this.socket && !this.socket.connected) {
            
            this.socket.auth = { 
                ...this.socket.auth,
                ...user
            };
            this.socket.connect();
        }
        this.socket.emit('join_room', user);
    }

    public disconnect(): void {
        this.socket.disconnect();
    }

    public emit(event: string, data?: any): void {
        this.socket.emit(event, data);
    }

    public fromEvent<T>(event: string): Observable<T> {
        return new Observable<T>(observer => {
            const handler = (data: T) => observer.next(data);
            this.socket.on(event, handler);
            return () => this.socket.off(event, handler);
        });
    }

    ngOnDestroy(): void {
        this.disconnect();
        this.connectedSubject.complete();
    }
}