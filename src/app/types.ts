import { TestApp } from "./graphql/test-app/test-app";

export interface QueryResponse {
    loading: boolean,
    data?: QueryDataType
}

interface QueryDataType {
    testApps: TestApp[]
}