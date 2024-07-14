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
    loading: boolean
    message: string
    isDeleting: boolean
    isLoggingIn: boolean
    showDirectLoginForm: boolean
    input: boolean
}

export interface DirectLoginInput {
    email: string
    password: string
}

export interface Paged<T> {
    length: number
    slice: T[]
}

export interface AppAccordionDataSource {
    id: number
    howLogAgoStr?: string
    howSoonStr?: string
    pastDate?: string
    title?: string
    buttons: string[]
    date: string
    start: string
    end: string
}
