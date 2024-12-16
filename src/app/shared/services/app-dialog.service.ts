import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AppDialogService {
  private dialogOpenedSource = new BehaviorSubject<boolean>(false);
  dialogOpened$ = this.dialogOpenedSource.asObservable();

  notifyDialogOpened() {
    this.dialogOpenedSource.next(true);
  }
}
