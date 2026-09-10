export interface PrayerTime {
  name: string;
  time: string;
  id: string;
}

export interface DetailedPrayerTime {
  id: string;
  name: string;
  time: string;
  sub?: string;
}

export interface City {
  id: string;
  name: string;
  district: string;
  city: string;
  country: string;
  isCurrent: boolean;
}

export interface ImportantDay {
  id: string;
  name: string;
  dateGregorian: string;
  dateHijri: string;
}

export enum AppTab {
  VAKITLER = 'vakitler',
  SEHIRLER = 'sehirler',
  KIBLE = 'kible',
  GUNLER = 'gunler'
}

export interface ReminderConfig {
  enabled: boolean;
  offset: number; // minutes before prayer
}
