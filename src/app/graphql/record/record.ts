import { Appointment } from "../appointment/appointment"
import { User } from "../user/user"

export interface Record {
    id: number
    title: string
    text: string
    createdAt: string
    updatedAt: string
    draft: boolean
    doctor: User
    patient: User
    appointmentId: number
    appointment: Appointment
}