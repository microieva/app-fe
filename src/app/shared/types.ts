export interface MutationResponse {
    success: boolean
    message?: string
}

export interface LoginResponse {
    token: string
    expiresAt: string
}

export interface AppTreeNode {
    name: string
    children?: AppTreeNode[]
    isAuth: boolean
}

export interface ExpandableAppTreeNode {
    expandable: boolean
    name: string
    level: number
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
    date: string
    start: string
    end: string
}
export interface RecordDataSource {
    title: string
    createdAt: string
    updatedAt: string
}
export interface UserDataSource {
    id: number
    createdAt: string
    updatedAt: string
    firstName: string
    lastName: string
    dob?: string
    email: string
}
export type AppDataSource = AppointmentDataSource | RecordDataSource | UserDataSource;
