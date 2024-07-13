import { Component, Input, OnInit } from "@angular/core";

@Component({
    selector: 'app-accordion',
    templateUrl: './app-accordion.component.html',
    styleUrls: ['./app-accordion.component.scss']
})
export class AppAccordionComponent implements OnInit {
    @Input() dataSource: any[]= []
    constructor(){}
    ngOnInit(): void {
        
    }

}