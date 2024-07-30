import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from "@angular/core";
import { AppGraphQLService } from "../../services/app-graphql.service";
import { AppDialogService } from "../../services/app-dialog.service";
import { FormGroup, FormControl, FormBuilder, Validators } from "@angular/forms";
import { Record } from "../../../graphql/record/record";
import { RecordInput } from "../../../graphql/record/record.input";
import { Router } from "@angular/router";
import { Editor, Toolbar, ToolbarItem } from 'ngx-editor';
import { DomSanitizer } from "@angular/platform-browser";

@Component({
    selector: 'app-record',
    templateUrl: './app-record.component.html',
    styleUrls: ['./app-record.component.scss']
})
export class AppRecordComponent implements OnInit, OnDestroy {
    record: Record | undefined;
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

    @Input() appointmentId!: number;
    @Input() patientId!: number;
    @Output() cancel = new EventEmitter<boolean>();
    @Output() reload = new EventEmitter<boolean>();

    constructor(
        private graphQLService: AppGraphQLService,
        private dialog: AppDialogService,
        private formBuilder: FormBuilder,
        private sanitizer: DomSanitizer
    ){}

    async ngOnInit() {
        this.editor = new Editor();
        await this.loadRecord();
        this.buildForm();
        this.form?.get('title')?.valueChanges.subscribe(value => {
            this.disabled = value.length < 1;
        });
    }
    async loadRecord(){
        const query = `query ($appointmentId: Int!) {
            record (appointmentId: $appointmentId) {
                id
                title
                text
                createdAt
                draft
            }
        }`

        try {
            const response = await this.graphQLService.send(query, {appointmentId: this.appointmentId});
            if (response.data) {
                this.record = response.data.record;
                this.buildForm();
            }
        } catch (error) {
            this.dialog.open({data: {message: "Unexpected error loading medical record: "+error}})
        }   
    }
    buildForm(){
        this.form = this.formBuilder.group({
            title: this.formBuilder.control<string>(this.record?.title || '', Validators.minLength(1)),
        }) as RecordForm
    }
    addTitleChangeListener() {
       
      }

    async save(draft: boolean) {
        const input: RecordInput = {
            id: this.record?.id,
            title: this.form?.value.title!,
            text: this.text,
            appointmentId: this.appointmentId,
            draft
        }

        const mutation = `mutation ($recordInput: RecordInput!){
            saveRecord(recordInput: $recordInput) {
                success
                message
            }
        }`
        try {
            const response = await this.graphQLService.mutate(mutation, { recordInput: input })
            if (response.data.saveRecord.success) {
                this.reload.emit(true);
            }    
        } catch (error) {
            this.dialog.open({data: { isAlert: true, message: "Unexpected error saving medical record: "+error}})
        }
        
    }
    onCancel() {
        this.cancel.emit(true);
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