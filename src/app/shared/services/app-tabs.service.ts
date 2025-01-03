import { Injectable } from '@angular/core';
import { AppointmentComponent } from '../../graphql/appointment/appointment.component';
import { MatTab, MatTabGroup } from '@angular/material/tabs';
import { ChatComponent } from '../../graphql/chat/chat.component';

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
    addChatTab(title: string, component: any, id: number, tabGroup?: MatTabGroup) {
        const chats = localStorage.getItem('chats');
        let chatArray = chats ? JSON.parse(chats) : [];

        const index = 1;
        const newChat = { title, id };

        if (chatArray.length > 0) {
            chatArray.unshift(newChat)
        } else {
            chatArray.push(newChat);
        }
        localStorage.setItem('chats', JSON.stringify(chatArray)); 

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

    closeChatTab(id: number): void {
        const chats = JSON.parse(localStorage.getItem('chats') || '[]');
        const chat = chats.find((chat: any) => chat.id === id);
        const index = chats.indexOf(chat);

        if (index !== -1) {
            chats.splice(index, 1);
        }
        const tabsStr = JSON.stringify(chats)
        localStorage.setItem('chats', tabsStr);
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
    getChatTabs(): ITab[] {
        const chats = JSON.parse(localStorage.getItem('chats') || '[]');
        if (chats) {
            const t = chats.map((chat: {id: number, title: string}) => {
                return {
                    component: ChatComponent,
                    id: chat.id,
                    title: chat.title
                }
            });
            return t;
        }
        return [];
    }
}