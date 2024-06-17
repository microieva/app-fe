import { Component, OnInit } from "@angular/core";
import { AppGraphQLService } from "../../shared/services/app-graphql.service";
import { TestApp } from "./test-app";
import { take } from "rxjs";
import { FormBuilder, FormControl, FormGroup, Validators } from "@angular/forms";
import { TestAppInput } from "./test-app.input";
import { ActivatedRoute, Router } from "@angular/router";

@Component({
    selector: 'test-app',
    templateUrl: './test-app.component.html',
    styleUrls: ['./test-app.component.scss']
})
export class TestAppComponent implements OnInit {
    testApp: TestApp | undefined;
    form: FormGroup | undefined;
    
    constructor(
        private graphQLService: AppGraphQLService,
        private formBuilder: FormBuilder,
        private activatedRoute: ActivatedRoute,
        private router: Router
        //private dialog: dialog service
    ){
        this.form = undefined;
        this.testApp = undefined;
    }

    async ngOnInit() {
        this.activatedRoute.paramMap.subscribe(async (params )=> {
            const id = params.get('id'); 
            console.log('id from url: ', id)
            if (id) {
                await this.loadTestApp(Number(id));   
            }
            this.buildForm()
          });
    }

    async loadTestApp(id: number){
        const query = `query ($testAppId: Int!) {
            testApp(testAppId: $testAppId) {
                id
                testAppName
                isAppConnected
            }
        }`
        this.graphQLService
            .send(query, {testAppId: id})
            .pipe(take(1))
            .subscribe(res => {
                this.testApp = res.data.testApp;
                this.buildForm();
            });
    }

    buildForm() {
        this.form = this.formBuilder.group({
            testAppName: this.formBuilder.control<string>(this.testApp?.testAppName || '', [Validators.required, Validators.minLength(3)]),
            isAppConnected: this.formBuilder.control<boolean>(this.testApp?.isAppConnected || false)
        }) as TestForm
    }
    save() {
        let input: TestAppInput = this.form?.value;
        input.id = this.testApp?.id
        const mutation = `mutation ($testAppInput: TestAppInput){
            saveTestApp(testAppInput: $testAppInput) {
                success
                message
            }
        }`
        const response = this.graphQLService.mutate(mutation, { testAppInput: input })
        response
            .pipe(take(1))
            .subscribe(res => {
                if (res.data.saveTestApp.success) {
                    this.router.navigate(['test-apps']);
                } else {
                    console.error('Unexpected error while saving: ', res.data.saveTestApp.message)
                }
            })
    }
    cancel() {
        this.router.navigate(['test-apps'])
    }
}


type TestForm = FormGroup<({
    testAppName: FormControl<string>
    isAppConnected: FormControl<boolean>
})>