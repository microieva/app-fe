import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export const dateRangeValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
    const start = control.get('rangeStart')?.value;
    const end = control.get('rangeEnd')?.value;

    return start && end && start > end ? { isRangeValid: true } : null;
};

