import { Subscription } from "rxjs";
import { AfterViewInit, Component, ElementRef, EventEmitter, Inject, OnDestroy, OnInit, Optional, Output, ViewChild } from "@angular/core";
import { FormGroup, FormBuilder, Validators } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { trigger, state, style, transition, animate } from "@angular/animations";
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from "@angular/material/dialog";
import { DateTime } from "luxon";
import { AppGraphQLService } from "../../shared/services/app-graphql.service";
import { AppTimerService } from "../../shared/services/app-timer.service";
import { AppAuthService } from "../../shared/services/app-auth.service";
import { AlertComponent } from "../../shared/components/app-alert/app-alert.component";
import { ConfirmComponent } from "../../shared/components/app-confirm/app-confirm.component";
import { LoadingComponent } from "../../shared/components/app-loading/loading.component";
import { UserInput } from "./user.input";
import { DoctorRequest } from "./doctor-request";
import { User } from "./user";
import { AppCacheService } from "../../shared/services/app-cache.service";
import { USER_UPDATED } from "../../shared/constants";
import { AppUiSyncService } from "../../shared/services/app-ui-sync.service";
import { DomSanitizer, SafeUrl } from "@angular/platform-browser";
import { AppUploadService } from "../../shared/services/app-file-upload.service";

@Component({
    selector: 'app-user',
    templateUrl: './user.component.html',
    styleUrls: ['./user.component.scss'],
    animations: [
        trigger('slideInOut', [
            state('in', style({ transform: 'translateY(0)', opacity: 1 })),
            transition(':enter', [
              style({ transform: 'translateY(80%)', opacity: 0.1 }),
              animate('600ms cubic-bezier(0.25, 0.8, 0.25, 1)', style({ transform: 'translateY(0)', opacity: 1 }))
            ]),
            transition(':leave', [
              animate('600ms cubic-bezier(0.25, 0.8, 0.25, 1)', style({ transform: 'translateY(100%)', opacity: 0.1 }))
            ])
          ]),
    ]
})
export class UserComponent implements OnInit, OnDestroy, AfterViewInit {
    me: User | undefined;
    user: User | null = null;
    request: DoctorRequest | null = null;
    userId:  number | null = null;
    isUpdated: boolean = false;
    id: number | undefined;
    form: FormGroup | undefined;
    formattedDate: string | undefined;
    scrollOffset: number = 0;
    isLoading: boolean = false;
    imageForm: FormGroup = this.formBuilder.group({
      imageFile: [null]
    });
    previewUrl: SafeUrl | null = null;
    isUploading:boolean = false;
    uploadProgress:number = 0;
    url: string | null = null;

    @Output() isDeletingUser = new EventEmitter<boolean>();
    private subscriptions: Subscription = new Subscription();
    @ViewChild('fileInput') fileInput!: ElementRef;

    constructor(
        private graphQLService: AppGraphQLService,
        private router: Router,
        private activatedRoute: ActivatedRoute,
        private formBuilder: FormBuilder,
        private dialog: MatDialog,
        private timerService: AppTimerService,
        private authService: AppAuthService,
        private cacheService: AppCacheService,
        private uiSyncService: AppUiSyncService,
        private sanitizer: DomSanitizer,
        private uploadService: AppUploadService,

        @Optional() public dialogRef: MatDialogRef<UserComponent>,
        @Optional() @Inject(MAT_DIALOG_DATA) public data: any
    ){
        if (this.data) {
            this.userId = this.data.userId
        }
    }

