import { Subscription } from "rxjs";
import { Component, EventEmitter, Inject, OnDestroy, OnInit, Optional, Output } from "@angular/core";
import { FormGroup, FormBuilder, Validators } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { trigger, state, style, transition, animate } from "@angular/animations";
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from "@angular/material/dialog";
import { DateTime } from "luxon";
import { AppGraphQLService } from "../../shared/services/app-graphql.service";
import { AppTimerService } from "../../shared/services/app-timer.service";
import { AppAuthService } from "../../shared/services/app-auth.service";
import { AppHeaderService } from "../../shared/services/app-header.service";
import { AlertComponent } from "../../shared/components/app-alert/app-alert.component";
import { ConfirmComponent } from "../../shared/components/app-confirm/app-confirm.component";
import { LoadingComponent } from "../../shared/components/app-loading/loading.component";
import { UserInput } from "./user.input";
import { DoctorRequest } from "./doctor-request";
import { User } from "./user";

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
export class UserComponent implements OnInit, OnDestroy {
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

    @Output() isDeletingUser = new EventEmitter<boolean>();
    private subscriptions: Subscription = new Subscription();

    constructor(
        private graphQLService: AppGraphQLService,
        private router: Router,
        private activatedRoute: ActivatedRoute,
        private formBuilder: FormBuilder,
        private dialog: MatDialog,
        private timerService: AppTimerService,
        private authService: AppAuthService,
        private headerService: AppHeaderService,

        @Optional() public dialogRef: MatDialogRef<UserComponent>,
        @Optional() @Inject(MAT_DIALOG_DATA) public data: any
    ){
        if (this.data) {
            this.userId = this.data.userId
        }
    }

    async ngOnInit() {
        if (this.userId) {
            this.isLoading = true;
            await this.loadStatic();
        }
        await this.loadMe();

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

    async loadStatic(){
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
            }
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
            if (response.data) {
                this.formattedDate = DateTime.fromISO(response.data.user?.dob).toFormat('MMM dd, yyyy') 
                this.user = response.data.user || null;
                this.request = response.data.request || null;
                this.isLoading = false;
            }
        } catch (error){
            this.router.navigate(['/']);
            this.dialog.open(AlertComponent, {data: {message: error}});
        }
    }

    async loadMe() {
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
            }
        }`

        try {
            const response = await this.graphQLService.send(query, true);
            if (response.data.me) {
                this.formattedDate = DateTime.fromISO(response.data.me.dob).toFormat('MMM dd, yyyy') 
                this.me = response.data.me;
                this.isUpdated = response.data.me.updatedAt;

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
                const response = await this.graphQLService.mutate(mutation, { userId: this.me.id});
                if (response.data.deleteUser.success) {
                    this.timerService.cancelTokenTimer();
                    await this.authService.logOut();
                    this.router.navigate(['']);
                    this.dialog.closeAll();
                } else {
                    ref.close();
                    this.dialog.open(AlertComponent, { data: {message: "Error deleting user: "+ response.error}})
                }
            }
        });
        this.subscriptions.add(sub); 
    }

    buildForm() {
        if (this.me) {
            this.form = this.formBuilder.group({
                firstName: this.formBuilder.control<string>(this.me.firstName || '', [Validators.required, Validators.minLength(2)]),
                lastName: this.formBuilder.control<string>(this.me.lastName || '', [Validators.required, Validators.minLength(2)]),
                dob: this.formBuilder.control<string>(this.me.dob || '', [Validators.required]),
                email: this.formBuilder.control<string>(this.me.email || '', [Validators.required, Validators.email]),
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

        try {
            const response = await this.graphQLService.mutate(mutation, { userInput: input });
            if (response.data.saveUser.success) {
                this.router.navigate(['/home/user']);
                this.headerService.notifyUserUpdate();
            }
        } catch (error) {
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
}
