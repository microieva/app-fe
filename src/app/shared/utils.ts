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
    const startDate = DateTime.fromISO(nextStart, {setZone: true})
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

export const getNow = () => {
    const now  = DateTime.now().setZone('Europe/Helsinki').toJSDate();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset); 
}

export const getHowSoonUpcoming = (timestamp: string): string => {
    const now = DateTime.now().setZone('Europe/Helsinki').toJSDate();
    const inputDate = DateTime.fromISO(timestamp, { setZone: true }).setZone('Europe/Helsinki');
    const diff = inputDate.diff(DateTime.fromJSDate(now), ['years', 'months', 'days', 'hours', 'minutes', 'seconds']);

    let howSoonStr = 'in ';
    if (diff.years > 0) {
        howSoonStr += `${diff.years} year${diff.years === 1 ? '' : 's'} `;
    }
    if (diff.months > 0) {
        howSoonStr += `${diff.months} month${diff.months === 1 ? '' : 's'} `;
    }
    if (diff.days > 0) {
        howSoonStr += `${diff.days} day${diff.days === 1 ? '' : 's'} `;
    }
    if (diff.days < 1 && diff.hours > 0) {
        howSoonStr += `${diff.hours} hour${diff.hours === 1 ? '' : 's'} `;
    }
    if (diff.days < 1 && diff.hours < 5 && diff.minutes > 0) {
        howSoonStr += `${diff.minutes} minute${diff.minutes === 1 ? '' : 's'} `;
    }

    howSoonStr = howSoonStr.trim();

    return howSoonStr === 'in' ? 'now' : howSoonStr;
};


export const getHowLongAgo = (timestamp: string):string => {
    const now = DateTime.now().setZone('Europe/Helsinki').toJSDate();
    const inputDate = DateTime.fromISO(timestamp, { setZone: true }).setZone('Europe/Helsinki');
    const diff = DateTime.fromJSDate(now).diff(inputDate, ['years', 'months', 'days', 'hours', 'minutes', 'seconds']);

    let howLongAgoStr = '';

    if (diff.years > 0) {
        howLongAgoStr += `${diff.years} year${diff.years === 1 ? '' : 's'} `;
    }
    if (diff.months > 0) {
        howLongAgoStr += `${diff.months} month${diff.months === 1 ? '' : 's'} `;
    }
    if (diff.months < 1 && diff.days > 0) {
        howLongAgoStr += `${diff.days} day${diff.days === 1 ? '' : 's'} `;
    }
    if (diff.months <1 && diff.days < 2 && diff.hours > 0) {
        howLongAgoStr += `${diff.hours} hour${diff.hours === 1 ? '' : 's'} `;
    }
    if (diff.months < 1 && diff.days < 1 && diff.hours <5 && diff.minutes > 0) {
        if (diff.months ===0 && diff.days ===0 && diff.hours === 0 && diff.minutes <= 2) {
            howLongAgoStr = 'Just now';
        } else {
            howLongAgoStr += `${diff.minutes} minute${diff.minutes === 1 ? '' : 's'} `;
        }
    }
    if (diff.days <1 && diff.hours <1 && diff.minutes === 0 ) {
        howLongAgoStr = 'Just now';
    }

    howLongAgoStr = howLongAgoStr.trim();

    if (howLongAgoStr && howLongAgoStr !== 'Just now') {
        howLongAgoStr += ' ago';
    } 
    return howLongAgoStr;
}

export const getPatientAge = (dobISO: string): string  =>{
  if (!dobISO) return 'N/A';
  
  try {
    return Math.floor(
      DateTime.now().diff(DateTime.fromISO(dobISO), 'years').years
    ).toString();
  } catch (e) {
    console.error('Invalid date format', e);
    return 'N/A';
  }
}




