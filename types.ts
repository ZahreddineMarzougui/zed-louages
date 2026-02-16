
export type UserRole = 'owner' | 'driver' | null;

export interface Vehicle {
  id: string;
  plateNumber: string;
  model: string;
  currentKM: number;
  lastOilChangeKM: number;
}

export interface DriverAccount {
  id: string;
  name: string;
  password: string;
  vehicleId: string;
}

export interface Trip {
  id: string;
  vehicleId: string;
  date: string;
  revenue: number;
  kmTraveled: number;
  expenses: number;
  expenseNote?: string;
  fuelCost: number;
  driverShare: number;
  netProfit: number;
  visibleToDriver: boolean; // Control if driver can see this record
}

export interface Passenger {
  id: string;
  name: string;
  phone: string;
  direction: 'TunisToJelma' | 'JelmaToTunis';
  date: string;
  vehicleId: string;
  seatsCount: number;
}

export interface Settings {
  fuelPrice: number;
  driverPercentage: number;
  oilChangeInterval: number;
  language: 'ar' | 'fr';
  theme: 'light' | 'dark';
  ownerPassword: string;
}

export interface AppData {
  vehicles: Vehicle[];
  drivers: DriverAccount[];
  trips: Trip[];
  passengers: Passenger[];
  settings: Settings;
}
