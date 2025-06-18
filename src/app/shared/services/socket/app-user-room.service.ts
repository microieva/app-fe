import { Injectable } from "@angular/core";
import { AppSocketService } from "./app-socket.service";
import { Observable } from "rxjs";
import { DOCTOR_ROOM_UPDATE, USER_STATUS } from "../../constants";

@Injectable({ providedIn: 'root' })
export class AppUserRoomService {
    constructor(private socketService: AppSocketService) {}

    public onDoctorRoomActivity(): Observable<{doctorIds: number[]}> {
        return this.socketService.fromEvent(DOCTOR_ROOM_UPDATE);
    }

    public onUserStatus(): Observable<{online:boolean}>{
        return this.socketService.fromEvent(USER_STATUS);
    }

    public requestDoctorsRoom(): void {
        this.socketService.emit('request_room');
    }
    public leaveDoctorRoom(doctorId:number): void {
        this.socketService.emit('leave_room', doctorId);
    }
    public requestUserStatus(userId:number):void {
        this.socketService.emit('request_status', userId);
    }
}