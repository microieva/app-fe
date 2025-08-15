import { User } from "../graphql/user/user"

export interface MutationResponse {
    success: boolean
    message?: string
}

export interface LoginResponse {
    token: string 
    expiresAt: string
}

export interface AppDialogData {
    isLoading: boolean
    isAlert: boolean
    message: string
    isConfirming: boolean
    isLoggingIn: boolean
    showDirectLoginForm: boolean
    input: boolean
    eventInfo: any
    recordId: number
    openRecord: boolean
    appointmentId: number
}

export interface DirectLoginInput {
    email: string
    password: string
}

export interface Paged<T> {
    length: number
    slice: T[]
}

export interface AppointmentDataSource {
    id: number
    howLogAgoStr?: string
    howSoonStr?: string
    pastDate?: string
    title?: string
    buttons?: {text: string, disabled: boolean}[]
    date?: string
    start: string
    end: string
    name?: string 
    message?: string
    draft?: boolean
    record?: boolean
}
export interface RecordDataSource {
    id: number
    title: string
    recCreatedAt: string
    recUpdatedAt: string
    name: string
}
export interface UserDataSource {
    id: number
    createdAt: string
    updatedAt: string
    name: string
    dob?: string
    email: string
    lastLogOutAt?: string
    isRequest?: boolean
    online?:boolean
}
export interface FeedbackDataSource {
    id: number
    createdAt:string
    name:string
    email:string
    isRead:boolean
}
export type AppDataSource = AppointmentDataSource | RecordDataSource | UserDataSource | FeedbackDataSource;

export interface AppTableDisplayedColumns {
    columnDef: string
    header: string
    sort: boolean 
}

export type AppSearchInput = {
    searchInput: string
    advancedSearchInput: AdvancedSearchInput
}

export interface AdvancedSearchInput {
    rangeStart: string
    rangeEnd: string
    titleLike: string
    textLike: string
}

export interface AppAiResponse {
    content: string | null
    role: string
    tool_calls: any[]
}

export interface AppNotificationEvent {
    id?:number
    event: string
    message: string
    data: any
}

export type NextAppointmentData = {
    nextStart: string,
    nextEnd: string,
    nextId: number
    previousAppointmentDate: string,
    recordIds: number[],
    patient: User,
    doctor: User,
    patientMessage: string,
    doctorMessage: string
}

export type AppSnackbar = AppNotificationEvent & { id: number };