    async ngOnInit() {
        await this.loadMe();
        if (this.userId) {
            this.isLoading = true;
            await this.loadUser();
            if (this.me?.userRole === 'admin') {
                await this.loadRequestedUser();
            }
            this.isLoading = false;
        }
        
        const sub = this.activatedRoute.paramMap.subscribe(async (params)=> {
            this.id = Number(params.get('id')); 
            
            if (this.id) {
                await this.loadMe(); 
            }
        });  
        this.subscriptions.add(sub);
    }

    ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
    }
    ngAfterViewInit(): void {
        console.log('after INIT url: ', this.url)
        //this.url='https://pub-47d114dd1f484b288223e868b177d37e.r2.dev/1064/profile-images/web-app-manifest-512x512.png'
    }
    async loadUser(){
        const query = `query ($userId: Int!){
            user (userId: $userId){
                id
                userRole
                firstName
                lastName
                dob
                phone
                email
                streetAddress
                city
                postCode
                updatedAt
                profilePictureUrl
            }
        }`
        try {
            const response = await this.graphQLService.send(query, {userId: this.userId});
            this.formattedDate = DateTime.fromISO(response.data.user?.dob).toFormat('MMM dd, yyyy') 
            this.user = response.data.user || null;
            this.url = response.data.user.profileProfileUrl;
        } catch (error){
            this.isLoading = false;
            this.dialog.open(AlertComponent, {data: {message: error}});
        }
    }
     async loadRequestedUser(){
        const query = `query ($userId: Int!){
            request (userId: $userId){
                id
                firstName
                lastName
                email
                createdAt
            }
        }`
        try {
            const response = await this.graphQLService.send(query, {userId: this.userId});
            this.request = response.data.request || null;
        } catch (error){
            this.isLoading = false;
            this.dialog.open(AlertComponent, {data: {message: error}});
        }
    }

    async loadMe(options?:{useCache:boolean, forceFetch:boolean}) {
        const query = `query {
            me {
                id
                userRole
                firstName
                lastName
                dob
                phone
                email
                streetAddress
                city
                postCode
                updatedAt
                profilePictureUrl
            }
        }`

        try {
            const response = await this.graphQLService.send(query, options);
            if (response.data.me) {
                this.formattedDate = DateTime.fromISO(response.data.me.dob).toFormat('MMM dd, yyyy') 
                this.me = response.data.me;
                this.isUpdated = response.data.me.updatedAt;
                this.url = response.data.me.profilePictureUrl;
                this.buildForm();
            }
        } catch (error){
            this.router.navigate(['/']);
            this.dialog.open(AlertComponent, {data: {message: error}});
        }
    }

    updateUser(){
        this.router.navigate(['/home/user', this.me?.id])
    }
    async deleteUser(){
        const dialogRef = this.dialog.open(ConfirmComponent, {data: {message: "Deleting account and all associated data permanently"}})
        
        const sub = dialogRef.componentInstance.isConfirming.subscribe(async ()=> {
            if (this.me) {

                if (this.me.userRole === 'admin') {
                    this.isDeletingUser.emit(true);
                    return;
                }
                const mutation = `mutation ($userId: Int!) {
                    logOut
                    deleteUser(userId: $userId) {
                        success
                        message
                    }
                }`

                const ref = this.dialog.open(LoadingComponent);
                try {
                    const response = await this.graphQLService.mutate(mutation, { userId: this.me.id});
                    if (response.data.deleteUser.success) {
                        this.timerService.cancelTokenTimer();
                        await this.authService.logOut();
                        this.router.navigate(['']);
                        this.dialog.closeAll();
                    } else {
                        ref.close();
                        this.dialog.open(AlertComponent, { data: {message: "Error deleting user: "+ response.data.deleteUser.message}});
                    }

                } catch (error) {
                    this.dialog.open(AlertComponent, { data: {message: "Error deleting user: "+ error}});
                }
            }
        });
        this.subscriptions.add(sub); 
    }

    buildForm() {
        const usersEmail = this.me?.email && !this.me?.email.includes('insertedonbankingsignup') ? this.me.email : '';
        if (this.me) {
            this.form = this.formBuilder.group({
                firstName: this.formBuilder.control<string>(this.me.firstName || '', [Validators.required, Validators.minLength(2)]),
                lastName: this.formBuilder.control<string>(this.me.lastName || '', [Validators.required, Validators.minLength(2)]),
                dob: this.formBuilder.control<string>(this.me.dob || '', [Validators.required]),
                email: this.formBuilder.control<string>(usersEmail, [Validators.required, Validators.email]),
                phone: this.formBuilder.control<string>(this.me.phone || '', [Validators.required, Validators.maxLength(10), Validators.pattern(/^[0-9.]+$/)]),
                streetAddress: this.formBuilder.control<string>(this.me?.streetAddress || '', [Validators.required]),
                city: this.formBuilder.control<string>(this.me.city || '', [Validators.required]),
                postCode: this.formBuilder.control<string>(this.me.postCode || '', [Validators.required]),
            });
        }
    }

    async save() {
        const input: UserInput = {
            id: this.id,
            firstName: this.form?.value.firstName,
            lastName: this.form?.value.lastName,
            email: this.form?.value.email,
            dob: this.form?.value.dob,
            phone: this.form?.value.phone,
            streetAddress : this.form?.value.streetAddress,
            city: this.form?.value.city,
            postCode: this.form?.value.postCode
        }

        const mutation = `mutation ($userInput: UserInput!){
            saveUser(userInput: $userInput) {
                success
                message
            }
        }`
        const ref = this.dialog.open(LoadingComponent);
        try {
            const response = await this.graphQLService.mutate(mutation, { userInput: input });

            if (response.data.saveUser.success) {
                this.cacheService.clearCachedMe();
                const options = {
                    useCache: true,
                    forceFetch: true
                }
                await this.loadMe(options);
                this.cacheService.updateCachedMe({...this.me as User});
                this.uiSyncService.triggerSync(USER_UPDATED);
                this.router.navigate(['/home/user']); 
                ref.close();
            } else {
                ref.close();
                this.dialog.open(AlertComponent, { data: {message: response.data.saveUser.message}})
            }
        } catch (error) {
            ref.close();
            this.dialog.open(AlertComponent, { data: {message: "Error saving user details: "+ error}})
        }
    }

    cancel() {
        this.router.navigate(['/home/user']);
    }

    openCalendar(userId: number){
        this.router.navigate(['/home/appointments/calendar'], { queryParams: { id: userId } });
        this.dialog.closeAll();
    }

    onFileSelected(input: FileList): void {
        const file = input.item(0);
        
        if (file) {
            // Validate file type
            if (!file.type.match('image/(jpeg|png|jpg)')) {
                this.imageForm.get('imageFile')?.setErrors({ invalidType: true });
                this.previewUrl = null;
                return;
            }

            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                this.imageForm.get('imageFile')?.setErrors({ maxSize: true });
                this.previewUrl = null;
                return;
            }

            // Set form value
            this.imageForm.patchValue({ imageFile: file });
            this.imageForm.get('imageFile')?.updateValueAndValidity();

            // Create preview
            this.createPreview(file);
        }
    }
    private createPreview(file: File): void {
        const reader = new FileReader();
        reader.onload = (e: any) => {
        this.previewUrl = this.sanitizer.bypassSecurityTrustUrl(e.target.result);
        };
        reader.readAsDataURL(file);
    }

    triggerFileInput(): void {
        const fileInput = document.getElementById('fileInput') as HTMLElement;
        fileInput.click();
    }

    removeImage(): void {
        this.imageForm.patchValue({ imageFile: null });
        this.previewUrl = null;
        this.imageForm.get('imageFile')?.setErrors(null);
    }

    getFileName(): string {
        const file = this.imageForm.get('imageFile')?.value;
        return file ? file.name : 'No file chosen';
    }   
    
    async handleFileInput(event: any) {
        const file = event.target.files[0];     
        if (file instanceof File) {
            this.uploadService.uploadImage(file)
                .then((res)=> this.url = res)
            console.log('URL: ', this.url)
        } else {
            this.dialog.open(AlertComponent, {data: "Invalid file type"});
        }
    }
}
