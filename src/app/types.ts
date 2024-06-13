import { TestApp } from "./graphql/test-app/test-app";

export interface QueryResponse {
    loading: boolean,
    data?: QueryDataType
}

interface QueryDataType {
    testApps: TestApp[]
    testApp: TestApp
}

export interface MutationResponse {
    success: boolean,
    message?: string
}