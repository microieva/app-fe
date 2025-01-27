import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({
    name: 'lineBreaks',
})
export class AppLineBreaksPipe implements PipeTransform {
    constructor(private sanitizer: DomSanitizer) {}

    transform(value: string): SafeHtml {
        if (!value) return '';
        const formattedContent = value.replace(/\n/g, '<br>');
        return this.sanitizer.bypassSecurityTrustHtml(formattedContent);
    }
}
