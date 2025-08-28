export const toISODate = (d: Date) => d.toISOString().substring(0,10);
export const todayISO = () => toISODate(new Date());
export const addDays = (d: Date, days: number) => new Date(d.getTime() + days*86400000);
