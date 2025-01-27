import { Injectable, EventEmitter } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AppHeaderService {
    isUserUpdated = new EventEmitter<void>();
    isCountUpdated = new EventEmitter<void>();
    toggleSidenav = new EventEmitter<boolean>(false);

    notifyUserUpdate() {
        this.isUserUpdated.emit();
    }
    notifyUnreadCountUpdate() {
        this.isCountUpdated.emit();
    }
    openSidenav(toggle:boolean) {
        this.toggleSidenav.emit(toggle);
    }
}
