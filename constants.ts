
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
    dashboard: 'لوحة القيادة',
    vehicles: 'السيارات',
    drivers: 'السائقين',
    trips: 'الرحلات',
    passengers: 'المسافرين',
    maintenance: 'الصيانة',
    settings: 'الإعدادات',
    addVehicle: 'إضافة سيارة',
    logTrip: 'تسجيل رحلة',
    revenue: 'المداخيل',
    expenses: 'المصاريف',
    profit: 'الربح الصافي',
    driverShare: 'مناب السائق',
    fuel: 'الوقود',
    km: 'كم',
    plateNumber: 'رقم اللوحة',
    model: 'الموديل',
    consumption: 'الاستهلاك (ل/100كم)',
    save: 'حفظ',
    cancel: 'إلغاء',
    totalTrips: 'إجمالي الرحلات',
    totalRevenue: 'إجمالي المداخيل',
    totalProfit: 'إجمالي الأرباح',
    oilAlert: 'تنبيه تغيير الزيت',
    nextChange: 'التغيير القادم بعد',
    history: 'السجل',
    exportPDF: 'تصدير PDF',
    exportExcel: 'تصدير Excel',
    date: 'التاريخ',
    from: 'من',
    to: 'إلى',
    name: 'الاسم',
    phone: 'الهاتف',
    notes: 'ملاحظات'
  }
};
