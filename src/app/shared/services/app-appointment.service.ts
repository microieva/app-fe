import { Injectable } from "@angular/core";
import { Apollo, gql } from "apollo-angular";
import { BehaviorSubject, Subscription } from "rxjs";
import { AppGraphQLService } from "./app-graphql.service";

@Injectable({
    providedIn: 'root'
})
export class AppAppointmentService {   
    private appointmentSubject = new BehaviorSubject<any>(null);
    public appointmentInfo = this.appointmentSubject.asObservable();
    private pollingSubscription: Subscription | null = null;

    constructor(
        private apollo: Apollo,
        private graphQLService: AppGraphQLService
    ) {}

    async pollNextAppointment() {
        console.log('----- poll -------')
        const query = gql`query { 
            nextAppointment {
                nextId
                nextStart
                nextEnd
                patient {
                    firstName
                    lastName
                }
            }
        }`
        this.pollingSubscription = this.apollo
            .watchQuery({
                query,
                fetchPolicy: 'network-only',
                pollInterval: 20 * 60 * 1000  
            })
            .valueChanges.subscribe(result => {
                if (result.data) {
                    this.appointmentSubject.next(result.data);
                } else {
                    this.stopPolling();
                }
            });
    }
    stopPolling() {
        if (this.pollingSubscription) {
          this.pollingSubscription.unsubscribe();
          this.pollingSubscription = null; 
        }
    }

    async loadNowAppointment() {
        const query = `query {
            nowAppointment {
                id
                patient {
                    id
                    firstName
                    lastName
                    dob
                    email
                    phone
                }
                doctor {
                    firstName
                    lastName
                }
                start
                end
                createdAt
                record {
                    id
                }
                record {
                    id
                    title
                    text
                }
            }
        }`
        try {
            const response = await this.graphQLService.send(query);
            if (response.data) {
                return response.data.nowAppointment;
            }
        } catch (error) {
            return null;
        }
    }
}