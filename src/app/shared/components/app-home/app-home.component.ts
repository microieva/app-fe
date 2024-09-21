import { trigger, transition, style, animate, state, keyframes } from "@angular/animations";
import { Component, HostListener, OnInit } from "@angular/core";
import { FormBuilder, FormControl } from "@angular/forms";
import { MatDialog } from "@angular/material/dialog";
import { LoginMenuComponent } from "../app-login-menu/app-login-menu.component";

@Component({
    selector: 'app-home',
    templateUrl: './app-home.component.html',
    styleUrls: ['app-home.component.scss'],
    animations: [
        trigger('slideInOut', [
            state('in', style({ transform: 'translateY(0)', opacity: 1 })),
            transition(':enter', [
                style({ transform: 'translateY(80%)', opacity: 0.1 }),
                animate('600ms cubic-bezier(0.25, 0.8, 0.25, 1)', style({ transform: 'translateY(0)', opacity: 1 }))
            ]),
            transition(':leave', [
                animate('600ms cubic-bezier(0.25, 0.8, 0.25, 1)', style({ transform: 'translateY(100%)', opacity: 0.1 }))
            ])
        ]),
        trigger('typingAnimation', [
            transition(':enter', [
              animate('3s steps(30)', keyframes([
                style({ width: '0', overflow: 'hidden', borderRight: '1px solid black' }),
                style({ width: '100%', overflow: 'hidden', borderRight: '1px solid black' }),
              ]))
            ]),
            transition(':leave', [
              animate('0s')
            ])
        ]),
        trigger('cursorAnimation', [
            state('blink', style({ opacity: 0 })),
            transition('* => blink', animate('700ms ease-in-out infinite')),
        ])
    ]
})
export class AppHomeComponent implements OnInit{
    scrollOffset: number = 0;
    fullText: string = 'Sign up for our Newsletter!';
    displayedText: string = '';
    email!: FormControl;
    homeRoute: boolean = true;
    
    @HostListener('window:scroll', ['$event'])
    onWindowScroll(): void {
        const scrollPosition = window.scrollY;
        this.scrollOffset = scrollPosition * -3.1; 
    }

    constructor (
        private formBuilder: FormBuilder,
        private dialog: MatDialog
    ) {}

    async ngOnInit() {
        this.startTypingAnimation();
        this.email = this.formBuilder.control<string>('');
    }

    startTypingAnimation() {
        let index = 0;
        const interval = setInterval(() => {
            if (index < this.fullText.length) {
                this.displayedText += this.fullText.charAt(index);
                index++;
            } else {
                clearInterval(interval);
                setTimeout(() => {
                this.displayedText = '';
                this.startTypingAnimation();
                }, 1000); // pause before restart
            }
        }, 150); // Typing speed
    }

    onLogIn(){
        this.dialog.open(LoginMenuComponent);
    }
}

