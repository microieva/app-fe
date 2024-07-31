import { Record } from "../graphql/record/record";
import { TestApp } from "../graphql/test-app/test-app";

export interface QueryResponse {
    loading: boolean
    data?: QueryDataType
}

interface QueryDataType {
    testApps: TestApp[]
    testApp: TestApp
    login: string
    me: any
}

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
    recordInfo: Record
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
export type AppDataSource = AppointmentDataSource | RecordDataSource;
