import { Appointment } from "../appointment/appointment"

export interface Record {
    id: number
    title: string
    text: string
    createdAt: string
    updatedAt: string
    appointment: Appointment
}