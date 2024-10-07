import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AppDialogService {
  private dialogOpenedSource = new Subject<void>();

  dialogOpened$ = this.dialogOpenedSource.asObservable();

  notifyDialogOpened() {
    this.dialogOpenedSource.next();
  }
}
