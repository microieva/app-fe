import { AfterViewInit, Component, EventEmitter, Input, OnInit, Output } from "@angular/core";
import { CalendarOptions, EventInput,DateSelectArg, EventClickArg, EventApi, DayCellContentArg, DayCellMountArg, EventDropArg } from '@fullcalendar/core';
import { ActivatedRoute, Router } from "@angular/router";
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import { DateTime, Interval } from "luxon";
import { AppGraphQLService } from "../../services/app-graphql.service";
import { createEventId } from "../../constants";
import { Appointment } from "../../../graphql/appointment/appointment";
import { AppointmentInput } from "../../../graphql/appointment/appointment.input";
import { MatDialog } from "@angular/material/dialog";
import { AlertComponent } from "../app-alert/app-alert.component";
import { EventComponent } from "../app-event/app-event.component";
import { ConfirmComponent } from "../app-confirm/app-confirm.component";

@Component({
    selector: 'app-calendar',
    templateUrl: './app-calendar.component.html',
    styleUrls: ['app-calendar.component.scss']
})
export class AppCalendarComponent implements OnInit, AfterViewInit {
    @Output() appointment = new EventEmitter<AppointmentInput>();
    @Input() role!: string;

    appointmentSelections = ['All', 'Pending confirmation', 'Upcoming', 'Past']
    eventsPromise!: Promise<EventInput[]>;
    calendarVisible = true;
    calendarOptions!: CalendarOptions;
    currentEvents: EventApi[] = [];
    appointments: Appointment[] = [];
    allDayAppointments: Appointment[] = [];
    selectedAppointments: string = 'All';
    events:any[] = []; 
    userRole!: string;
    patientId: number | undefined;

    constructor(
        private dialog: MatDialog,
        private graphQLService: AppGraphQLService,
        private router: Router,
        private activatedRoute: ActivatedRoute
    ){
        this.userRole = this.role;
    }

    nonAllDayEventCount: { [key: string]: number } = {};
  
    async ngOnInit() {
        this.activatedRoute.queryParams.subscribe(params => {
            this.patientId = +params['id']; 
        });
        this.initializeCalendar();
    }

