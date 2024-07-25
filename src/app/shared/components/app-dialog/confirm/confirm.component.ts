import { Component, EventEmitter, Input, Output } from "@angular/core";

@Component({
    selector: 'app-confirm',
    templateUrl: './confirm.component.html',
    styleUrls: ['confirm.component.scss']
})
export class ConfirmComponent {
    title= "Are you sure?"
    @Output() ok = new EventEmitter<boolean>(false);
    @Input() message: string | undefined;
    
    constructor(){}

    onOkClick(){
        this.ok.emit(true);
    }
}