import { debounceTime } from "rxjs";
import { Component, EventEmitter, Input, OnInit, Output } from "@angular/core";
import { FormBuilder, FormGroup } from "@angular/forms";
import { AppSearchInput } from "../../types";
import { dateRangeValidator } from "../../validators";

@Component({
    selector: 'app-search',
    templateUrl: 'app-search.component.html',
    styleUrls: ['app-search.component.scss']
})
export class AppSearchComponent implements OnInit{
    form!: FormGroup;

    @Input() useAdvanced: boolean = false;
    @Output() advancedSearchValue = new EventEmitter<AppSearchInput | null>
    @Output() inputValue = new EventEmitter<string | null>();
    @Output() reset = new EventEmitter<boolean>();

    showAdvanced: boolean = false;
    constructor(private formBuilder: FormBuilder){
        this.buildForm();
        this.form.get('advancedSearchInput.rangeStart')?.valueChanges.subscribe(() => {
            this.form.get('advancedSearchInput')?.updateValueAndValidity();
        });
        this.form.get('advancedSearchInput.rangeEnd')?.valueChanges.subscribe(() => {
            this.form.get('advancedSearchInput')?.updateValueAndValidity();
        });
    }

    ngOnInit(){
        this.form.get('searchInput')?.valueChanges
            .pipe(
                debounceTime(300)
            )
            .subscribe((value) => {
                !this.showAdvanced && this.inputValue.emit(value);
            }
        );
        
    }
    buildForm(){
        this.form = this.formBuilder.group({
            searchInput: this.formBuilder.control<string | null>(null),
            advancedSearchInput: this.formBuilder.group({
                rangeStart: this.formBuilder.control<string | null>(null),
                rangeEnd: this.formBuilder.control<string | null>(null),
                titleLike: this.formBuilder.control<string | null>(null),
                textLike: this.formBuilder.control<string | null>(null)
            },
            { validators: dateRangeValidator })
        });
    }

    onSubmit(){
        this.advancedSearchValue.emit(this.form.value);
    }
    resetSearchInput(): void {
        this.form.get('searchInput')?.setValue(null);
        this.inputValue.emit(null)
    }
    onReset(){
        this.form.reset();
        this.reset.emit(true);
    }
}