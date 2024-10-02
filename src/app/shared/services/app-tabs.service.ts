import { Injectable } from '@angular/core';
import { AppointmentComponent } from '../../graphql/appointment/appointment.component';
import { MatTab, MatTabGroup } from '@angular/material/tabs';

export interface ITab {
    title: string
    component: any
    id: number
}

@Injectable({
  providedIn: 'root'
})
export class AppTabsService {

    addTab(title: string, component: any, id: number, tabGroup?: MatTabGroup) {
        const tabs = localStorage.getItem('tabs');
        let tabArray = tabs ? JSON.parse(tabs) : [];

        const index = 3;
        const newTab = { title, id };

        if (tabArray.length > 0) {
          tabArray.unshift(newTab)
        } else {
          tabArray.push(newTab);
        }
        localStorage.setItem('tabs', JSON.stringify(tabArray)); 

        const tabsInGroup = tabGroup?._tabs.toArray();    
        const newMatTab = {
          label: title,
          content: component
        } as unknown;
    
        if (tabsInGroup && tabsInGroup.length >= index) {
          tabsInGroup.splice(index, 0, newMatTab as MatTab);
        } else {
          tabsInGroup?.push(newMatTab as MatTab);
        }
    
        tabsInGroup && tabGroup?._tabs.reset(tabsInGroup);
        tabGroup?._tabs.notifyOnChanges();   
        tabGroup && tabGroup.selectedIndex === index;
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
        console.log('TABS WHEN 0 ? ----> ', tabs)
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