import { Component, OnInit } from "@angular/core";
import { AppGraphQLService } from "../../shared/services/app-graphql.service";
import { take } from "rxjs";
import { User } from "./user";
import _, { some } from "lodash-es";
import { ActivatedRoute, Router } from "@angular/router";
import { FormGroup, FormControl, FormBuilder, Validators } from "@angular/forms";
import { AppDialogService } from "../../shared/services/app-dialog.service";
import { UserInput } from "./user.input";
import { AppAuthService } from "../../shared/services/app-auth.service";
import { AppTimerService } from "../../shared/services/app-timer.service";

@Component({
    selector: 'app-user',
    templateUrl: './user.component.html',
    styleUrls: ['./user.component.scss']
})
export class UserComponent implements OnInit {
    me: User | undefined;
    missingInfo: boolean = false;
    id: number | undefined;
    form: FormGroup | undefined;

    constructor(
        private graphQLService: AppGraphQLService,
        private router: Router,
        private activatedRoute: ActivatedRoute,
        private formBuilder: FormBuilder,
        private dialog: AppDialogService,
        private authService: AppAuthService,
        private timerService: AppTimerService
    ){
        this.form = undefined;    
    }

    async ngOnInit() {
        await this.loadMe();
        this.checkUserInfo();

        this.activatedRoute.paramMap.subscribe(async (params)=> {
            this.id = Number(params.get('id')); 
            
            if (this.id) {
                await this.loadMe(); 
            }
        });
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
            }
        }`
        this.graphQLService
            .send(query)
            .pipe(take(1))
            .subscribe(async (res) => {
                try {
                    this.me = await res.data.me;
                    this.buildForm();
                    this.missingInfo = this.checkUserInfo(); 
                }catch {
                    this.router.navigate(['/']) // doesnt work
                }
        });
    }

    checkUserInfo(){
        return some(this.me, value => value === null);
    }

    updateUser(){
        this.router.navigate(['user', this.me?.id])
    }
    deleteUser(){
        const dialogRef = this.dialog.open({ data: { isDeleting: true }})
        
        dialogRef.componentInstance.ok.subscribe((value)=> {
            if (value && this.me?.id) {
                
                const mutation = `mutation ($userId: Int!) {
                    deleteUser(userId: $userId) {
                        success
                        message
                    }
                }`
                const response = this.graphQLService.mutate(mutation, { userId: this.me.id});
                response
                    .pipe(take(1))
                    .subscribe(res => {
                        if (res.data.deleteUser.success) {
                            this.timerService.cancelTimer();
                            this.authService.logOut(); 
                        } else {
                            this.dialog.open({ data: { message: res.data.deleteUser.message}})
                        }
                    }) 
            }
        }) 
    }

    buildForm() {
        this.form = this.formBuilder.group({
            firstName: this.formBuilder.control<string>(this.me?.firstName || '', [Validators.required, Validators.minLength(2)]),
            lastName: this.formBuilder.control<string>(this.me?.lastName || '', [Validators.required, Validators.minLength(2)]),
            dob: this.formBuilder.control<string>(this.me?.dob || '', [Validators.required]),
            email: this.formBuilder.control<string>(this.me?.email || '', [Validators.required, Validators.email]),
            phone: this.formBuilder.control<string>(this.me?.phone || '', [Validators.required, Validators.maxLength(10), Validators.pattern(/^[0-9.]+$/)]),
            streetAddress: this.formBuilder.control<string>(this.me?.streetAddress || '', [Validators.required]),
            city: this.formBuilder.control<string>(this.me?.city || '', [Validators.required]),
            postCode: this.formBuilder.control<string>(this.me?.postCode || '', [Validators.required]),
        });
    }

    save() {
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
        const response = this.graphQLService.mutate(mutation, { userInput: input })
        response
            .pipe(take(1))
            .subscribe(res => {
                if (res.data.saveUser.success) {
                    this.router.navigate(['user']);
                } else {
                    this.dialog.open({ data: { message: res.data.saveUser.message }})
                }
            })
    }

    cancel() {
        this.router.navigate(['user']);
    }
}

type UserForm = FormGroup<({
    firstName: FormControl<string>
    lastname: FormControl<string>
    dob: FormControl<string>
    email: FormControl<string>
    phone: FormControl<string>
    streetAddress: FormControl<string>
    city: FormControl<string>
    postCode: FormControl<string>
})>