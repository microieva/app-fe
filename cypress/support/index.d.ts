/// <reference types="cypress" />


declare namespace Cypress {
    interface Chainable<Subject = any> {
        checkIfVisible(selector: string): Chainable<Subject>;
        login(email: string, password: string, url: string): Promise<void>;
        getAngularService<T>(service: string): Chainable<T>;
        logIn: (directLoginInput: DirectLoginInput) => Promise<void>;
    }
    interface Window extends AUTWindow{
        angular: {
            get: <AppService>(serviceName: string) => AppService;
            version: number
        };
    }
    interface AppAuthService {
        logIn: (directLoginInput: DirectLoginInput) => Promise<void>;
    }
}

type AppService = AppAuthService



  