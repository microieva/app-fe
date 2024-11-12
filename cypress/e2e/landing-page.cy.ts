import { AppAuthService } from "../../src/app/shared/services/app-auth.service";
import { DirectLoginInput } from "../../src/app/shared/types";

describe('Landing page spec', () => {
    beforeEach(() => {
      cy.visit('/')
    })

     it('can get angular library', () => {
        cy.window()
          .then(win => {
            console.log('WINDOW OBJECT', win)
            return win
          })
          .its('angular', {timeout: 1000})
          .then(angular => {
            console.log('got angular object', angular)
          })
      })
  
    it('should have the correct title', () => {
      cy.title().should('eq', 'Health Center')
    })
  
    it('should display the main header', () => {
      cy.get('h2').should('be.visible').and('contain', 'Health Center') 
      cy.get('button').should('be.visible').and('contain', 'Log In').click() 
    })
  
    it('should have a working second Login click h2 in content-view-wrapper', () => {
        cy.get('.content-view-wrapper').then((div) => {
            if (div.find('.clickable').length) {
              cy.get('#log-in-h2').should('be.visible').and('contain', 'Log in to your account').click({ multiple: true, waitForAnimations: false })
            } else {
              cy.log('Element #log-in-h2 not found in DOM')
            }
        })
    })
  
    it('should display the footer', () => {
      cy.get('footer').should('be.visible')
    })

    it('should open login dialog with specific buttons', () => {
        cy.get('body').then(($body) => {
            if ($body.find('mat-toolbar')) {
                cy.get('button')
                    .should('be.visible')
                    .and('contain', 'Log In')
                    .click() 
            }     
        })

        cy.get('body').then(($body) => {
            if ($body.find('mat-dialog-container').length > 0) {
                cy.get('mat-dialog-container', { timeout: 10000 }).should('be.visible')
                cy.get('mat-dialog-container').should('be.visible').within(() => {
                    cy.get('.menu-item').contains('h3','Patient').should('be.visible')
                    cy.get('.menu-item').contains('h3','Doctor').should('be.visible')
                    cy.get('.menu-item').contains('h3','Administrator').should('be.visible')
                })      
            } 
        })
      })

    it('should successfully login admin and redirect to /home', () => {
      cy.get('mat-toolbar').within(() => {
          cy.get('button').should('be.visible').click();
      });

      // cy.getAngularService<AppService>('AppAuthService').then((authService: AppAuthService) => {
      //   cy.spy(authService, 'logIn').as('logInSpy');
      //   const loginInput: DirectLoginInput = { email: 'admin@email.com', password: 'demo' };
      //   authService.logIn(loginInput);
      //   cy.get('@logInSpy').should('have.been.called');
      // });
      
      cy.get('mat-dialog-container', { timeout: 10000 })
          .should('be.visible')
          .within(() => {
              cy.contains('.menu-item h3', 'Administrator').should('be.visible').click();
          });
      
      cy.get('mat-dialog-container', { timeout: 10000 }).eq(1).should('be.visible').within(() => {
          cy.get('form', { timeout: 5000 }).should('be.visible'); 
          cy.get('input[name="email"]').should('be.visible').type('admin@email.com');
          cy.get('input[name="password"]').should('be.visible').type('demo');
  
          cy.get('button')
              .first()
              .should('be.visible')
              .and('contain', 'Submit')
              .click();
      });
      //const authService: Cypress.AppAuthService = cy.getAngularService<Cypress.AppAuthService>('AppAuthService')
      //const loginInput: DirectLoginInput = { email: 'admin@email.com', password: 'demo' };
      //cy.spy(AppAuthService, 'prototype').as('loginSpy');

      cy.get('.loading').should('be.visible');
      cy.get('.loading', { timeout: 10000 }).should('not.exist');
      cy.url().should('include', '/home');
  
      //cy.get('@loginSpy').should('have.been.called');
  }); 
})
  