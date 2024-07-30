import { Component, OnInit } from "@angular/core";

@Component({
    selector: 'app-records',
    templateUrl: './records.component.html',
    styleUrls: ['./records.component.scss']
})
export class RecordsComponent implements OnInit {
    selectedIndex!: number;

    constructor(){}
    ngOnInit(): void {
        
        
    }
    onTabChange(value: any){
        console.log("tabs changed ? ", value)
    }
}