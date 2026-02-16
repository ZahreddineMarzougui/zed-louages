
import { Settings } from './types';

export const DEFAULT_SETTINGS: Settings = {
  fuelPrice: 2.500,
  driverPercentage: 20,
  oilChangeInterval: 8000,
  language: 'ar',
  theme: 'light',
  ownerPassword: 'admin',
};

export const TRANSLATIONS = {
  ar: {
    dashboard: 'الرئيسية',
    vehicles: 'الأسطول',
    drivers: 'السائقين',
    trips: 'المحاسبة',
    passengers: 'الحجوزات',
    maintenance: 'الصيانة',
    settings: 'الإعدادات',
    logTrip: 'تسجيل رحلة',
    oilAlert: 'تغيير الزيت!'
  }
};
