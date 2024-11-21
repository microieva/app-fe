import { Record } from "../record/record"
import { User } from "../user/user"

export interface Appointment {
    id: number
    patientId: number
    doctorId?: number
    createdAt: string
    updatedAt?: string
    start: string
    end: string
    allDay: boolean
    patient: User
    doctor: User | null
    patientMessage: string
    doctorMessage: string
    record?: Record
}
