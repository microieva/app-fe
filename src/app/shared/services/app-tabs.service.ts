import { Injectable } from '@angular/core';
import { AppointmentComponent } from '../../graphql/appointment/appointment.component';

export interface ITab {
    title: string
    component: any
    id: number
}

@Injectable()
export class AppTabsService {

    addTab(title: string, component: any, id: number) {
        const tabs = localStorage.getItem('tabs');
        if (tabs) {
            const arr = JSON.parse(tabs);
            arr.push({title, id});
            localStorage.setItem('tabs', JSON.stringify(arr));
        } else {
            const arr = JSON.stringify([{title, id}]);
            localStorage.setItem('tabs', arr);
        }
    }

    closeTab(id: number): void {
        const tabs = JSON.parse(localStorage.getItem('tabs') || '[]');
        const tab = tabs.find((tab: any) => tab.id === id);
        const index = tabs.indexOf(tab);

        if (index !== -1) {
            tabs.splice(index, 1);
        }
        const tabsStr = JSON.stringify(tabs)
        localStorage.setItem('tabs', tabsStr);
    }

    getTabs(): ITab[] {
        const tabs = JSON.parse(localStorage.getItem('tabs') || '[]');
        if (tabs) {
            const t = tabs.map((tab: {id: number, title: string}) => {
                return {
                    component: AppointmentComponent,
                    id: tab.id,
                    title: tab.title
                }
            });
            return t;
        }
        return [];
    }
}