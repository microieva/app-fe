import { Component, EventEmitter, Input, OnInit, Output } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { AppDataSource } from "../../types";

@Component({
    selector: 'app-accordion',
    templateUrl: './app-accordion.component.html',
    styleUrls: ['./app-accordion.component.scss']
})
export class AppAccordionComponent implements OnInit{
    @Input() dataSource: AppDataSource[] | undefined;
    @Input() markAppointmentId: number| null = null;
    @Output() buttonClick = new EventEmitter<{id: number, text: string}>();
    @Output() appointmentClick = new EventEmitter<{id: number, title: string}>();

    constructor(
        private activatedRoute: ActivatedRoute,
        private router: Router
    ){}

    ngOnInit(): void {
    }
    
    onButtonClick(id: number, text: string){
        this.buttonClick.emit({id, text});
    }

    onAppointmentClick(id: number, title: string){
        const eventInfo = { id, title }
        this.appointmentClick.emit(eventInfo);
    }
    resetRoute(){
        this.markAppointmentId = null;
        this.activatedRoute.queryParams.subscribe(params => {
            const updatedParams = { ...params };
            delete updatedParams['id'];

            this.router.navigate([], {
                relativeTo: this.activatedRoute,
                queryParams: updatedParams,
                queryParamsHandling: 'merge' 
            });
        })
    }
}