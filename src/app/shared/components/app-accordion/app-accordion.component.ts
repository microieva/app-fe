import { Component, EventEmitter, Input, OnInit, Output } from "@angular/core";
import { AppAccordionDataSource } from "../../types";

@Component({
    selector: 'app-accordion',
    templateUrl: './app-accordion.component.html',
    styleUrls: ['./app-accordion.component.scss']
})
export class AppAccordionComponent implements OnInit {
    @Input() dataSource: AppAccordionDataSource[] | undefined;
    @Output() buttonClick = new EventEmitter<{id: number, text: string}>();

    constructor(){}
    ngOnInit(): void {
        
    }
    onButtonClick(id: number, text: string){
        this.buttonClick.emit({id, text});
    }
}