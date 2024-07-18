import { Component, EventEmitter, Input, OnInit, Output } from "@angular/core";
import { FormBuilder, FormGroup } from "@angular/forms";
import { Router } from "@angular/router";
import { AppDialogService } from "../../../services/app-dialog.service";

@Component({
    selector: 'app-event',
    templateUrl: './event.component.html',
    styleUrls: ['event.component.scss']
})
export class EventComponent implements OnInit{
    form!: FormGroup;

    @Output() submit = new EventEmitter<{input: string}>();
    @Output() delete = new EventEmitter<number>();
    //@Output() link = new EventEmitter<number>();

    @Input() createdAt: string | undefined;
    @Input() eventTitle: string | undefined;
    @Input() patientName: string | undefined;
    @Input() patientDob:  string | undefined;
    @Input() doctorName: string | undefined;
    @Input() eventDate:  string | undefined;
    @Input() eventStartTime:  string | undefined;
    @Input() eventEndTime:  string | undefined;
    @Input() eventId:  number | undefined;

    
    constructor(
        private formBuilder: FormBuilder,
        private router: Router,
        private dialog: AppDialogService
    ){}

    async ngOnInit() {
        this.form = this.formBuilder.group({
            input: this.formBuilder.control<string>(' ')
        })
    }

    onSubmit(){
        this.submit.emit(this.form.value);
    }
    onDelete(){
        this.delete.emit(this.eventId);
    }
    onLinkClick(id: number) {
        //this.link.emit(id);
        this.dialog.close();
        this.router.navigate(['/appointments', id]);
    }
}