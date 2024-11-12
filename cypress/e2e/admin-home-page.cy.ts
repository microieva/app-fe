describe('Admin Home page spec', () => {
    beforeEach(() => {
        cy.login('admin@email.com', 'demo', 'http://localhost:4000/graphql');
        cy.visit('/home');
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
            { text: 'My Account', route: '/home/user', showIcon: true },
            { text: 'Doctors', route: '/home/doctors', showIcon: false },
            { text: 'Patients', route: '/home/patients', showIcon: false },
            { text: 'Messages', route: '/home/messages', showIcon: false },
        ];
    
        // Check that we have 4 items in the sidenav
        cy.get('mat-sidenav mat-nav-list a[mat-list-item]')
            .should('have.length', 4)
            .each(($item, index) => {
                const { text, route, showIcon } = expectedLinks[index];
    
                // First, check the structure and visibility of inner elements
                cy.wrap($item).get('span').should('contain', text).and('be.visible')

                cy.url().should('include', route);
    
                // Go back to the home page for the next iteration
                cy.visit('http://localhost:4200/home');
            });
    });
    
    
});
