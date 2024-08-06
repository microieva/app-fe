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
}