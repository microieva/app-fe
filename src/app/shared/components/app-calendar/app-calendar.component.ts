import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from "@angular/core";
import { CalendarOptions, DateSelectArg, EventClickArg, EventApi, DayCellContentArg, EventDropArg, DatesSetArg, ViewMountArg, DayCellMountArg } from '@fullcalendar/core';
import { ActivatedRoute, Router } from "@angular/router";
import { MatDialog } from "@angular/material/dialog";
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import { Subscription } from "rxjs";
import { DateTime } from "luxon";
import { AppGraphQLService } from "../../services/app-graphql.service";
import { AppDialogService } from "../../services/app-dialog.service";
import { AppAppointmentService } from "../../services/app-appointment.service";
import { AlertComponent } from "../app-alert/app-alert.component";
import { EventComponent } from "../app-event/app-event.component";
import { ConfirmComponent } from "../app-confirm/app-confirm.component";
import { createEventId } from "../../constants";
import { Appointment } from "../../../graphql/appointment/appointment";
import { AppointmentInput } from "../../../graphql/appointment/appointment.input";
import { getNow } from "../../utils";
import { LoadingComponent } from "../app-loading/loading.component";

@Component({
    selector: 'app-calendar',
    templateUrl: './app-calendar.component.html',
    styleUrls: ['app-calendar.component.scss']
})
export class AppCalendarComponent implements OnInit, OnDestroy {
    @Output() appointment = new EventEmitter<AppointmentInput>();
    @Output() snackbar = new EventEmitter<any>();
    @Input() role!: 'admin' | 'doctor' | 'patient';

    appointmentSelections: string[] = [];
    calendarOptions!: CalendarOptions;
    currentEvents: EventApi[] = [];
    appointments: Appointment[] = [];
    allDayAppointments: Appointment[] = [];
    selectedAppointments!: string;
    events: any = []; 
    patientId: number | undefined;
    monthStart: any;
    monthEnd: any;
    isLoading: boolean = true;

    private subscriptions: Subscription = new Subscription();

    constructor(
        private dialog: MatDialog,
        private graphQLService: AppGraphQLService,
        private router: Router,
        private activatedRoute: ActivatedRoute,
        private dialogService: AppDialogService,
        private appointmentService: AppAppointmentService
    ){
       
    }
  
    async ngOnInit() {
        const sub = this.activatedRoute.queryParams.subscribe(params => {
            this.patientId = +params['id']; 
        });
        this.subscriptions.add(sub);

        if (this.role === 'admin' && !this.patientId) {
            this.appointmentSelections = [];
            this.selectedAppointments = 'Missed requests';
            this.initializeCalendar();
        } else {
            this.selectedAppointments = 'All'
            this.appointmentSelections = ['All', 'Pending confirmation', 'Upcoming', 'Past', 'Missed requests']
            
            this.initializeCalendar();
        }
    }

    async loadEvents(){
        switch (this.selectedAppointments) {
            case 'Pending confirmation':
                await this.loadPendingAppointments();
                this.initializeCalendar();
                return;
            case 'Upcoming':
                await this.loadUpcomingAppointments();
                this.initializeCalendar();
                return;
            case 'Past':
                await this.loadPastAppointments();
                this.initializeCalendar();
                return;
            case 'Missed requests':
                await this.loadMissedAppointments();
                this.initializeCalendar();
                return;
            default:
                if (this.role === 'admin' && !this.patientId) {
                    await this.loadMissedAppointments();
                    this.initializeCalendar();
                    return;
                } else {
                    await this.loadAllAppointments();
                    this.initializeCalendar();
                    return;
                }
        }
    }

