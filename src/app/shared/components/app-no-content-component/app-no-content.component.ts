import { Component, Input, OnInit } from "@angular/core";

@Component({
    selector: 'app-no-content',
    templateUrl: './app-no-content.component.html',
    styleUrls: ['./app-no-content.component.scss'],
    animations: [
        // trigger('slideInOut', [
        //     state('in', style({ transform: 'translateY(0)', opacity: 1 })),
        //     transition(':enter', [
        //         style({ transform: 'translateY(80%)', opacity: 0.1 }),
        //         animate('600ms cubic-bezier(0.25, 0.8, 0.25, 1)', style({ transform: 'translateY(0)', opacity: 1 }))
        //     ]),
        //     transition(':leave', [
        //         animate('600ms cubic-bezier(0.25, 0.8, 0.25, 1)', style({ transform: 'translateY(100%)', opacity: 0.1 }))
        //     ])
        // ]),
    ]
})
export class AppNoContentComponent implements OnInit {
    constructor() { }

    @Input() message: string = 'No content';
    ngOnInit(): void {
        // Initialization logic can go here
    }
}