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
                    testAppName
                }
            }
        `
        //await this.dialog(LoadingComponent)
        const response = this.graphQLService
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
}


type TestForm = FormGroup<({
    testAppName: FormControl<string>
    isAppConnected: FormControl<boolean>
})>