    async loadEvents(type?: string){
        //this.setDisplayText();

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
            default:
                await this.loadAllAppointments();
                this.initializeCalendar();
                return;
        }
    }

    async ngAfterViewInit() {
        await this.loadEvents();
        this.setDisplayText(); 
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
            events: this.events,
            views: {
                dayGrid: {
                    contentHeight:800,
                    dayMaxEvents: 2,
                    dayMaxEventRows: 2
                },
            },
            dayCellClassNames: (arg: DayCellContentArg)=> this.customDayClassNames(arg),
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
            dayCellDidMount: (arg: DayCellMountArg)=> this.handleDayCell(arg),
            eventDrop: (arg: EventDropArg)=> this.handleEventDrop(arg),
            businessHours: {
                daysOfWeek: [ 1, 2, 3, 4, 5 ],
                startTime: '08:00', 
                endTime: '18:00'
              }
            /* events for queries:
            eventAdd:
            eventRemove:
            */
        }
    }

    handleEventDrop(arg: any) {
        if (this.userRole === 'patient') {
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

        const startDateTime = DateTime.fromJSDate(arg.event.start).toLocal()
        const endDateTime = DateTime.fromJSDate(arg.event.end).toLocal()

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
            query {
                appointments {
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
        `
        try {
            const response = await this.graphQLService.send(query);
            if (response.data.appointments) {
                this.appointments = response.data.appointments;
                let title: string;
                let isPast:boolean = false;

                this.events = this.appointments.map((appointment: Appointment) => {
                    if (!appointment.doctorId) {
                        title = "Pending"
                    }
                    if (appointment.doctorId) {
                        const now = DateTime.local().toISO() 
                        isPast = appointment.start < now;
                        if (isPast) title = "Past";
                        else title = "Upcoming"
                    }
                    return {
                        title,
                        start: appointment.start,
                        end: appointment.end,
                        allDay: appointment.allDay,
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
    async loadPendingAppointments() {
        const query = `
            query ($patientId: Int){
                calendarPendingAppointments (patientId: $patientId){
                    id
                    start
                    end
                    allDay
                    patientId
                    doctorId
                    updatedAt
                }
            }
        `
        try {
            const response = await this.graphQLService.send(query, {patientId: this.patientId});

            if (response.data.calendarPendingAppointments) {
                this.appointments = response.data.calendarPendingAppointments;
                this.events = this.appointments.map((appointment: Appointment) => ({
                    title: "Pending",
                    start: appointment.start,
                    end: appointment.end,
                    allDay: appointment.allDay,
                    extendedProps: {
                        dbId: appointment.id,
                        doctorId: appointment.doctorId
                    }
                  }));
                } 
        } catch (error) {
            this.dialog.open(AlertComponent, {data: {message: 'Unexpected error loading pending appointments: '+error}}) 
        }
    }
    async loadUpcomingAppointments() {
        const query = `
            query ($patientId: Int){
                calendarUpcomingAppointments (patientId: $patientId) {
                    id
                    start
                    end
                    allDay
                    patientId
                    doctorId
                    updatedAt
                }
            }
        `
        try {
            const response = await this.graphQLService.send(query, {patientId: this.patientId});

            if (response.data.calendarUpcomingAppointments) {
                this.appointments = response.data.calendarUpcomingAppointments;
                this.events = this.appointments.map((appointment: Appointment) => ({
                    title: "Upcoming",
                    start: appointment.start,
                    end: appointment.end,
                    allDay: appointment.allDay,
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
        const query = `
            query ($patientId: Int){
                calendarPastAppointments (patientId: $patientId){
                    id
                    start
                    end
                    allDay
                    patientId
                    doctorId
                    updatedAt
                }
            }
        `
        try {
            const response = await this.graphQLService.send(query, {patientId: this.patientId});

            if (response.data.calendarPastAppointments) {
                this.appointments = response.data.calendarPastAppointments;
                this.events = this.appointments.map((appointment: Appointment) => ({
                    title: "Past",
                    start: appointment.start,
                    end: appointment.end,
                    allDay: appointment.allDay,
                    extendedProps: {
                        dbId: appointment.id,
                        title: 'Past'
                    }
                  }));
            } 
        } catch (error) {
            this.dialog.open(AlertComponent,{data: {message: 'Unexpected error loading pending appointments: '+error}}) 
            // maybe a snackbar ?
        }
    }


    handleDayCell(arg:any){
        //TO DO:::  if more than 6 events, target.className = "disabled-day"
        //need to implement querying appointments. the events array might be = appointments
        const d = DateTime.fromJSDate(new Date(arg.date)).toISO();

        const api = arg.view.calendar;
        const events = api.getEvents()
        //console.log('events: ', events)
        //console.log('arg: ', arg)
        const dateFormatted = d && DateTime.fromISO(d).toFormat('yyyy-MM-dd');
        //console.log('dateFormatted: ', dateFormatted)
        // const count =  events.filter((event: any) => {
        //     console.log('EVENT NEED START TIME: ', event)
        //     if (dateFormatted === event.startStr) {
        //         return event;
        //     }
        //     return;
        // }).length;
        // console.log('DAY CELL event count: ', count)
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

            if (this.userRole === 'doctor') {
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
                    start: DateTime.fromISO(arg.startStr).toFormat('hh:mm'),
                    end: DateTime.fromISO(arg.endStr).toFormat('hh:mm'),
                    date: DateTime.fromJSDate(new Date(arg.start)).toFormat('MMM dd, yyyy')
                }
                this.appointment.emit({
                    start,
                    end,
                    allDay: arg.allDay,
                    patientId: this.patientId
                });
                const dialogRef = this.dialog.open(EventComponent, {data: { eventInfo }});

                dialogRef.componentInstance.submit.subscribe(subscription => {

                    if (subscription) {
                        this.dialog.closeAll();
                        calendarApi.addEvent(event);
                        window.location.reload();

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
                                calendarApi.changeView('dayGridMonth');
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
        if (this.isDisabledDay(arg.date) || eventCount >5) {
            return ['disabled-day'];
        } 
        return [];
    }

    isDisabledDay(date: any): boolean {
        return this.currentEvents.some(event => {
            const d = DateTime.fromJSDate(new Date(date));
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
                if (this.userRole !== 'doctor') {
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
                if (this.userRole !== 'doctor') {
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
            if (date === start && appointment.updatedAt) {
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
        if (arg.allDay) {
            // TO DO: CHECK IF FREE AND NOT IN THE PAST
            this.handleAddEvent(arg);
            //this.handleAddAllDayEvent();
        }

        if (this.isBusinessHours(arg) && 
            arg.start.getDay() !== 0 
            //&& arg.start.getDay() !== 6 /// TEMPORARY TO DO: uncomment 
        ) {
            this.handleAddEvent(arg);
        } 

        const calendarApi = arg.view.calendar;
        if (!arg.allDay) this.dialog.open(AlertComponent, {data: {message: "Outside working hours"}})
        calendarApi.unselect(); 
        
    }
    
    handleDayView(arg: any) {
        const isDouble = this.isDouble(arg) 
        const isBusinessHours = this.isBusinessHours(arg);

        if ((!isDouble && isBusinessHours) || arg.allDay) {
            this.handleAddEvent(arg);
        } 
        const calendarApi = arg.view.calendar;

        if (!isBusinessHours && !arg.allDay) this.dialog.open(AlertComponent, {data: {message: "Outside working hours"}});
        calendarApi.unselect(); 
    }
    isDouble(date: any): boolean {
        return false;
        // TO DO: 
        // return this.appointments.some((event) => 
        //     DateTime.fromISO(event.start).toFormat('hh:mm') === DateTime.fromISO(date.startStr).toFormat('hh:mm')
        // );
    }

    isBusinessHours(date: any): boolean {
        if (!date.allday) {
            const hour = date.start.getHours();
            const interval = Interval.fromDateTimes(
                DateTime.fromObject({ hour: 8}),
                DateTime.fromObject({ hour: 18})
            );
            const isBusinessHours = interval.contains(DateTime.fromObject({ hour: Number(hour) }));
            return isBusinessHours;
        }
        return true;
    }

    handleEventClick(clickInfo: EventClickArg) {
        const eventInfo = {
            title: clickInfo.event.title,
            id: clickInfo.event.extendedProps['dbId']
        }
        const event = this.events.find(event=> event.extendedProps.dbId === eventInfo.id)
        const samePatient = event.extendedProps.patientId === this.patientId;

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