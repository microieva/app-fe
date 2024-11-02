import { environment } from "../../src/environments/environment.prod";

describe('Admin Home page spec', () => {
    beforeEach(() => {
        cy.login('admin@email.com', 'demo', environment.url);
        cy.visit('https://app-fe-gamma.vercel.app/home');
    });

    it('should display the main header', () => {
        cy.get('h2').should('be.visible').and('contain', 'Health Center') 
        cy.get('button').should('be.visible').and('contain', 'Log Out') 
    })
    it('should display logged in as admin in main header', () => {
        cy.get('mat-toolbar').within(() => {
            cy.get('.me').should('be.visible', {settimeout: 10000})
        });
    })
    it('should display session countdown in main header', () => {
        cy.get('mat-toolbar').within(() => {
            cy.get('.time').should('be.visible', {settimeout: 10000})
        });
    })

    it('should display sidenav with 4 items and correct route links', () => {
        const expectedLinks = [
            { text: 'My Account', route: '/home/user' },
            { text: 'Doctors', route: '/home/users' },
            { text: 'Patients', route: '/home/patients' },
            { text: 'Messages', route: '/home/messages' },
        ];

        cy.get('mat-sidenav mat-nav-list a[mat-list-item]').then(($items) => {
            console.log('Found items:', $items);
        });
        
    
        cy.get('mat-sidenav mat-nav-list a[mat-list-item]', { timeout: 10000 })
            .should('have.length', 4)
            .each(($item, index) => {
                const { text, route } = expectedLinks[index];
                cy.get(`[routerLink="${route}"]`).click()
                cy.wrap($item).within(() => {
                    cy.contains('span', text).should('be.visible');
                    
                });
    
                cy.url().should('include', route);

                cy.visit('https://app-fe-gamma.vercel.app/home');
            });
        });
    
});
