import { Component, EventEmitter, Output } from "@angular/core";

@Component({
    selector: 'app-confirm',
    templateUrl: './confirm.component.html',
    styleUrls: ['confirm.component.scss']
})
export class ConfirmComponent {
    title= "Are you sure?"
    @Output() ok = new EventEmitter<boolean>(false);
    
    constructor(){}

    onOkClick(){
        this.ok.emit(true);
    }
}