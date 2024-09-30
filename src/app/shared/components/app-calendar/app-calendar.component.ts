import { Component, EventEmitter, Input, OnInit, Output } from "@angular/core";
import { CalendarOptions, EventInput,DateSelectArg, EventClickArg, EventApi, DayCellContentArg, EventDropArg, DatesSetArg } from '@fullcalendar/core';
import { ActivatedRoute, Router } from "@angular/router";
import { MatDialog } from "@angular/material/dialog";
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import { DateTime, Interval } from "luxon";
import { AppGraphQLService } from "../../services/app-graphql.service";
import { AlertComponent } from "../app-alert/app-alert.component";
import { EventComponent } from "../app-event/app-event.component";
import { ConfirmComponent } from "../app-confirm/app-confirm.component";
import { createEventId } from "../../constants";
import { Appointment } from "../../../graphql/appointment/appointment";
import { AppointmentInput } from "../../../graphql/appointment/appointment.input";

@Component({
    selector: 'app-calendar',
    templateUrl: './app-calendar.component.html',
    styleUrls: ['app-calendar.component.scss']
})
export class AppCalendarComponent implements OnInit {
    @Output() appointment = new EventEmitter<AppointmentInput>();
    @Input() role!: string;

    appointmentSelections = ['All', 'Pending confirmation', 'Upcoming', 'Past', 'Missed requests']
    calendarVisible = true;
    calendarOptions!: CalendarOptions;
    currentEvents: EventApi[] = [];
    appointments: Appointment[] = [];
    allDayAppointments: Appointment[] = [];
    selectedAppointments: string = 'All';
    events: any = []; 
    patientId: number | undefined;
    monthStart: any;
    monthEnd: any;

    constructor(
        private dialog: MatDialog,
        private graphQLService: AppGraphQLService,
        private router: Router,
        private activatedRoute: ActivatedRoute
    ){}
  
    async ngOnInit() {
        this.activatedRoute.queryParams.subscribe(params => {
            this.patientId = +params['id']; 
        });
        this.initializeCalendar();
    }

