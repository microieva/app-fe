import { Editor, Toolbar, ToolbarItem } from 'ngx-editor';
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from "@angular/core";
import { FormGroup, FormControl, FormBuilder, Validators } from "@angular/forms";
import { DomSanitizer } from "@angular/platform-browser";
import { AppGraphQLService } from "../../services/app-graphql.service";
//import { AppDialogService } from "../../services/app-dialog.service";
import { Record } from "../../../graphql/record/record";
import { RecordInput } from "../../../graphql/record/record.input";
import { MatDialog } from '@angular/material/dialog';
import { AlertComponent } from '../app-alert/app-alert.component';
import { ConfirmComponent } from '../app-confirm/app-confirm.component';

@Component({
    selector: 'app-editor',
    templateUrl: './app-editor.component.html',
    styleUrls: ['./app-editor.component.scss']
})
export class AppEditorComponent implements OnInit, OnDestroy {

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
        [{ heading: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] }],
        ['link'],
        ['text_color', 'background_color'],
        ['undo', 'redo'],
    ];
    styles = {
        "background-color": "orange"
    }
    text = '';

    @Input() record: Record | undefined;
    @Input() appointmentId: number | undefined;
    @Output() cancel = new EventEmitter<boolean>();
    @Output() reload = new EventEmitter<boolean>();
    @Output() saveRecord = new EventEmitter<RecordInput>();

    constructor(
        private dialog: MatDialog,
        private formBuilder: FormBuilder,
        private sanitizer: DomSanitizer
    ){}

    async ngOnInit() {
        console.log('appointmentId IN EDITOR: ', this.appointmentId)
        this.buildForm();
        this.editor = new Editor();
        this.form?.get('title')?.valueChanges.subscribe(value => {
            this.disabled = value.length < 1;
        });
    }
    
    buildForm(){
        const title = this.record?.title;

        this.form = this.formBuilder.group({
            title: this.formBuilder.control<string>(title || '', Validators.minLength(1)),
        }) as RecordForm
    }
    addTitleChangeListener() {
       
      }

    async save(draft: boolean) {
        const input: any = {
            //id: this.record?.id,
            title: this.form?.value.title!,
            text: this.text,
            draft
        }
        this.saveRecord.emit(input);
    }
    onCancel() {
        const dialogRef = this.dialog.open(ConfirmComponent, {data: {message: "All unsaved changes will be lost"}});
        dialogRef.componentInstance.ok.subscribe(subscription => {
            if (subscription) {
                // TO DO: check for prev and changes, isCOnfirming only if title || text changed 
                this.cancel.emit(true);
            }
        })
    }
    ngOnDestroy(): void {
        this.editor.destroy();
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
    //text: FormControl<string>
}>