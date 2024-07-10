import { Component, EventEmitter, OnInit, Output } from "@angular/core";
import { FormBuilder, FormGroup } from "@angular/forms";

@Component({
    selector: 'app-event',
    templateUrl: './event.component.html',
    styleUrls: ['event.component.scss']
})
export class EventComponent implements OnInit{
    title= "New Appointment";
    form!: FormGroup;

    @Output() submit = new EventEmitter<{input: string}>();
    
    constructor(
        private formBuilder: FormBuilder
    ){}

    ngOnInit(): void {
        this.form = this.formBuilder.group({
            input: this.formBuilder.control<string>(' ')
        })
    }

    onSubmit(){
        this.submit.emit(this.form.value);
    }
}