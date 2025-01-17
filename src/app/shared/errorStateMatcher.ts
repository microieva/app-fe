import { FormControl, FormGroupDirective, NgForm } from "@angular/forms";
import { ErrorStateMatcher } from "@angular/material/core";

export class AppErrorStateMatcher implements ErrorStateMatcher {
    isErrorState(control: FormControl | null, form: FormGroupDirective | NgForm | null): boolean {
        if (!control) {
            return false;
        } 
    
        const isSubmitted = form && form.submitted;
        const isEmpty = !control.value || control.value === '';
        const isTouched = control.touched;
        return !!(control.invalid && (isEmpty && isTouched )|| isSubmitted);   
    }
}