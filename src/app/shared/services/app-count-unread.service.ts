import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AppGraphQLService } from './app-graphql.service';

@Injectable({
   providedIn: 'root',
})
export class AppCountUnreadMessagesService {
    private unreadCountSource = new BehaviorSubject<number>(0);
    unreadCount$ = this.unreadCountSource.asObservable();

    constructor(private graphQLService: AppGraphQLService) {}

    async countUnreadMessages() {
        const query = `query { countUnreadMessages }`;

        await this.graphQLService.send(query)
            .then((response: any) => {
                const count = response.data.countUnreadMessages;
                this.unreadCountSource.next(count);
            })
            .catch((error) => {
                console.error('Error fetching unread messages count:', error);
            });
    }
}
