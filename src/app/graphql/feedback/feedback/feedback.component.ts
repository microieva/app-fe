import { Component, OnInit, Inject, EventEmitter, Output } from "@angular/core";
import { MatDialogRef, MAT_DIALOG_DATA, MatDialog } from "@angular/material/dialog";
import { AppGraphQLService } from "../../../shared/services/app-graphql.service";
import { AlertComponent } from "../../../shared/components/app-alert/app-alert.component";
import { Feedback } from "../feedback";

@Component({
    selector: 'app-feedback',
    templateUrl: 'feedback.component.html',
    styleUrls: ['feedback.component.scss'],
})
export class FeedbackComponent implements OnInit {
    isLoading:boolean = true;
    feedbackId!:number
    feedback: Feedback | null = null;

    @Output() isDeleting = new EventEmitter<void>();

    constructor(
        private graphQLService: AppGraphQLService,
        private dialog: MatDialog,

        public dialogRef: MatDialogRef<FeedbackComponent>,
        @Inject(MAT_DIALOG_DATA) public data: any
    ){
        this.feedbackId = this.data.feedbackId;
    }
    async ngOnInit() {
        if (this.feedbackId) {
            await this.loadFeedback();
        }
    }
    async loadFeedback(){
        const query = `query ($feedbackId: Int!){ 
            feedback (feedbackId: $feedbackId){ 
                id
                name
                text
                email
                isRead
                createdAt
            }
        }`
        try {
            const response = await this.graphQLService.send(query, {feedbackId:this.feedbackId});
            this.isLoading = false;
            if (response.data) {
                this.feedback = response.data.feedback;
                if (this.feedback && !this.feedback.isRead) {
                    await this.setAsRead([this.feedback.id]);
                }
            }
        } catch (error) {
            this.isLoading = false;
            this.dialog.open(AlertComponent, {data:{message:error}})
        }
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
    onDelete(){
        this.isDeleting.emit();
    }
}