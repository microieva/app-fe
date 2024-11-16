import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AppRefreshService {
  private refreshSubject = new BehaviorSubject<boolean>(false);  
  refresh$ = this.refreshSubject.asObservable(); 

  triggerRefresh() {
    this.refreshSubject.next(true);  
  }

  resetRefresh() {
    this.refreshSubject.next(false);  
  }
}
