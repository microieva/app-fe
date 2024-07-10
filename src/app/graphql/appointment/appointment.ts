export interface Appointment {
    id: number
    patientId: number
    doctorId?: number
    createdAt: string
    updatedAt?: string
    start: string
    end: string
    allDay: boolean
}