    async loadEvents(type?: string){

        switch (type) {
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
                await this.loadAllAppointments();
                this.initializeCalendar();
                return;
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
            }
        }
    }

    onDatesSet(dateInfo: DatesSetArg) {
        this.monthStart = dateInfo.start;
        this.monthEnd = dateInfo.end;
        this.loadEvents();
    }

    handleEventDrop(arg: any) {
        if (this.role === 'patient') {
            if (arg.event.extendedProps.doctorId) {
                this.dialog.open(AlertComponent, {data: {message: "Cannot change the appointment time since it has been already accepted by a doctor... Consider cancelling appointment and creating a new one."}});
                arg.revert();
            } else if (arg.event.extendedProps.title)  {
                this.dialog.open(AlertComponent, {data: {message: "The appointment already past"}});
                arg.revert();
            }
        }
        let newStart;
        let newEnd;

        const startDateTime = DateTime.fromISO(arg.event.start).toLocal()
        const endDateTime = DateTime.fromISO(arg.event.end).toLocal()

        newStart = startDateTime.toISO()
        newEnd = endDateTime.toISO();

        const event: any = {
            id: arg.event.extendedProps.dbId,
            start: newStart,
            end: newEnd,
            allDay: false
        }
        this.appointment.emit(event);
    }

    onCheckboxChange(value: string) {
        if (value) {
            this.loadEvents(value);
        }
    }

    async loadAllAppointments() {
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
                    
                    const start = DateTime.fromISO(appointment.start).toLocal();
                    const startStr = start.toISO({includeOffset: true});

                    if (!appointment.doctorId && startStr! < now) {
                        title = "Missed request"
                    } else if (!appointment.doctorId && startStr! > now) {
                        title = "Pending"
                    }

                    if (appointment.doctorId && startStr! < now) {
                        title = "Past"
                    } else if (appointment.doctorId && startStr! > now) {
                        title = "Upcoming"
                    }

                    return {
                        title,
                        start: appointment.start,
                        end: appointment.end,
                        extendedProps: {
                            dbId: appointment.id,
                            doctorId: appointment.doctorId,
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
                this.events = this.appointments.map((appointment: Appointment) => ({
                    title: "Missed request",
                    start: appointment.start,
                    end: appointment.end,
                    extendedProps: {
                        dbId: appointment.id,
                        doctorId: appointment.doctorId
                    }
                }));
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
                this.events = this.appointments.map((appointment: Appointment) => ({
                    title: "Pending",
                    start: appointment.start,
                    end: appointment.end,
                    extendedProps: {
                        dbId: appointment.id,
                        doctorId: appointment.doctorId
                    }
                }));
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
                this.events = this.appointments.map((appointment: Appointment) => ({
                    title: "Upcoming",
                    start: appointment.start,
                    end: appointment.end,
                    extendedProps: {
                        dbId: appointment.id,
                        doctorId: appointment.doctorId
                    }
                  }));
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
                this.events = this.appointments.map((appointment: Appointment) => ({
                    title: "Past",
                    start: appointment.start,
                    end: appointment.end,
                    extendedProps: {
                        dbId: appointment.id,
                        title: 'Past'
                    }
                  }));
            } 
        } catch (error) {
            this.dialog.open(AlertComponent,{data: {message: 'Unexpected error loading pending appointments: '+error}}) 
        }
    }

    handleAddEvent(arg: any){
        if (arg.view.type === 'timeGridWeek' || arg.view.type === 'timeGridDay') {
            const calendarApi = arg.view.calendar;
            let start: any;
            let end: any;

            const startDateTime = DateTime.fromJSDate(arg.start).toLocal();
            const endDateTime = DateTime.fromJSDate(arg.end).toLocal();

            start = startDateTime.toISO();
            end = endDateTime.toISO();

            const event: any = {
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
                dialogRef.componentInstance.ok.subscribe(subscription => {

                    if (subscription) {
                        calendarApi.addEvent(event);
                        this.appointment.emit({
                            start: event.start,
                            end: event.end,
                            allDay: event.allDay
                        });
                    }
                    calendarApi.changeView('dayGridMonth', arg.start);
                });
            } else {
                const eventInfo = {
                    start: DateTime.fromISO(arg.startStr).toFormat('hh:mm a'),
                    end: DateTime.fromISO(arg.endStr).toFormat('hh:mm a'),
                    date: DateTime.fromJSDate(new Date(arg.start)).toFormat('MMM dd, yyyy')
                }
                this.appointment.emit({
                    start,
                    end,
                    allDay: arg.allDay,
                    patientId: this.patientId || undefined
                });
                
                const dialogRef = this.dialog.open(EventComponent, {data: { eventInfo }});

                dialogRef.componentInstance.submit.subscribe(subscription => {

                    if (subscription) {
                        this.dialog.closeAll();
                        calendarApi.addEvent(event);
                        calendarApi.changeView('dayGridMonth');
                    }
                });

                dialogRef.componentInstance.delete.subscribe(async id => {

                    if (id) {
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
                            }
                        } catch (error) {
                            this.dialog.open(AlertComponent, { data: { message: "Error deleting appointment: "+ error}})
                        }
                    }
                });
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
                    else calendarApi.unselect();
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

        if ((!isDouble && isBusinessHours && isFuture) || isFuture && arg.allDay) {
            this.handleAddEvent(arg);
        } 
        const calendarApi = arg.view.calendar;

        if (!isBusinessHours && !arg.allDay) this.dialog.open(AlertComponent, {data: {message: "Outside working hours"}});
        calendarApi.unselect(); 
    }

    isDouble(arg: any): boolean {
        return this.appointments.some((event) => 
            DateTime.fromISO(event.start).toFormat('hh:mm') === DateTime.fromISO(arg.startStr).toFormat('hh:mm')
        );
    }

    isFuture(arg: any): boolean {
        const now = DateTime.now().toISO({includeOffset: true});
        return arg.startStr > now;
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
        const samePatient = !this.patientId ? true : event.extendedProps.patientId === this.patientId;

        const dialogRef = this.dialog.open(EventComponent, {data: {eventInfo, samePatient}});

        dialogRef.componentInstance.delete.subscribe(id => {

            if (id) {
                const ref = this.dialog.open(ConfirmComponent, {data: {message: 'This appointment will be deleted from the system'}});
                ref.componentInstance.ok.subscribe(async (value)=> {
                    if (value) {
                        
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
                    }
                }) 
            }
        })
    }

    handleEvents(events: EventApi[]) {
        this.currentEvents = events;
    }

}