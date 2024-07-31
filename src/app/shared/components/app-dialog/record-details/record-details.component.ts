import { Component, Input, OnInit } from "@angular/core";

@Component({
    selector: 'app-record-details',
    templateUrl: './record-details.component.html',
    styleUrls: ['record-details.component.scss']
})
export class RecordDetailsComponent implements OnInit{
    @Input() recordTitle: string | undefined;
    @Input() recordText: string | undefined;

    constructor(){}

    ngOnInit(): void {
        console.log('wtf ?????????????????', this.recordTitle, this.recordText)
    }
}