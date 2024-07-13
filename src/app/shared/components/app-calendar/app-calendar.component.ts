import { AfterViewInit, Component, EventEmitter, OnInit, Output } from "@angular/core";
import { CalendarOptions, EventInput,DateSelectArg, EventChangeArg, EventClickArg, EventApi, DayCellContentArg, EventSourceInput } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import { createEventId } from "../../constants";
import { AppDialogService } from "../../services/app-dialog.service";
import { DateTime, Interval } from "luxon";
import { Appointment } from "../../../graphql/appointment/appointment";
import { AppointmentInput } from "../../../graphql/appointment/appointment.input";
import { AppGraphQLService } from "../../services/app-graphql.service";

@Component({
    selector: 'app-calendar',
    templateUrl: './app-calendar.component.html',
    styleUrls: ['app-calendar.component.scss']
})
export class AppCalendarComponent implements OnInit, AfterViewInit {
    @Output() appointment = new EventEmitter<AppointmentInput>();

    eventsPromise!: Promise<EventInput[]>;
    calendarPlugins = [dayGridPlugin, interactionPlugin];
    calendarVisible = true;
    calendarOptions!: CalendarOptions;
    currentEvents: EventApi[] = [];
    appointments: Appointment[] = [];
    events = [
        // { title: 'event 1', date: '2024-07-01', allDay: true },
        // { title: 'event 3', date: '2024-07-01', allDay: true},
        // { title: 'event 3', date: '2024-07-01', allDay: true},
        // { title: 'event 3', date: '2024-07-01',allDay: true },
        // { title: 'event 3', date: '2024-07-01' ,allDay: true},
        // { title: 'event 3', date: '2024-07-02',allDay: true },
        // { title: 'event 2', date: '2024-07-02',allDay: true }
    ] 
    constructor(
        private dialog: AppDialogService,
        private graphQLService: AppGraphQLService
    ){}

    nonAllDayEventCount: { [key: string]: number } = {};
  
    async ngOnInit() {

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
                    // timeGrid: {
                    //     eventLimit: 6 
                    // },
                    dayGrid: {
                        contentHeight:600,
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
                eventClick: (arg) =>this.handleEventClick(arg),
                eventsSet: (arg) => this.handleEvents(arg),
                dayCellDidMount: (arg)=> this.handleDayCell(arg),
                eventChange: (arg) => this.handleAddEvent(arg),
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

    // async handleAppointmentUpdate() {

    // }

    async loadAppointments() {
        const query = `
            query {
                appointments {
                    id
                    start
                    end
                    allDay
                    patientId
                    doctorId
                }
            }
        `
        try {
            const response = await this.graphQLService.send(query);
            if (response.data.appointments) {
                this.appointments = response.data.appointments;
                this.calendarOptions.events = this.appointments.map((appointment: Appointment) => ({
                    title: "Appointment",
                    start: appointment.start,
                    end: appointment.end,
                    allDay: appointment.allDay
                  }));
            } 
        } catch (error) {
            this.dialog.open({data: {message: error}}) // maybe a snackbar ?
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
            const dialogRef = this.dialog.open({data: {input: true}});
            dialogRef.componentInstance.event.subscribe(value => {
                const event: any = {
                    id: createEventId(),
                    start: arg.startStr,
                    end: arg.endStr,
                    allDay: arg.allDay
                }
                this.appointment.emit(event);
                calendarApi.changeView('dayGridMonth', arg.start);
                if (value) {
                    event.title = "Appointment";
                    calendarApi.addEvent(event);
                }
            })

        }


    }

    // customSlotLaneClassName(arg: any) {
    //     if (!this.isBusinessHours(arg)) {
    //         arg.el.classList.add('non-business-hour');
    //     }
    //     return;
    // }

    customDayClassNames(arg: DayCellContentArg): string[] {

        let eventCount = 0 // could be from BE

        if (this.isDisabledDay(arg.date)) {
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
    async ngAfterViewInit() {
        this.setDisplayText();
        await this.loadAppointments();
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

    // handleCalendarToggle() {
    //     this.calendarVisible = !this.calendarVisible;
    // }

    // handleWeekendsToggle() {
    //     const { calendarOptions } = this;
    //     calendarOptions.weekends = !calendarOptions.weekends;
    // }

    handleDateSelect(arg: DateSelectArg) {
        if (arg.view.type === 'dayGridMonth') {
            this.handleMonthView(arg);
        } 
        if (arg.view.type === 'timeGridWeek') {
            this.handleWeekView(arg);
        }
        if (arg.view.type === 'timeGridDay') {
            this.handleDayView(arg);
        }
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
        if (this.isBusinessHours(arg) && arg.start.getDay() !== 0 && arg.start.getDay() !== 6) {
            this.handleAddEvent(arg);
        } else {
            const calendarApi = arg.view.calendar;
            calendarApi.unselect(); 
            this.dialog.open({data: {message: "Outside working hours"}})
        }
    }
    handleDayView(arg: any) {
        if (this.isBusinessHours(arg)) {
            this.handleAddEvent(arg);
        } else {
            const calendarApi = arg.view.calendar;
            calendarApi.unselect(); 
            this.dialog.open({data: {message: "Outside working hours"}})
        }
    }

    isBusinessHours(date: any): boolean {
        const hour = date.start.getHours();
        const interval = Interval.fromDateTimes(
            DateTime.fromObject({ hour: 8}),
            DateTime.fromObject({ hour: 18})
        );
        const isBusinessHours = interval.contains(DateTime.fromObject({ hour: Number(hour) }));
        return isBusinessHours;
    }

    handleEventClick(clickInfo: EventClickArg) {
        if (confirm(`Are you sure you want to delete the event '${clickInfo.event.title}'`)) {
        clickInfo.event.remove();
        }
    }

    handleEvents(events: EventApi[]) {
        this.currentEvents = events;
    }

}