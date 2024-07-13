import { Component, EventEmitter, Input, Output } from "@angular/core";

@Component({
    selector: 'app-alert',
    templateUrl: './alert.component.html',
    styleUrls: ['alert.component.scss']
})
export class AlertComponent {
    title= "Alert" ;  
    @Output() ok = new EventEmitter<boolean>(false);

    @Input() 
    message: string = '';
    constructor(){}

    onOkClick(){
        this.ok.emit(true);
    }
}