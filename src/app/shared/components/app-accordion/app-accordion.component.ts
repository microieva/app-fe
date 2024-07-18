import { Component, EventEmitter, Input, OnInit, Output } from "@angular/core";
import { AppAccordionDataSource } from "../../types";
import { Location } from "@angular/common";

@Component({
    selector: 'app-accordion',
    templateUrl: './app-accordion.component.html',
    styleUrls: ['./app-accordion.component.scss']
})
export class AppAccordionComponent implements OnInit{
    @Input() dataSource: AppAccordionDataSource[] | undefined;
    @Input() markAppointmentId: number| null = null;
    @Output() buttonClick = new EventEmitter<{id: number, text: string}>();
    @Output() appointmentClick = new EventEmitter<{id: number, title: string}>();

    constructor(
        private location: Location
    ){}

    ngOnInit(): void {
        console.log('ACCORDION GETS ID: ', this.markAppointmentId)
    }
    
    onButtonClick(id: number, text: string){
        this.buttonClick.emit({id, text});
    }

    onAppointmentClick(id: number, title: string){
        const eventInfo = { id, title }
        this.appointmentClick.emit(eventInfo);
    }
    resetBackground(id: number){
        if (id === this.markAppointmentId) {
            this.markAppointmentId = null;
            const currentPath = this.location.path();
            const newPath = currentPath.replace(/\/\d+$/, ''); 
            this.location.replaceState(newPath);
        }
    }
}