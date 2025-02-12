import { Observable, of } from 'rxjs';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AppDbWakeUpService {
    private url: string = '';
    private lastPingTime: number | null = null; 

    constructor(private http: HttpClient) {
        this.url = environment.httpTriggerDbUrl;
        this.loadLastPingTime();
    }

    private loadLastPingTime(): void {
        const storedTime = localStorage.getItem('lastPingTime');
        this.lastPingTime = storedTime ? parseInt(storedTime, 10) : null;
    }

    private isPingAllowed(): boolean {
        if (!this.lastPingTime) return true; 
        const now = Date.now();
        return now - this.lastPingTime >= 15 * 60 * 1000; 
    }

    ping(): Observable<any> {
        if (!this.isPingAllowed()) {
            return of({ status: 200 }); 
        }
        
        return new Observable(observer => {
            this.http.get<any>(this.url, { observe: 'response', responseType: 'text' as 'json' }).subscribe({
                next: (response) => {
                    this.lastPingTime = Date.now();
                    localStorage.setItem('lastPingTime', this.lastPingTime.toString());
                    observer.next(response);
                    observer.complete();
                },
                error: (error) => {
                    observer.error(error);
                }
            });
        });
    }
    
}
