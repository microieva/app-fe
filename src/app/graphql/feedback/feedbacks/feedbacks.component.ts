import { Subscription, switchMap } from "rxjs";
import { trigger, state, style, transition, animate } from "@angular/animations";
import { Component, OnInit, OnDestroy, AfterViewInit } from "@angular/core";
import { MatTableDataSource } from "@angular/material/table";
import { MatDialog } from "@angular/material/dialog";
import { AppTableDisplayedColumns, FeedbackDataSource } from "../../../shared/types";
import { AppGraphQLService } from "../../../shared/services/app-graphql.service";
import { AlertComponent } from "../../../shared/components/app-alert/app-alert.component";
import { ConfirmComponent } from "../../../shared/components/app-confirm/app-confirm.component";
import { FeedbackComponent } from "../feedback/feedback.component";
import { getHowLongAgo } from "../../../shared/utils";
import { Feedback } from "../feedback";
import { FEEDBACK_CREATED } from "../../../shared/constants";
import { AppUiSyncService } from "../../../shared/services/app-ui-sync.service";

@Component({
    selector: 'app-feedbacks',
    templateUrl: 'feedbacks.component.html',
    styleUrls: ['feedbacks.component.scss'],
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
export class FeedbacksComponent implements OnInit, AfterViewInit, OnDestroy {
    isLoading: boolean = true;
    userRole:string = 'admin'
    dataSource: MatTableDataSource<FeedbackDataSource> | null = null;
    displayedColumns: AppTableDisplayedColumns[] = []
    actions: any[] | null= null;

    feedbacks: Feedback[] = [];
    feedbackDataSource:FeedbackDataSource[] | null = null;

    pageIndex:number = 0;
    pageLimit:number = 10
    sortActive:string = 'createdAt'
    sortDirection: 'ASC' | 'DESC' = 'DESC';
    filterInput:string | null = null;

    countFeedback:number = 0;
    countUnread:number = 0;
    length:number = 0;

    private subscription: Subscription = new Subscription();
    
    constructor(
        private graphQLService: AppGraphQLService,
        private dialog: MatDialog,
        private uiSyncService: AppUiSyncService,
    ){}

    async ngOnInit() {
        await this.loadStatic();
        if (this.countFeedback > 0) {
            await this.loadData();
        }
        this.isLoading = false;
    }
    ngAfterViewInit(): void {
        this.subscription.add(this.uiSyncService.sync(FEEDBACK_CREATED)
            .pipe(
                switchMap(async () => {await this.loadStatic(); await this.loadData()}))
            .subscribe({
                error: (err) => console.error('Sync failed:', err)
            }))
    }

    async loadStatic() {
        const query = `query {
            countFeedback
            countUnreadFeedback
        }`
        try {
            const response = await this.graphQLService.send(query);
            this.countFeedback = response.data.countFeedback;
            this.countUnread = response.data.countUnreadFeedback;
        } catch (error) {
            this.dialog.open(AlertComponent, {width:"35rem", data:{message:error}})
        }
    }
    async loadData(){
        const query = `query (
            $pageIndex: Int!, 
            $pageLimit: Int!, 
            $sortDirection: String, 
            $sortActive: String,
            $filterInput: String
        ){ 
            feedbacks (
                pageIndex: $pageIndex, 
                pageLimit: $pageLimit,
                sortDirection: $sortDirection,
                sortActive: $sortActive,
                filterInput: $filterInput
            ){
                length
                slice {
                    ... on Feedback {
                        id
                        email
                        name
                        text
                        isRead
                        createdAt
                    }
                }
            }
        }`
        const variables = {
            pageIndex: this.pageIndex,
            pageLimit: this.pageLimit,
            sortActive: this.sortActive,
            sortDirection: this.sortDirection,
            filterInput: this.filterInput
        }
        try {
            const response = await this.graphQLService.send(query, variables);
            if (response.data) {
                this.isLoading = false;
                this.feedbacks = response.data.feedbacks.slice;
                this.length = response.data.feedbacks.length;
                this.formatDataSource();
            }
        } catch (error) {
            this.dialog.open(AlertComponent, {data: {message: "Unexpected error loading requests: "+error}})
        }
    }
    formatDataSource(){
        const isAllRead = this.feedbacks.every(fb=> fb.isRead); 
        this.feedbackDataSource = this.feedbacks.map(feedback => {
            const createdAt = getHowLongAgo(feedback.createdAt); 
            this.actions = [
                {
                    text: "Delete"
                },
                {
                    text: "Mark as read",
                    disabled: isAllRead
                }
            ]
            return {
                id: feedback.id,
                name: feedback.name || 'Anonymous',
                email: feedback.email || 'Anonymous',
                isRead: feedback.isRead,
                createdAt,
                actions:this.actions
            }
        });
        this.displayedColumns = [ 
                {header: 'checkbox', columnDef: 'checkbox', sort: false},
                {header: 'Actions', columnDef: 'actions',  sort: false},
                {header: 'Name', columnDef: 'name', sort:true},
                {header: 'Email', columnDef: 'email', sort:true},
                {header: 'Feedback created', columnDef: 'createdAt', sort:true},
            ]
        this.dataSource = new MatTableDataSource<FeedbackDataSource>(this.feedbackDataSource);  
    }

    async onPageChange(value: any){
        this.pageIndex = value.pageIndex;
        this.pageLimit = value.pageLimit;
        await this.loadData();
    }
    async onSortChange(value: any){        
        this.sortActive = value.active;
        if (value.direction)
        this.sortDirection = value.direction.toUpperCase();
        await this.loadData();
    }
    async onFilterValueChange(value: any){
        this.filterInput = value;
        await this.loadData();
    }
    async onActionClick(event:any){
        switch (event.text) {
            case 'Delete':
                await this.deleteFeedbackByIds(event.ids);
                break;
            case 'Mark as read':
                await this.markAsReadFeedback(event.ids);
                break;
            default: 
                break;
        }
    }
    async markAsReadFeedback(ids:number[]) {
        let message:string;
        if (ids.length === 1) {
            message = "Mark as read?"
        } else {
            message = `${this.countUnread} feedbacks will be marked as read`
        }
        const ref = this.dialog.open(ConfirmComponent, {disableClose:true, width:"34rem", data:{message}});
        ref.componentInstance.isConfirming.subscribe(async ()=> {
            await this.setAsRead(ids);
        });
        ref.componentInstance.isCancelling.subscribe(async () => {
            this.ngOnDestroy();
            await this.ngOnInit();
        })
    }
    async deleteFeedbackByIds(ids:number[]){
        let message:string;
        if (ids.length === 1) {
            message = "Permanently delete this feedback?"
        } else {
            message = `${ids.length} feedbacks will be deleted`
        }
        const ref = this.dialog.open(ConfirmComponent, {disableClose:true, width:"34rem", data:{message}});
        ref.componentInstance.isConfirming.subscribe(async ()=> {
            const mutation = `mutation ($feedbackIds: [Int!]) {
                deleteFeedbacksByIds(feedbackIds: $feedbackIds) {
                    success
                    message
                }
            }`
            try {
                const response = await this.graphQLService.mutate(mutation, {feedbackIds:ids})
                if (response.data.deleteFeedbacksByIds.success) {
                    this.dialog.closeAll();
                    await this.ngOnInit();
                    this.dialog.open(AlertComponent, {data: {message:response.data.deleteFeedbacksByIds.message}})    
                } else {
                    const ref = this.dialog.open(AlertComponent, {data: {message:response.data.deleteFeedbacksByIds.message}});
                    ref.componentInstance.ok.subscribe(async ()=> {
                        await this.ngOnInit();
                    })
                }
            } catch (error) {
                const ref = this.dialog.open(AlertComponent, {data: {message:error}});
                ref.componentInstance.ok.subscribe(async ()=> {
                    await this.ngOnInit();
                })
            }
        });
        ref.componentInstance.isCancelling.subscribe(async () => {
            await this.ngOnInit();
        })
    }

    async onFeedbackClick(feedback:any){
        await this.setAsRead([feedback.id]);
        const ref = this.dialog.open(FeedbackComponent, {data: {feedbackId:feedback.id}})
        ref.componentInstance.isDeleting.subscribe(async ()=> {
            await this.deleteFeedbackByIds([feedback.id])
        })
    }
    async setAsRead(ids:number[]){
        const mutation = `mutation ($feedbackIds: [Int!]) {
            markAsReadFeedbacks(feedbackIds: $feedbackIds) {
                success
                message
            }
        }`
        try {
            const response = await this.graphQLService.mutate(mutation, {feedbackIds:ids})
            if (response.data.markAsReadFeedbacks.success) {
                await this.ngOnInit();   
            } else {
                const ref = this.dialog.open(AlertComponent, {data: {message:response.data.markAsReadFeedbacks.message}});
                ref.componentInstance.ok.subscribe(async ()=> {
                    await this.ngOnInit();
                })
            }
        } catch (error) {
            const ref = this.dialog.open(AlertComponent, {data: {message:error}});
            ref.componentInstance.ok.subscribe(async ()=> {
                await this.ngOnInit();
            })
        }
    }
    ngOnDestroy(): void {
        this.subscription.unsubscribe();
    }
}