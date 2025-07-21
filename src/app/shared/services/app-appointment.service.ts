import { Injectable } from "@angular/core";
import { Apollo, gql } from "apollo-angular";
import { BehaviorSubject, distinctUntilChanged, Subscription } from "rxjs";
import { AppGraphQLService } from "./app-graphql.service";

@Injectable({
    providedIn: 'root'
})
export class AppAppointmentService {   
    private appointmentSubject = new BehaviorSubject<any>(null);
    appointmentInfo$ = this.appointmentSubject.asObservable();
    private pollingSubscription: Subscription | null = null;

    private missedAppointments = new BehaviorSubject<number>(0);
    missedAppointmentsCount$ = this.missedAppointments.asObservable();

    constructor(
        private apollo: Apollo,
        private graphQLService: AppGraphQLService
    ) {}

    pollNextAppointment() {
        const query = gql`query { 
            nextAppointment {
                nextId
                nextStart
                nextEnd
                previousAppointmentDate
                recordIds
                patient {
                    firstName
                    lastName
                    dob
                }
                patientMessage
                doctorMessage
            }
        }`;

        this.pollingSubscription = this.apollo.watchQuery({
                query,
                fetchPolicy: 'network-only',
                pollInterval: 1200000,  
                notifyOnNetworkStatusChange: false
            }).valueChanges.pipe(
            distinctUntilChanged((prev, current) => 
                JSON.stringify(prev.data) === JSON.stringify(current.data)
            )
            ).subscribe({
            next: (result) => {
                if (result.data) {
                this.appointmentSubject.next(result.data);
                }
            },
            error: (err) => {
                console.error('Polling error:', err);
                this.stopPolling();
            }
        });
    }

    stopPolling() {
        this.appointmentSubject.next(null);
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
            return null;
        } catch (error) {
            return;
        }
    }

    async countMissedAppointments() {

        const query = `query { countMissedAppointments }`

        await this.graphQLService.send(query)
            .then((response: any) => {

                const count = response.data.countMissedAppointments;
                this.missedAppointments.next(count);
            })
            .catch((error) => {
                console.error('Error fetching unread messages count:', error);
            });
    }
}