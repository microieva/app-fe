import { debounceTime, Subscription } from "rxjs";
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from "@angular/core";
import { FormBuilder, FormGroup } from "@angular/forms";
import { AppSearchInput } from "../../types";
import { dateRangeValidator } from "../../validators";
import { BreakpointObserver } from "@angular/cdk/layout";

@Component({
    selector: 'app-search',
    templateUrl: 'app-search.component.html',
    styleUrls: ['app-search.component.scss']
})
export class AppSearchComponent implements OnInit, OnDestroy{
    form!: FormGroup;
    isMobile:boolean = false;

    @Input() useAdvanced: boolean = false;
    @Output() advancedSearchValue = new EventEmitter<AppSearchInput | null>
    @Output() inputValue = new EventEmitter<string | null>();
    @Output() reset = new EventEmitter<boolean>();

    showAdvanced: boolean = false;
    private subscriptions: Subscription = new Subscription();
    
    constructor(private formBuilder: FormBuilder,  private breakpointObserver: BreakpointObserver){
        this.buildForm();
        const subRangeStart = this.form.get('advancedSearchInput.rangeStart')?.valueChanges.subscribe(() => {
            this.form.get('advancedSearchInput')?.updateValueAndValidity();
        });
        const subRangeEnd = this.form.get('advancedSearchInput.rangeEnd')?.valueChanges.subscribe(() => {
            this.form.get('advancedSearchInput')?.updateValueAndValidity();
        });
        this.subscriptions.add(subRangeStart);
        this.subscriptions.add(subRangeEnd);
    }

    ngOnInit(){
        const sub = this.form.get('searchInput')?.valueChanges
            .pipe(
                debounceTime(300)
            )
            .subscribe((value) => {
                !this.showAdvanced && this.inputValue.emit(value);
            }
        );
        this.subscriptions.add(sub);
        this.breakpointObserver.observe(['(min-width: 1024px)']).subscribe(result => {
            this.isMobile =  this.breakpointObserver.isMatched('(max-width: 430px)');
            //this.isMobileSmall = this.breakpointObserver.isMatched('(max-width: 410px)');
        });
    }

    ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
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