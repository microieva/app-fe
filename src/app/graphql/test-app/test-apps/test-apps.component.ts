import { Component, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { AppGraphQLService } from "../../../shared/services/app-graphql.service";
import { AppDialogService } from "../../../shared/services/app-dialog.service";
import { TestApp } from "../test-app";

@Component({
    selector: 'test-apps',
    templateUrl: './test-apps.component.html',
    styleUrls: ['./test-apps.component.scss']
})
export class TestAppsComponent implements OnInit {
    testApps: TestApp[] = [];

    constructor(
        private graphQLService: AppGraphQLService,
        private dialog: AppDialogService,
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
        try {
            const response = await this.graphQLService.send(query);
            if (response.data) {
                this.testApps = response.data.testApps;
            }
        } catch (error) {
            this.dialog.open({data: {message: error}});
        }
        // this.graphQLService
        //     .send(query)
        //     .pipe(take(1))
        //     .subscribe(res => {
        //         if (res.loading) {
        //             this.dialog.open({ data: {loading: true}});
        //         }
        //         this.testApps = res.data.testApps;
        //     });
    }

    addTestApp(){
        this.router.navigate(['test-apps', 'new'])
    }

    deleteTestApp(id: number) {
        const dialogRef = this.dialog.open({ data: { isDeleting: true }})
        
        dialogRef.componentInstance.ok.subscribe((value)=> {
            if (value) {
                this.sendMutation(id);
            }
        })  
    }

    async sendMutation(id: number) {
        const mutation = `mutation ($testAppId: Int!) {
            deleteTestApp(testAppId: $testAppId) {
                success
                message
            }
        }`

        try {
            await this.graphQLService.mutate(mutation, { testAppId: id});
            this.ngOnInit();
        } catch (error){
            this.dialog.open({data: {message: error}});
        }
        // response
        // .pipe(take(1))
        // .subscribe(res => {
        //     if (res.data.deleteTestApp.success) {
        //         this.ngOnInit();
        //     }
        // }) 
    }
}