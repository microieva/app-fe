import { Injectable, EventEmitter } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AppHeaderService {
    isUserUpdated = new EventEmitter<void>();
    isMsgCountUpdated = new EventEmitter<void>();
    isAptCountUpdated = new EventEmitter<void>();
    toggleSidenav = new EventEmitter<boolean>(false);

    notifyUserUpdate() {
        this.isUserUpdated.emit();
    }
    notifyUnreadCountUpdate() {
        this.isMsgCountUpdated.emit();
    }
    notifyMissingAptUpdate() {
        this.isAptCountUpdated.emit();
    }
    openSidenav(toggle:boolean) {
        this.toggleSidenav.emit(toggle);
    }
}
