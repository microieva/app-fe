declare namespace Cypress {
    interface Chainable<Subject = any> {
      checkIfVisible(selector: string): Chainable<Subject>;
    }
  }
  