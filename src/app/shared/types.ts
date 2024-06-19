import { TestApp } from "../graphql/test-app/test-app";

export interface QueryResponse {
    loading: boolean,
    data?: QueryDataType
}

interface QueryDataType {
    testApps: TestApp[]
    testApp: TestApp
}

export interface MutationResponse {
    success: boolean
    message?: string
}

export interface AppTreeNode {
    name: string;
    children?: AppTreeNode[];
}

export interface ExpandableAppTreeNode {
    expandable: boolean;
    name: string
    level: number
}

export interface AppDialogData {
    loading: boolean
    isDeleting: boolean
    isLoggingIn: boolean
    showDirectLoginForm: boolean
}
