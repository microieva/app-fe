/// <reference path="index.d.ts" />

import { DirectLoginInput } from "../../src/app/shared/types";



// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })
//
// declare global {
//   namespace Cypress {
//     interface Chainable {
//       login(email: string, password: string): Chainable<void>
//       drag(subject: string, options?: Partial<TypeOptions>): Chainable<Element>
//       dismiss(subject: string, options?: Partial<TypeOptions>): Chainable<Element>
//       visit(originalFn: CommandOriginalFn, url: string, options: Partial<VisitOptions>): Chainable<Element>
//     }
//   }
// }

Cypress.Commands.add('checkIfVisible', (selector: string) => {
    cy.get('body').then(($body) => {
      if ($body.find(selector).length > 0) {
        cy.get(selector).should('be.visible');
      } else {
        cy.log(`${selector} does not exist`);
      }
    });
});

Cypress.Commands.add('login', (email: string, password: string, url: string) => { 
  cy.request({
    method: 'POST',
    url: url, 
    headers: {
        'Content-Type': 'application/json',
    },
    body: {
        query: `
            mutation ($directLoginInput: LoginInput!) {
                login(directLoginInput: $directLoginInput) {
                    token
                    expiresAt
                }
            }
        `,
        variables: {
            directLoginInput: {
                email, 
                password
            },
        },
    },
    }).then((resp) => {
        expect(resp.status).to.eq(200);
        window.localStorage.setItem('authToken', resp.body.data.login.token);
        window.localStorage.setItem('tokenExpire', resp.body.data.login.expiresAt);
    });
});
Cypress.Commands.add('getAngularService', <T>(serviceName: string): Cypress.Chainable<T> => {
    return cy.window().then((win) => {
        cy.wait(1000);
        return new Cypress.Promise<T>((resolve, reject) => {
            let attempts = 0;

            const checkForAngular = () => {
                attempts++;
                if (win.angular) {
                    const service: AppService = win.angular.get(serviceName);
                    if (service) {
                        resolve(service);
                    } else {
                        reject(`Service ${serviceName} not found`);
                    }
                } else if (attempts < 10) {  // Retry up to 10 times
                    setTimeout(checkForAngular, 100);  // Retry every 100ms
                } else {
                    reject('Angular not found on window object');
                }
            };

            checkForAngular();
        });
    });
});


Cypress.Commands.add('logIn', (input: DirectLoginInput) => { 
    
});

  
  
  