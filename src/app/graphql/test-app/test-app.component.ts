import { Component, OnInit } from "@angular/core";
import { AppGraphQLService } from "../../services/app-graphql.service";
import { TestApp } from "./test-app";
import { take } from "rxjs";
import { FormBuilder, FormControl, FormGroup } from "@angular/forms";
import { TestAppInput } from "./test-app.input";

@Component({
    selector: 'test-app',
    templateUrl: './test-app.component.html',
    styleUrls: ['./test-app.component.scss']
})
export class TestAppComponent implements OnInit {
    testApps: TestApp[] = [];
    form: FormGroup | undefined;
    resp: any
    
    constructor(
        private graphQLService: AppGraphQLService,
        private formBuilder: FormBuilder
    ){}

    async ngOnInit() {
        await this.loadTestApps()
        this.buildForm();
    }

    async loadTestApps() {
        const query = `
            query {
                testApps {
                    id
                    testAppName
                }
            }
        `
        //await this.dialog(LoadingComponent)
        this.graphQLService
            .send(query)
            .pipe(take(1))
            .subscribe(result => {
                this.testApps = result.data.testApps;
            });
    }

    buildForm() {
        this.form = this.formBuilder.group({
            testAppName: this.formBuilder.control<string>(''),
            isAppConnected: this.formBuilder.control<boolean>(false)
        }) as FormGroup
    }

    save() {
        const input = this.form?.value;
        const mutation = `mutation ($testAppInput: TestAppInput){
            saveTestApp(testAppInput: $testAppInput) {
                success
            }
        }`
        const response = this.graphQLService.mutation(mutation, { testAppInput: input})
        response.subscribe(res => {
            if (res.data.saveTestApp.success) {
                this.ngOnInit();
            }
        })
    }
    deleteTestApp(id: number) {
        const mutation = `mutation ($testAppId: Int!) {
            deleteTestApp(testAppId: $testAppId) {
                success
                message
            }
        }`
        const response = this.graphQLService.mutation(mutation, { testAppId: id})
        response.subscribe(res => {
            if (res.data.deleteTestApp.success) {
                this.ngOnInit();
            }
        })
        
    }
}


type TestForm = FormGroup<({
    testAppName: FormControl<string>
    isAppConnected: FormControl<boolean>
})>