import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable} from 'rxjs';
import { environment } from '../../../environments/environment';
import { MatDialog } from '@angular/material/dialog';

@Injectable({
  providedIn: 'root'
})
export class AppAiService {
    private apiUrl: string = '';
    private apiKey: string = '';

    constructor(private http: HttpClient, private dialog: MatDialog) {
        this.apiUrl = environment.azureOpenAiEndpoint;
        this.apiKey = environment.azureOpenAiApiKey;
    }

    sendMessage(message: string): Observable<any> {
        const body = { message };

        const headers = new HttpHeaders({
            'Content-Type': 'application/json',
            'api-key': this.apiKey
        });

        return this.http.post<any>(this.apiUrl, body, { headers })
    }
}
