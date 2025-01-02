import { Injectable, EventEmitter } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AppHeaderService {
    isUserUpdated = new EventEmitter<void>();
    isCountUpdated = new EventEmitter<void>();

    notifyUserUpdate() {
        this.isUserUpdated.emit();
    }
    notifyUnreadCountUpdate() {
        this.isCountUpdated.emit();
    }
}
