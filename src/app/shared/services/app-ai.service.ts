import { Observable} from 'rxjs';
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AppAiService {
    private url: string = '';

    constructor(private http: HttpClient) {
        this.url = environment.httpTriggerAiUrl;
    }

    sendMessage(message: string): Observable<any> {
        const body = { message };

        const headers = new HttpHeaders({
            'Content-Type': 'application/json'
        });

        return this.http.post<any>(this.url, body, { headers })
    }
}
