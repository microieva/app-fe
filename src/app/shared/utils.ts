import { DateTime } from "luxon";

export const getNextAppointmentTodayTomorrowStartStr = (nextStart: any): string => {
    const startDate = DateTime.fromISO(nextStart, { setZone: true });
    const today = DateTime.now().setZone(startDate.zone);
    const tomorrow = today.plus({ days: 1 });

    if (startDate.hasSame(today, 'day')) {
        return `Today, `+startDate.toFormat('HH:mm a');
    } else if (startDate.hasSame(tomorrow, 'day')) {
        return `Tomorrow, `+startDate.toFormat('HH:mm a');
    } else {
        return startDate.toFormat('HH:mm a, MMM dd');
    }

}

export const getTodayWeekdayTime = (): { weekday: string, time: string, date: string} => {
    const now = DateTime.now().setZone('Europe/Helsinki');
    return {
        weekday: now.toFormat('cccc'),
        time: now.toFormat('HH:mm a'),
        date: now.toFormat('MMM dd')
    }
}

export const getNextAppointmentWeekdayStart = (nextStart: any): { dayName: string, time: string, date: string} => {
    const startDate = DateTime.fromISO(nextStart, { setZone: true });
    const today = DateTime.now().setZone(startDate.zone);
    const tomorrow = today.plus({ days: 1 });

    if (startDate.hasSame(today, 'day')) {
        return {
            dayName: 'Today',
            time: startDate.toFormat('HH:mm a'),
            date: startDate.toFormat('MMM dd')
        }
    } else if (startDate.hasSame(tomorrow, 'day')) {
        return {
            dayName: 'Tomorrow',
            time: startDate.toFormat('HH:mm a'),
            date: startDate.toFormat('MMM dd')
        }
    } else {
        return {
            dayName: startDate.toFormat('cccc'),
            time: startDate.toFormat('HH:mm a'),
            date: startDate.toFormat('MMM dd')
        }
    }
}

export const getLastLogOutStr = (timestamp: string): string => {
    const date = DateTime.fromISO(timestamp, { setZone: true }).setZone('Europe/Helsinki');
    const now = DateTime.now().setZone('Europe/Helsinki');

    if (date.hasSame(now, 'day')) {
        const diff = now.diff(date, ['hours', 'minutes']);
        const hours = Math.floor(diff.hours);
        const minutes = Math.floor(diff.minutes % 60);

        if (hours >= 4) {
            return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        } else if (hours > 0) {
            return `${hours} hour${hours > 1 ? 's' : ''} ${minutes > 0 ? `${minutes} minute${minutes > 1 ? 's' : ''}` : ''} ago`;
        } else if (minutes > 0) {
            return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        } else {
            return 'Just now';
        }
    } else if (date.hasSame(now.minus({ days: 1 }), 'day')) {
        return `${date.toFormat('HH:mm a')} (Yesterday)`;
    } else {
        return date.toFormat('HH:mm a (cccc), MMM dd, yyyy');
    }
};



