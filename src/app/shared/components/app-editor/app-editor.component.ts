import { Editor, Toolbar, ToolbarItem } from 'ngx-editor';
import { Subscription } from 'rxjs';
import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from "@angular/core";
import { FormGroup, FormControl, FormBuilder } from "@angular/forms";
import { MatDialog } from '@angular/material/dialog';
import { DomSanitizer } from "@angular/platform-browser";
import { ConfirmComponent } from '../app-confirm/app-confirm.component';
import { Record } from "../../../graphql/record/record";
import { RecordInput } from "../../../graphql/record/record.input";

@Component({
    selector: 'app-editor',
    templateUrl: './app-editor.component.html',
    styleUrls: ['./app-editor.component.scss']
})
export class AppEditorComponent implements OnInit, OnDestroy, AfterViewInit {
    @ViewChild('editorDiv') editorElement: ElementRef | undefined;
    form: RecordForm | undefined;
    disabled: boolean = true;

    maxCharacters: number = 2000; 
    currentCharacterCount: number = 0;
    editor!: Editor;
    toolbar: Toolbar = [
        <ToolbarItem[]>
        ['align_left', 'align_center', 'align_right', 'align_justify'],
        ['bold', 'italic'],
        ['underline', 'strike'],
        ['ordered_list', 'bullet_list'],
        [{ heading: ['h3', 'h4', 'h5', 'h6'] }],
        ['link'],
        ['text_color', 'background_color'],
        ['undo', 'redo'],
    ];
    styles = {
        "background-color": "orange"
    }
    text = '';
    editorText!: string;

    @Input() record: Record | undefined;
    @Input() appointmentId: number | undefined;
    @Output() cancel = new EventEmitter<boolean>();
    @Output() reload = new EventEmitter<boolean>();
    @Output() saveRecord = new EventEmitter<RecordInput>();

    private subscriptions: Subscription = new Subscription();

    constructor(
        private dialog: MatDialog,
        private formBuilder: FormBuilder,
        private sanitizer: DomSanitizer
    ){}

    async ngOnInit() {
        this.buildForm();
        this.editor = new Editor();
        const sub = this.form?.get('title')?.valueChanges.subscribe(value => {
            this.disabled = value.length < 1;
        });
        this.subscriptions.add(sub);
        this.editorText = this.record && this.record.text || this.text
    }
    ngAfterViewInit(): void {
        this.adjustHeight();
    }
    adjustHeight(){
        const el = this.editorElement?.nativeElement.querySelector('.ngx-editor');
        if (el) {
            el.style.height='auto';
            el.style.height=`${el.scrollHeight}px`;
        }
    }
    
    buildForm(){
        const title = this.record?.title;

        this.form = this.formBuilder.group({
            title: this.formBuilder.control<string>(title || '')
        }) as RecordForm
    }

    async save(draft: boolean) {
        const input: any = {
            title: this.form?.value.title || '',
            text: this.text,
            draft
        }
        this.saveRecord.emit(input);
    }
    onCancel() {
        const dialogRef = this.dialog.open(ConfirmComponent, {data: {message: "All unsaved changes will be lost"}});
        const sub = dialogRef.componentInstance.isConfirming.subscribe(() => {
            this.cancel.emit(true);
        });
        this.subscriptions.add(sub);
    }
    ngOnDestroy(): void {
        this.editor.destroy();
        this.subscriptions.unsubscribe();
    }
    onContentChange(content: string) {
        const plainText = this.stripHtml(content);
        this.currentCharacterCount = plainText.length;
        if (this.currentCharacterCount <= this.maxCharacters) {
            this.text = content;
        } else {
            const limitedText = plainText.substring(0, this.maxCharacters);
            const sanitizedContent = this.sanitizeHtml(limitedText);
            this.text = sanitizedContent;
        }
    }
    stripHtml(html: string): string {
        const tmp = document.createElement('DIV');
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || '';
    }
    
    sanitizeHtml(text: string): string {
        return this.sanitizer.sanitize(1, text) || '';
    }
}

type RecordForm = FormGroup<{
    title: FormControl<string>
}>