import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, Renderer2, ViewChild } from "@angular/core";
import { Subscription } from "rxjs";
import { MatDialog } from "@angular/material/dialog";
import { NavigationEnd, Router } from "@angular/router";
import { animate, state, style, transition, trigger } from "@angular/animations";
import { BreakpointObserver } from "@angular/cdk/layout";
import { AppGraphQLService } from "../../services/app-graphql.service";
import { AppUiSyncService } from "../../services/app-ui-sync.service";
import { AlertComponent } from "../app-alert/app-alert.component";
import { User } from "../../../graphql/user/user";
import { USER_UPDATED } from "../../constants";

@Component({
    selector: 'app-home',
    templateUrl: 'app-home.component.html',
    styleUrls: ['app-home.component.scss'],
    animations: [
        trigger('slideInOut', [
            state('in', style({ transform: 'translateY(0)', opacity: 1 })),
            transition(':enter', [
                style({ transform: 'translateY(80%)', opacity: 0.1 }),
                animate('600ms cubic-bezier(0.25, 0.8, 0.25, 1)', style({ transform: 'translateY(0)', opacity: 1 }))
            ])
        ])
    ]
})
export class AppHomeComponent implements OnInit, AfterViewInit, OnDestroy {
    isDesktop: boolean = true; 
    showSidenav:boolean = false;
    isHomeRoute: boolean = true;
    isLoading: boolean = true;
    isUserUpdated: boolean = false;
    showIcon:boolean = true;
    me: User | undefined;
    userRole!: string;
    // nowAppointment: Appointment | null = null;

    private subscriptions: Subscription[] = []

    @ViewChild('sidenav', { read: ElementRef }) sidenavElement: ElementRef | undefined;
    @ViewChild('resize', { read: ElementRef }) resizeElement!: ElementRef;
    @ViewChild('sidenavContent', { read: ElementRef }) sidenavContent: ElementRef | undefined;
    isResizing = false;
    lastDownX = 60;

    constructor(
        private breakpointObserver: BreakpointObserver,
        private uiSyncService: AppUiSyncService,
        private renderer: Renderer2,
        private router: Router,
        private graphQLService: AppGraphQLService,
        private dialog: MatDialog
    ){}

    async ngOnInit() {
        const screenSize = this.breakpointObserver.observe(['(min-width: 1024px)', '(max-width: 1431px)']).subscribe(result => {
            this.isDesktop = this.breakpointObserver.isMatched('(min-width: 1024px)');
        });
        
        const toggle = this.uiSyncService.toggleSidenav.subscribe((toggle:boolean)=> {
            this.showSidenav = toggle
            if (this.showSidenav) {
                this.renderer.setStyle(this.sidenavElement?.nativeElement, 'width', `288px`);
            } 
        });

        const uiSync = this.uiSyncService.sync(USER_UPDATED)
            .subscribe({
                next: () => this.isUserUpdated = true,
                error: (err) => console.error('Sync failed:', err)
            });

        await this.loadMe();
        const routerEvent = this.router.events.subscribe(async (event) => {
            this.isHomeRoute = this.router.url === '/home' || (event as NavigationEnd).url === '/home';        
        });
        this.subscriptions.push(screenSize, toggle, uiSync, routerEvent); 
        if (this.me) this.dialog.closeAll();
        this.isLoading = false;
    //     if (this.me && this.userRole === 'doctor') {
    //         const nowAppointment = await this.appointmentService.loadNowAppointment();
    //         let isTabAdded: boolean = false;

    //         if (nowAppointment) {
    //             const patientName = nowAppointment.patient.firstName+" "+nowAppointment.patient.lastName;
    //             const start = DateTime.fromISO(nowAppointment.start, {zone:'utc'}).setZone('utc').toFormat('HH:mm a');
    //             isTabAdded = JSON.parse(localStorage.getItem('tabs') || '[]').find((tab: any)=> tab.id === nowAppointment?.id);
    //             let isTabCreated: boolean;
                
    //             const subRouteParams = this.activatedRoute.queryParams.subscribe(params => {
    //                 const tab = params['tab'];
    //                 if (!tab) isTabCreated = false;
    //                 isTabCreated = true;
    //             });

    //             if (!isTabAdded) {
    //                 this.tabsService.addTab("offline start: "+start, AppointmentComponent, nowAppointment.id);
    //                 const ref = this.dialog.open(AlertComponent, {data: {message: "Current appointment with "+patientName+", started at "+start}});
    //                 ref.componentInstance.ok.subscribe(() => {
    //                     this.router.navigate(['/home/appointments'])
    //                 })
    //                 this.nowAppointment = nowAppointment;
    //             } 
    //             this.subscriptions.push(subRouteParams);
    //         }
    //     }
    //     this.requestSocketStatus();
    // }

    // requestSocketStatus() {
    //     this.roomService.requestUserStatus(this.me?.id  || 0);    
    // }

    // // async loadLatestDoctorRequests() {
    // //     const query = `query (
    // //         $pageIndex: Int!, 
    // //         $pageLimit: Int!, 
    // //         $sortDirection: String, 
    // //         $sortActive: String,
    // //         $filterInput: String
    // //     ){ 
    // //         doctors (
    // //             pageIndex: $pageIndex, 
    // //             pageLimit: $pageLimit,
    // //             sortDirection: $sortDirection,
    // //             sortActive: $sortActive,
    // //             filterInput: $filterInput
    // //         ){
    // //             length
    // //             slice {
    // //                 ... on User {
    // //                     id
    // //                     email
    // //                     firstName
    // //                     lastName
    // //                     createdAt
    // //                 }
    // //             }
    // //         }
    // //     }`
    // //     const variables = {
    // //         pageIndex: 0,
    // //         pageLimit: 5,
    // //         sortActive: 'createdAt',
    // //         sortDirection: 'DESC',
    // //         filterInput: null
    // //     }
    // //     try {
    // //         const response = await this.graphQLService.send(query, variables);
    // //         if (response.data) {
    // //             this.doctors = response.data.doctors.slice;
    // //             this.doctorsLength = response.data.doctors.length;
    // //             //this.formatDataSource("doctors")
    // //             //this.isLoading = false;
    // //         }
    // //     } catch (error) {
    // //         this.dialog.open(AlertComponent, {data: {message: "Unexpected error loading requests: "+error}})
    // //     }
    }