    initializeCalendar(){
        this.calendarOptions = {
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
            },
            plugins: [dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin],
            initialView: 'dayGridMonth',
            timeZone: 'Europe/Helsinki',
            events: this.events,
            views: {
                dayGrid: {
                    contentHeight:800,
                    dayMaxEvents: 2,
                    dayMaxEventRows: 2
                },
            },
            dayCellClassNames: (arg: DayCellContentArg)=> this.customDayClassNames(arg),
            datesSet: (arg: DatesSetArg) => this.onDatesSet(arg),
            weekends: true,
            editable: true,
            selectable: true,
            selectMirror: true,
            dayMaxEvents: true,
            dayMaxEventRows: true,
            moreLinkClick: 'popover',
            eventDisplay: 'block',
            select: (arg: DateSelectArg)=> this.handleDateSelect(arg),
            eventClick: (arg: EventClickArg) =>this.handleEventClick(arg),
            eventsSet: (arg: EventApi[]) => this.handleEvents(arg),
            eventDrop: (arg: EventDropArg)=> this.handleEventDrop(arg),
            businessHours: {
                daysOfWeek: [ 1, 2, 3, 4, 5 ],
                startTime: '08:00', 
                endTime: '18:00'
            },
            viewDidMount: (arg: ViewMountArg) => this.onViewChange(arg),
            dayCellDidMount: (info: any) => {
                info.el.addEventListener('touchstart', (event: any) => {
                  event.preventDefault(); 
          
                  const dateSelectArg: DateSelectArg = {
                    start: info.date, 
                    end: new Date(info.date.getTime() + 24 * 60 * 60 * 1000), 
                    allDay: false, 
                    startStr: info.date.toISOString().split('T')[0], // ISO string without time
                    endStr: new Date(info.date.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // End ISO string
                    jsEvent: event,
                    view: info.view
                  };
              
                    this.handleDateSelect(dateSelectArg);
                });
            },
            // eventDidMount: (info: any) => {
            //     info.el.addEventListener('touchstart', (event: TouchEvent) => {
            //         event.preventDefault(); 
            
            //         const eventClickArg: EventClickArg = {
            //             el: info.el, 
            //             event: info.event, 
            //             jsEvent: event as any, 
            //             view: info.view 
            //         };
            
            //         this.handleEventClick(eventClickArg);
            //         let touchStartX = event.touches[0].clientX;
            //         let touchStartY = event.touches[0].clientY;
            
            //         const handleTouchMove = (moveEvent: TouchEvent) => {
            //           const touchEndX = moveEvent.touches[0].clientX;
            //           const touchEndY = moveEvent.touches[0].clientY;
            
            //           // Calculate drag distance
            //           const deltaX = touchEndX - touchStartX;
            //           const deltaY = touchEndY - touchStartY;
            
            //           // Threshold to detect drag (adjust as needed)
            //           if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
            //             // Simulate an EventDropArg object
            //             const eventDropArg: EventDropArg = {
            //               event: info.event, // The FullCalendar event object
            //               oldEvent: { ...info.event }, // Simulate old event state (optional)
            //               relatedEvents: [], // Related events (if any)
            //               jsEvent: moveEvent as any, // The native touch event
            //               view: info.view // Current view
            //             };
            
            //             // Call the handleEventDrop method with the constructed argument
            //             this.handleEventDrop(eventDropArg);
            
            //             // Remove the touchmove listener to prevent multiple triggers
            //             document.removeEventListener('touchmove', handleTouchMove);
            //           }
            //         };
            //     });
            // }
            eventDidMount: (info: any) => {
                let isDragging = false; 
              
                info.el.addEventListener('touchstart', (event: TouchEvent) => {
                    const touchStartX = event.touches[0].clientX;
                    const touchStartY = event.touches[0].clientY;
                    const startTime = new Date().getTime(); 
                
                    isDragging = false;
                
                    const handleTouchMove = (moveEvent: TouchEvent) => {
                        const touchEndX = moveEvent.touches[0].clientX;
                        const touchEndY = moveEvent.touches[0].clientY;
                        const deltaX = touchEndX - touchStartX;
                        const deltaY = touchEndY - touchStartY;
                
                        if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
                        isDragging = true;
                
                        const eventDropArg = {
                            event: info.event, 
                            oldEvent: { ...info.event },
                            relatedEvents: [], 
                            jsEvent: moveEvent, 
                            view: info.view 
                        
                        };
                
                        this.handleEventDrop(eventDropArg); 
                        document.removeEventListener('touchmove', handleTouchMove); 
                    }
                };
              
                const handleTouchEnd = () => {
                    const touchEndTime = new Date().getTime(); 
                    const touchDuration = touchEndTime - startTime;
              
                    if (!isDragging && touchDuration < 300) {
                      const eventClickArg: EventClickArg = {
                        el: info.el, 
                        event: info.event, 
                        jsEvent: event as any,
                        view: info.view 
                      };
              
                      this.handleEventClick(eventClickArg); 
                    }
              
                    document.removeEventListener('touchmove', handleTouchMove);
                    document.removeEventListener('touchend', handleTouchEnd);
                };
              
                document.addEventListener('touchmove', handleTouchMove);
                document.addEventListener('touchend', handleTouchEnd);
                });
            }     
        }
        this.isLoading = false;
    }
    async onViewChange(arg: ViewMountArg) {
        this.monthStart = arg.view.currentStart;
        this.monthEnd = arg.view.currentEnd;
        if (this.selectedAppointments) {
            await this.loadEvents();
        } 
    }

    onDatesSet(dateInfo: DatesSetArg) {
        this.monthStart = dateInfo.start;
        this.monthEnd = dateInfo.end;
        this.loadEvents();
    }

    async handleEventDrop(arg: any) {
        const now = getNow();
        const isFuture = this.isFuture(arg);
        const isDouble = this.isDouble(arg);
        const isOverlapping = this.isOverlapping(arg);

        if (!isFuture) {
            arg.revert();
            return;
        }
        if (isDouble || isOverlapping) {
            arg.revert();
            return;
        }

        if (this.role === 'patient') {
            if (arg.event.extendedProps.doctorId && arg.event.startStr > now) {
                this.dialog.open(AlertComponent, {data: {message: "Cannot change the appointment time since it has been already accepted by a doctor... Consider cancelling appointment and creating a new one."}});
                arg.revert();
                return;
            } 
            if (arg.event.endStr < now)  {
                this.dialog.open(AlertComponent, {data: {message: "The appointment time has already past"}});
                arg.revert();
                return;
            }
        } else if (this.role = 'doctor'){
            if (!arg.event.extendedProps.doctorId || arg.event.endStr < now) {
                arg.revert();
                return;
            }
        }

        const newStart = arg.event.start;
        const newEnd = arg.event.end;
        
        const event: any = {
            id: arg.event.extendedProps.dbId,
            start: newStart,
            end: newEnd,
            allDay: false,
            patientId: arg.event.extendedProps.patientId
        }
        await this.saveAppointment(event);
        await this.loadEvents();
    }

    async saveAppointment(appointmentInput: AppointmentInput) : Promise<Appointment | null>{
        const mutation = `
            mutation ($appointmentInput: AppointmentInput!) {
                saveAppointment (appointmentInput: $appointmentInput) {
                    success
                    message
                    data {
                        ... on Appointment {
                            id
                            start
                            end
                            patientId
                            createdAt
                            allDay  
                        }
                    } 
                        
                }
            }
        `  
        try {
            //const ref = this.dialog.open(LoadingComponent);
            const response = await this.graphQLService.mutate(mutation, {appointmentInput});
            //ref.close();       
            if (response.data.saveAppointment.success) {
                if (this.role === 'doctor') {
                    this.appointmentService.pollNextAppointment();
                }

                return response.data.saveAppointment.data;
            } else {
                this.dialog.open(AlertComponent, {data: {message:response.data.saveAppointment.message}});
                return null;
            }
        } catch (error) {
            this.dialog.open(AlertComponent, {data: {message: "Error saving appointment: "+error}});
            return null;
        }
    }

    onCheckboxChange(value: string) {
        if (value) {
            this.selectedAppointments = value;
            this.loadEvents();
        }
    }

    async loadAllAppointments() {
        const ref = this.dialog.open(LoadingComponent);
        const query = `
            query  ($monthStart: Date!, $monthEnd: Date!, $patientId: Int){
                calendarAllAppointments (
                    monthStart: $monthStart,
                    monthEnd: $monthEnd,
                    patientId: $patientId
                ){
                    monthSlice {
                        id
                        start
                        end
                        allDay
                        updatedAt
                        doctorId
                        patientId
                        patient {
                            id
                            firstName
                            lastName
                        }
                        doctor {
                            firstName
                            lastName
                        }
                    }
                }
            }
        `
        const variables = {
            monthStart: this.monthStart,
            monthEnd: this.monthEnd,
            patientId: this.patientId || null
        }

        try {
            const response = await this.graphQLService.send(query, variables);
            if (response.data) {
                this.appointments = response.data.calendarAllAppointments.monthSlice;
                let title: string;

                const now = DateTime.now().toISO({ includeOffset: true });
                this.events = this.appointments.map((appointment: Appointment) => {
                    
                const start = appointment.start;
                const end = appointment.end;


                if (this.role !== 'patient') {
                    title = appointment.patient.firstName+' '+appointment.patient.lastName
                } else if (this.role === 'patient' && appointment.doctor) {
                    title = 'Dr. '+appointment.doctor.firstName+' '+appointment.doctor.lastName
                } else if (this.role === 'patient' && !appointment.doctor) {
                        if (!appointment.doctorId && start! < now) {
                        title = "Missed request"
                    } else if (!appointment.doctorId && end! > now) {
                        title = "Pending confirmation"
                    }
                }

                    return {
                        title,
                        start,
                        end,
                        extendedProps: {
                            dbId: appointment.id,
                            doctorId: appointment.doctorId,
                            patientId: appointment.patientId
                        }
                    }
                });
                ref.close();
            } 
        } catch (error) {
            this.dialog.open(AlertComponent, {data: {message: 'Unexpected error loading all appointments: '+error}}) 
            this.router.navigate(['appointments'])
        }
    }
    async loadMissedAppointments() {
        const query = `query  ($monthStart: Date!, $monthEnd: Date!, $patientId: Int){
                calendarMissedAppointments (
                    monthStart: $monthStart,
                    monthEnd: $monthEnd,
                    patientId: $patientId
                ){
                    monthSlice {
                        id
                        start
                        end
                        allDay
                        updatedAt
                        doctorId
                        patientId
                        patient {
                            id
                            firstName
                            lastName
                        }
                    }
                }
            }
        `
        const variables = {
            monthStart: this.monthStart,
            monthEnd: this.monthEnd,
            patientId: this.patientId || null
        }

        try {
            const response = await this.graphQLService.send(query, variables);
            if (response.data) {
                this.appointments = response.data.calendarMissedAppointments.monthSlice;
                this.events = this.appointments.map((appointment: Appointment) => {
                    let title;
                    if (this.role !== 'patient') {
                        title = appointment.patient.firstName+' '+appointment.patient.lastName
                    } else {
                        title = "Missed request"
                    }
       
                    const start = appointment.start;
                    const end = appointment.end;

                    return {
                        title,
                        start,
                        end,
                        extendedProps: {
                            dbId: appointment.id,
                            patientId: appointment.patientId
                        }
                    }
                });
            } 
        } catch (error) {
            this.dialog.open(AlertComponent, {data: {message: 'Unexpected error loading all appointments: '+error}}) 
            this.router.navigate(['appointments'])
        }
    }
    async loadPendingAppointments() {
        const query = `
            query ($monthStart: Date!, $monthEnd: Date!, $patientId: Int){
                calendarPendingAppointments (
                    monthStart: $monthStart,
                    monthEnd: $monthEnd,
                    patientId: $patientId
                ){
                    monthSlice {
                        id
                        start
                        end
                        allDay
                        patientId
                        doctorId
                        updatedAt
                        patient {
                            firstName
                            lastName
                        }
                    }
                }
            }
        `
        const variables = {
            monthStart: this.monthStart,
            monthEnd: this.monthEnd,
            patientId: this.patientId || null
        }

        try {
            const response = await this.graphQLService.send(query, variables);

            if (response.data) {
                this.appointments = response.data.calendarPendingAppointments.monthSlice;
                let title: string;
                this.events = this.appointments.map((appointment: Appointment) => {
                    if (this.role !== 'patient') {
                        title = appointment.patient.firstName+' '+appointment.patient.lastName;
                    } else {
                        title =  "Pending confirmation";
                    }
        
                    const start = appointment.start;
                    const end = appointment.end;

                    return {
                        title,
                        start,
                        end,
                        extendedProps: {
                            dbId: appointment.id,
                            doctorId: appointment.doctorId
                        }
                    }
                });
            } 
        } catch (error) {
            this.dialog.open(AlertComponent, {data: {message: 'Unexpected error loading calendar pending appointments: '+error}}) 
        }
    }
    async loadUpcomingAppointments() {
        const query = `query ($monthStart: Date!, $monthEnd: Date!, $patientId: Int){
            calendarUpcomingAppointments (
                monthStart: $monthStart,
                monthEnd: $monthEnd,
                patientId: $patientId
            ){
                monthSlice {
                    id
                    start
                    end
                    allDay
                    patientId
                    doctorId
                    updatedAt
                    patient {
                        firstName
                        lastName
                    }
                    doctor {
                        firstName
                        lastName
                    }
                }
            }
        }`

        const variables = {
            monthStart: this.monthStart,
            monthEnd: this.monthEnd,
            patientId: this.patientId || null
        }
        try {
            const response = await this.graphQLService.send(query, variables);

            if (response.data) {
                this.appointments = response.data.calendarUpcomingAppointments.monthSlice;
                this.events = this.appointments.map((appointment: Appointment) => {
                    let title;
                    if (this.role !== 'patient') {
                        title = appointment.patient.firstName+' '+appointment.patient.lastName
                    } else if (this.role === 'patient' && appointment.doctor) {
                        title = 'Dr. '+appointment.doctor.firstName+' '+appointment.doctor.lastName
                    } 
    
                    const start = appointment.start;
                    const end = appointment.end;

                    return {
                        title,
                        start,
                        end,
                        extendedProps: {
                            dbId: appointment.id,
                            doctorId: appointment.doctorId
                        }

                    }
                  });
            } 
        } catch (error) {
            this.dialog.open(AlertComponent, {data: {message: 'Unexpected error loading upcoming appointments: '+error}}) 
        }
    }
    async loadPastAppointments() {
        const query = `query ($monthStart: Date!, $monthEnd: Date!, $patientId: Int){
            calendarPastAppointments (
                monthStart: $monthStart,
                monthEnd: $monthEnd,
                patientId: $patientId
            ){
                monthSlice {
                    id
                    start
                    end
                    allDay
                    patientId
                    doctorId
                    updatedAt
                    patient {
                        firstName
                        lastName
                    }
                    doctor {
                        firstName
                        lastName
                    }
                }
            }
        }`

        const variables = {
            monthStart: this.monthStart,
            monthEnd: this.monthEnd,
            patientId: this.patientId || null
        }
        try {
            const response = await this.graphQLService.send(query, variables);

            if (response.data) {
                this.appointments = response.data.calendarPastAppointments.monthSlice;
                this.events = this.appointments.map((appointment: Appointment) => {
                    let title;
                    if (this.role !== 'patient') {
                        title = appointment.patient.firstName+' '+appointment.patient.lastName
                    } else if (this.role === 'patient' && appointment.doctor) {
                        title = 'Dr. '+appointment.doctor.firstName+' '+appointment.doctor.lastName
                    } 

                    const start = appointment.start;
                    const end = appointment.end;

                    return {
                        title,
                        start,
                        end,
                        extendedProps: {
                            dbId: appointment.id,
                            title: 'Past'
                        }

                    }
                  });
            } 
        } catch (error) {
            this.dialog.open(AlertComponent,{data: {message: 'Unexpected error loading pending appointments: '+error}}) 
        }
    }

    async handleAddEvent(arg: any){
        if (this.role === 'admin' && !this.patientId) {
            arg.unselect();
            return;
        }
        if (arg.view.type === 'timeGridWeek' || arg.view.type === 'timeGridDay') {
            const calendarApi = arg.view.calendar;
            let start: any;
            let end: any;

            const startDateTime = DateTime.fromJSDate(arg.start)
            const endDateTime = DateTime.fromJSDate(arg.end)

            start = startDateTime.toISO({includeOffset: true});
            end = endDateTime.toISO({includeOffset:true});

            const event = {
                id: createEventId(),
                title: "New appointment",
                start: arg.allDay ? start : arg.startStr,
                end: arg.allDay ? end : arg.endStr,
                allDay: arg.allDay
            }

            if (this.role === 'doctor') {
                const dialogRef = this.dialog.open(
                    ConfirmComponent, {data: {message: "Reserve full day?"}}
                );
                const sub = dialogRef.componentInstance.isConfirming.subscribe(async () => {
                    calendarApi.addEvent(event);
                    const input = {
                        start: event.start,
                        end: event.end,
                        allDay: event.allDay
                    }
                    await this.saveAppointment(input);
                    calendarApi.changeView('dayGridMonth', arg.start);
                });
                this.subscriptions.add(sub);
            } else {
                const eventInfo = {
                    start: DateTime.fromISO(arg.startStr).toFormat('HH:mm a'),
                    end: DateTime.fromISO(arg.endStr).toFormat('HH:mm a'),
                    date: DateTime.fromJSDate(new Date(arg.start)).toFormat('MMM dd, yyyy')
                }
                const input = {
                    start,
                    end,
                    allDay: arg.allDay,
                    patientId: this.patientId || undefined
                }
                
                const dialogRef = this.dialog.open(EventComponent, {disableClose: true, data: { eventInfo: input }});
                const sub = dialogRef.afterOpened().subscribe(() => {
                    this.dialogService.notifyDialogOpened();
                });

                const subSubmit = dialogRef.componentInstance.isSubmitting.subscribe(() => {
                    //if (value) {
                        this.dialog.closeAll();
                        calendarApi.addEvent(event);
                        //calendarApi.changeView('dayGridMonth');
                    //}
                });
                const subDelete = dialogRef.componentInstance.isDeleting.subscribe(async id => {

                    if (id) {
                        this.dialog.closeAll();
                        const mutation = `mutation ($appointmentId: Int!) {
                            deleteAppointment (appointmentId: $appointmentId) {
                                success
                                message
                            }
                        }`
                        try {
                            const response = await this.graphQLService.mutate(mutation, { appointmentId: id});
                            if (!response.data.deleteAppointment.success) {
                                this.dialog.open(AlertComponent, { data: { message: response.data.deleteAppointment.message}})
                            }
                        } catch (error) {
                            this.dialog.open(AlertComponent, { data: { message: "Error deleting appointment: "+ error}})
                        }
                    }
                });
                this.subscriptions.add(sub);
                this.subscriptions.add(subSubmit);
                this.subscriptions.add(subDelete);
            }
        }
    }

    customDayClassNames(arg: DayCellContentArg): string[] {
        const eventCount = this.getNumberOfAppointmentsOnSelectedDay(arg.date)
        if (this.isDisabledDay(arg.date)) {
            return [''];
        } 
        return [];
    }

    isDisabledDay(date: any): boolean {
        return this.currentEvents.some(event => {
            const d = DateTime.fromJSDate(date);
            if ((event.allDay && d.toFormat('yyyy-MM-dd') === event.startStr)) {
                return true;
            }
            return;
        });
    }

    setDisplayText() {
        const disabledDays = document.querySelectorAll('.disabled-day');
        disabledDays.forEach(el => {
            const titleEl = document.createElement('div');
            titleEl.className = 'disabled-day-title';
            titleEl.innerHTML = `Full day..`;
            el.appendChild(titleEl);
        })
    }

    handleDateSelect(arg: DateSelectArg) {
        const calendarApi = arg.view.calendar;
        const numberOfAppointmentsOnSelectedDay = this.getNumberOfAppointmentsOnSelectedDay(arg.start);

        switch (arg.view.type) {

            case 'dayGridMonth':
                this.handleMonthView(arg);
                break;
            case 'timeGridWeek':
                if (this.role !== 'doctor') {
                    this.handleWeekView(arg);
                } else {
                    if (arg.allDay && numberOfAppointmentsOnSelectedDay <1) this.handleDayView(arg);
                    else if (arg.allDay && numberOfAppointmentsOnSelectedDay >0) {
                        this.dialog.open(AlertComponent, {data: {message: "You have appointments on this day"}});
                        calendarApi.unselect();
                    }
                    else calendarApi.unselect();
                }
                break;
            case 'timeGridDay':
                if (this.role !== 'doctor') {
                    if (!arg.allDay) this.handleDayView(arg);
                    else calendarApi.unselect();
                } else {
                    if (arg.allDay && numberOfAppointmentsOnSelectedDay <1) this.handleDayView(arg);
                    else if (arg.allDay && numberOfAppointmentsOnSelectedDay >0) {
                        this.dialog.open(AlertComponent, {data: {message: "You have appointments on this day"}});
                        calendarApi.unselect();
                    }
                    calendarApi.unselect();
                }
                break;
            default:
                break;
        }
    }
 
    getNumberOfAppointmentsOnSelectedDay(start: Date): number{
        const date = DateTime.fromJSDate(start).toFormat('yyyy-MM-dd').toString()
        return this.appointments.filter((appointment) => {
            const start = DateTime.fromISO(appointment.start).toFormat('yyyy-MM-dd').toString();   
            if (date === start && appointment.doctorId) {
                return appointment;
            }
            return null;
        }).length
    }

    handleMonthView(arg: any) {
        const target = document.querySelector(`.fc-daygrid-day[data-date="${arg.startStr}"]`);

        if (
            target 
            && (
                target.classList.contains('disabled-day') 
                || target.classList.contains('fc-day-sun') 
                || target.classList.contains('fc-day-sat') 
            )
            || (this.role === 'admin' && !this.patientId)
        ) {
            return;
        } else {
            const calendarApi = arg.view.calendar;
            calendarApi.changeView('timeGridDay', arg.start);
            calendarApi.updateSize();
        }
    }

    handleWeekView(arg: any){
        const isFuture = this.isFuture(arg);

        if (arg.allDay && isFuture) {
            this.handleAddEvent(arg);
        }

        if (this.isBusinessHours(arg) && arg.start.getDay() !== 0) {
            this.handleAddEvent(arg);
        } 

        const calendarApi = arg.view.calendar;
        if (!arg.allDay) this.dialog.open(AlertComponent, {data: {message: "Outside working hours"}})
        calendarApi.unselect();    
    }
    
    handleDayView(arg: DateSelectArg) {
        const isDouble = this.isDouble(arg) 
        const isBusinessHours = this.isBusinessHours(arg);
        const isFuture = this.isFuture(arg);
        const calendarApi = arg.view.calendar;

        if ((!isDouble && isBusinessHours && isFuture) || (arg.allDay && isFuture)) {
            this.handleAddEvent(arg);
        } 

        if (!isBusinessHours && !arg.allDay) this.dialog.open(AlertComponent, {data: {message: "Outside working hours"}});
        calendarApi.unselect(); 
    }

    isDouble(arg: DateSelectArg | EventDropArg): boolean {
        const startStr1 = DateTime.fromISO((arg as DateSelectArg)?.startStr, { zone: 'utc' }).startOf('minute')        
        const startStr2 = DateTime.fromISO((arg as EventDropArg).event?.startStr, { zone: 'utc' }).startOf('minute') 

        const argStart = startStr1.isValid ? startStr1 : startStr2

        return this.appointments.some((event) => {
            const eventStart = DateTime.fromISO(event.start, { zone: 'utc' }).startOf('minute'); 
            const eventEnd = DateTime.fromISO(event.end, { zone: 'utc' }).startOf('minute'); 

            return eventStart.equals(argStart);
        });
    }
    isOverlapping = (arg: DateSelectArg | EventDropArg): boolean => {
        const startStr1 = DateTime.fromISO((arg as DateSelectArg).startStr, { zone: 'utc' }).startOf('minute')        
        const startStr2 = DateTime.fromISO((arg as EventDropArg).event.startStr, { zone: 'utc' }).startOf('minute') 

        const argStart = startStr1.isValid ? startStr1 : startStr2;

        const endStr1 = DateTime.fromISO((arg as DateSelectArg).endStr, { zone: 'utc' }).startOf('minute')        
        const endStr2 = DateTime.fromISO((arg as EventDropArg).event.endStr, { zone: 'utc' }).startOf('minute') 

        const argEnd =  endStr1.isValid ? endStr1 : endStr2;

        const newDuration = argEnd.diff(argStart, 'minutes').minutes;
    
        return this.appointments.some((event) => {
            const eventStart = DateTime.fromISO(event.start, { zone: 'utc' }).startOf('minute');
            const eventEnd = DateTime.fromISO(event.end, { zone: 'utc' }).startOf('minute');
            const eventDuration = eventEnd.diff(eventStart, 'minutes').minutes;
    
            if (newDuration > eventDuration) {
                return eventStart >= argStart && eventEnd <= argEnd;
            } else {
                return argStart >= eventStart && argEnd <= eventEnd;
            }
        });
    };

    isFuture(arg: DateSelectArg | EventDropArg): boolean {
        const now = new Date();
        const isFuture = (arg as DateSelectArg).startStr || (arg as EventDropArg).event.startStr;
        return new Date(isFuture) > now;
    }

    isBusinessHours(date: any): boolean {
        const start = DateTime.fromISO(date.startStr);
        const hour = start.hour
        return hour >= 8 && hour < 18;
    }

    handleEventClick(clickInfo: EventClickArg) {
        const eventInfo = {
            title: clickInfo.event.title,
            id: clickInfo.event.extendedProps['dbId']
        }
        const event = this.events.find((event: any)=> event.extendedProps.dbId === eventInfo.id)
        const samePatient:boolean = !this.patientId ? true : event.extendedProps.patientId === this.patientId;
        const dialogRef = this.dialog.open(EventComponent, {data: {eventInfo, samePatient}});

        const subDelete = dialogRef.componentInstance.isDeleting.subscribe(id => {

            if (id) {
                const ref = this.dialog.open(ConfirmComponent, {data: {message: 'This appointment booking will be cancelled'}});
                const sub = ref.componentInstance.isConfirming.subscribe(async ()=> {       
                    const mutation = `mutation ($appointmentId: Int!) {
                        deleteAppointment (appointmentId: $appointmentId) {
                            success
                            message
                        }
                    }`
    
                    try {
                        const response = await this.graphQLService.mutate(mutation, { appointmentId: id});
                        if (response.data.deleteAppointment.success) {
                            this.dialog.closeAll();
                            clickInfo.event.remove();
                            this.ngOnInit();
                        }
                    } catch (error) {
                        this.dialog.open(AlertComponent, { data: { message: "Error deleting appointment: "+ error}})
                    }
                });
                this.subscriptions.add(sub); 
            }
        });
        const subUpdate = dialogRef.componentInstance.update.subscribe(value =>{
            if (value) {
                this.loadEvents();
            }
        })

        this.subscriptions.add(subDelete);
        this.subscriptions.add(subUpdate);
    }

    handleEvents(events: EventApi[]) {
        this.currentEvents = events;
    }

    ngOnDestroy(){
        this.subscriptions.unsubscribe();
    }
}