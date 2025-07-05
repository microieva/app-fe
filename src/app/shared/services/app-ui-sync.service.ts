import { EventEmitter, Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AppUiSyncService {
  private syncSubjects = new Map<string, Subject<any>>();
  toggleSidenav = new EventEmitter<boolean>(false);
  isAptCountUpdated = new EventEmitter<void>();

  sync(event: string): Observable<void> {
    if (!this.syncSubjects.has(event)) {
      this.syncSubjects.set(event, new Subject<void>());
    }
    return this.syncSubjects.get(event)!.asObservable();
  }

  triggerSync(event: string): void {
    if (this.syncSubjects.has(event)) {
      this.syncSubjects.get(event)!.next(event);
    }
  }

  openSidenav(toggle:boolean) {
    this.toggleSidenav.emit(toggle);
  }
   notifyMissingAptUpdate() {
        this.isAptCountUpdated.emit();
    }
}