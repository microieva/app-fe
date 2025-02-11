import { Observable} from 'rxjs';
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AppDbWakeUpService {
    private url: string = '';

    constructor(private http: HttpClient) {
        this.url = environment.httpTriggerDbConnectionUrl;
    }

    ping(): Observable<any> {
        const headers = new HttpHeaders({
            'Content-Type': 'text/plain'
        });
        return this.http.post<any>(this.url, null, { headers })
    }
}
