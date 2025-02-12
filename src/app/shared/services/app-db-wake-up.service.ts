import { Observable} from 'rxjs';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AppDbWakeUpService {
    private url: string = '';

    constructor(private http: HttpClient) {
        this.url = environment.httpTriggerDbUrl;
    }

    ping(): Observable<any> {
        return this.http.get<any>(this.url, { observe: 'response', responseType: 'text' as 'json' })
    }
}
