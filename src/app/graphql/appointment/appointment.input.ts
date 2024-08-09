export interface AppointmentInput {
    id?: number
    start: string
    end: string
    allDay: boolean,
    patientId?: number,
    patientMessage?: string
}