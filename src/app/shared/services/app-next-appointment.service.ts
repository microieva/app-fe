import { Injectable } from "@angular/core";
import { Apollo, gql } from "apollo-angular";
import { BehaviorSubject, Subscription } from "rxjs";

@Injectable({
    providedIn: 'root'
})
export class AppNextAppointmentService {   
    private appointmentSubject = new BehaviorSubject<any>(null);
    public appointmentInfo = this.appointmentSubject.asObservable();
    private pollingSubscription: Subscription | null = null;

    constructor(private apollo: Apollo) {}

    async pollNextAppointment() {
        const query = gql`query { 
            nextAppointment {
                nextId
                nextStart
                nextEnd
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

    /*async pollNextAppointmentStartTime(){
        console.log('**********************************POLLING FOR start time CALLED')
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
            //this.stopPolling();
        }

        this.pollingSubscription = this.apollo
        .watchQuery({
          query,
          fetchPolicy: 'network-only',
          pollInterval: 10000 
        })
        .valueChanges.subscribe(result => {
            if (result.data) {
                this.appointmentSubject.next(result.data);
                console.log('POLL DATA result :', result);
                //this.stopPolling();
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
      }*/
}