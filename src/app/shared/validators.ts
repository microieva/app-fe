import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export const dateRangeValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
    const start = control.get('rangeStart')?.value;
    const end = control.get('rangeEnd')?.value;

    return start && end && start > end ? { isDateRangeValid: true } : null;
};

export const timeRangeValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
    const startHour = control.get('startHour')?.value;
    const startMin = control.get('startMin')?.value;
    const endHour = control.get('endHour')?.value;
    const endMin = control.get('endMin')?.value;

    if (startHour === null || startMin === null || endHour === null || endMin === null) {
        return null;
    }
    const startTime = parseInt(startHour, 10) * 100 + parseInt(startMin, 10);
    const endTime = parseInt(endHour, 10) * 100 + parseInt(endMin, 10);

    return startTime >= endTime ? { isTimeRangeValid: true } : null;
};

export const overTimeValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
    const startHour = control.get('startHour')?.value;
    const endHour = control.get('endHour')?.value;
    const endMin = control.get('endMin')?.value;

    return startHour === '18' || endHour === '18' && endMin === '30' ? { isOverTime: true } : null;
}

export const weekendValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
    const date = control.get('date')?.value;
    if (!date) {
        return null;
    }
    const day = new Date(date).getDay(); 

    return day === 0 || day === 6 ? { isWeekend: true } : null;
};

export const nameValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
    const value = control.get('name')?.value;
    const valid = /^[a-zA-Z]+$/.test(value);
    return valid ? null : { invalidName: true };
};

export const emailValidator:ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
    const value = control.get('email')?.value;
    const valid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value);
    return valid ? null : { invalidEmail: true };
}



