import { Injectable } from "@angular/core";
import { Apollo, gql } from "apollo-angular";
import { BehaviorSubject, Subscription } from "rxjs";

@Injectable({
    providedIn: 'root'
})
export class AppPollingService {   
    private appointmentSubject = new BehaviorSubject<any>(null);
    public isAppointment = this.appointmentSubject.asObservable();
    private pollingSubscription: Subscription | null = null;

    constructor(private apollo: Apollo) {}

    async pollNextAppointmentStartTime(){
        console.log('I AM CALLED')
        const query = gql`query { 
            nextAppointment {
                id
                start
                patient {
                    firstName
                    lastName
                    dob
                }
            }
        }`
        if (this.pollingSubscription) {
            this.stopPolling();
        }

        this.pollingSubscription = this.apollo
        .watchQuery({
          query,
          fetchPolicy: 'network-only',
          pollInterval: 10000 
        })
        .valueChanges.subscribe(result => {
          console.log('POLLING START :', result);
          if (result.data) {
            this.appointmentSubject.next(result.data);
            this.stopPolling();
          }
        });
    }
    async pollCurrentAppointmentEndTime(appointmentId: number){
        console.log('I AM CALLED for end polling')
        const query = gql`
        query ($appointmentId: Int!){ 
            currentAppointment (appointmentId: $appointmentId) {
                id
                start
                patient {
                    firstName
                    lastName
                    dob
                }
            }
        }`
        if (this.pollingSubscription) {
            this.stopPolling();
        }
        const variables = {appointmentId}

        this.pollingSubscription = this.apollo
            .watchQuery({
                query,
                variables,
                fetchPolicy: 'network-only',
                pollInterval: 10000 
            })
            .valueChanges.subscribe(result => {
                console.log('POLL ENDING result: ', result);
                if (result.data) {
                    this.appointmentSubject.next(result.data);
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
}