import { Component, OnInit } from "@angular/core";
import { TestApp } from "../test-app";
import { AppGraphQLService } from "../../../shared/services/app-graphql.service";
import { take } from "rxjs";
import { Router } from "@angular/router";

@Component({
    selector: 'test-apps',
    templateUrl: './test-apps.component.html',
    styleUrls: ['./test-apps.component.scss']
})
export class TestAppsComponent implements OnInit {
    testApps: TestApp[] = [];
    constructor(
        private graphQLService: AppGraphQLService,
        private router: Router
    ){}

    async ngOnInit() {
        await this.loadTestApps();
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
        //await this.dialog(LoadingComponent) implement OkCancelComponent OkCompoennt <-for errors
        this.graphQLService
            .send(query)
            .pipe(take(1))
            .subscribe(res => {
                this.testApps = res.data.testApps;
            });
    }
    addTestApp(){
        this.router.navigate(['test-apps', 'new'])
    }
    deleteTestApp(id: number) {
        const mutation = `mutation ($testAppId: Int!) {
            deleteTestApp(testAppId: $testAppId) {
                success
                message
            }
        }`
        const response = this.graphQLService.mutate(mutation, { testAppId: id})
        response
            .pipe(take(1))
            .subscribe(res => {
                if (res.data.deleteTestApp.success) {
                    this.ngOnInit();
                }
            })   
    }
}