    ngAfterViewInit() {
        this.renderer.listen(this.resizeElement.nativeElement, 'click', (event: MouseEvent) => {
            event.stopPropagation(); 
        });
          
        this.renderer.listen(this.sidenavElement?.nativeElement, 'mousedown', (event: MouseEvent) => this.onMouseDown(event));
        this.renderer.listen(document, 'mousemove', (event: MouseEvent) => this.onMouseMove(event));
        this.renderer.listen(document, 'mouseup', () => this.onMouseUp());       
    }
    displayIcon(bool:boolean){
        this.showIcon = !bool;
    }

    onMouseDown(event: MouseEvent) {
        event.stopPropagation();
        this.isResizing = true;
        this.lastDownX = event.clientX;
    }

    onMouseMove(event: MouseEvent) {
        event.stopPropagation();
        if (this.isResizing) {
            const newWidth = event.clientX;
            const adjustedWidth = Math.max(20, Math.min(newWidth, 288));
            this.renderer.setStyle(this.sidenavElement?.nativeElement, 'width', `${adjustedWidth}px`);
            if (adjustedWidth > 55) {
                this.renderer.setStyle(this.sidenavContent?.nativeElement, 'margin-left', `${adjustedWidth}px`);
            } else {
                this.renderer.setStyle(this.sidenavContent?.nativeElement, 'margin-left', `60px`);
            }
        } 
    }

    onMouseUp() {
        this.isResizing = false;
    }
    async loadMe() {
        const query = `query { 
            me { 
                id
                userRole 
                updatedAt
                lastLogOutAt
                firstName
                lastName
                email
            }
        }`
        try {

            const response = await this.graphQLService.send(query);
            if (response.data.me) {
                this.me = response.data.me;
                this.userRole = response.data.me.userRole;
                this.isUserUpdated = response.data.me.updatedAt;
            } 
        } catch (error) {
            this.dialog.open(AlertComponent, {data:{message:error}})
        }
    }
    onClickNavLink(){
        this.isResizing = false;
        if (!this.isDesktop) {
            this.showSidenav = !this.showSidenav;
            if (!this.showSidenav) {
                this.uiSyncService.openSidenav(false);
            }
        }
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach(sub => sub.unsubscribe());
    }
}