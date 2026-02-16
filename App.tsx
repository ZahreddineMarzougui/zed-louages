
import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Car, 
  History, 
  Users, 
  Wrench, 
  Settings as SettingsIcon,
  Plus,
  TrendingUp,
  Wallet,
  Fuel,
  LogOut,
  AlertTriangle,
  Lock,
  User,
  ShieldCheck,
  Eye,
  EyeOff,
  ChevronRight,
  Trash2,
  Calendar,
  ArrowLeftRight,
  Phone,
  MessageCircle,
  Armchair,
  Edit2,
  CheckCircle2,
  Filter,
  Eye as EyeIcon,
  EyeOff as EyeOffIcon,
  Cloud,
  Loader2
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area 
} from 'recharts';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy,
  getDoc
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { db } from './firebase';
import { Vehicle, Trip, Passenger, Settings, AppData, UserRole, DriverAccount } from './types';
import { DEFAULT_SETTINGS, TRANSLATIONS } from './constants';

// --- Helper Functions ---

const getDayName = (dateStr: string) => {
  const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const date = new Date(dateStr);
  return days[date.getDay()];
};

const getNext7Days = () => {
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
};

// --- Components ---

const SidebarItem = ({ icon: Icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-3 px-4 py-3 w-full rounded-xl transition-all duration-300 ${
      active 
        ? 'bg-red-600 text-white shadow-lg shadow-red-200 translate-x-1' 
        : 'text-slate-600 hover:bg-slate-100'
    }`}
  >
    <Icon size={20} />
    <span className="font-semibold text-sm">{label}</span>
  </button>
);

const StatCard = ({ title, value, icon: Icon, colorClass }: { title: string, value: string, icon: any, colorClass: string }) => (
  <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow duration-300 group">
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 rounded-2xl transition-transform group-hover:scale-110 ${colorClass}`}>
        <Icon size={24} />
      </div>
    </div>
    <h3 className="text-slate-500 text-sm font-medium">{title}</h3>
    <p className="text-2xl font-bold mt-1 text-slate-800 tracking-tight">{value}</p>
  </div>
);

// --- Main App ---

export default function App() {
  const [userRole, setUserRole] = useState<UserRole>(() => {
    const saved = sessionStorage.getItem('zedm_session_role');
    return (saved as UserRole) || null;
  });

  const [currentDriverId, setCurrentDriverId] = useState<string | null>(() => {
    return sessionStorage.getItem('zedm_session_driver_id');
  });
  
  const [activeTab, setActiveTab] = useState(() => userRole === 'driver' ? 'passengers' : 'dashboard');
  const [passengerFilterDate, setPassengerFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [editingPassenger, setEditingPassenger] = useState<Passenger | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Financial Filter States
  const [tripStartDate, setTripStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [tripEndDate, setTripEndDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Login States
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>(null);

  const [data, setData] = useState<AppData>({
    vehicles: [],
    drivers: [],
    trips: [],
    passengers: [],
    settings: DEFAULT_SETTINGS
  });

  // --- Firebase Real-time Sync ---

  useEffect(() => {
    const unsubVehicles = onSnapshot(collection(db, "vehicles"), (snapshot) => {
      const vehicles = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Vehicle));
      setData(prev => ({ ...prev, vehicles }));
    });

    const unsubDrivers = onSnapshot(collection(db, "drivers"), (snapshot) => {
      const drivers = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as DriverAccount));
      setData(prev => ({ ...prev, drivers }));
    });

    const unsubTrips = onSnapshot(query(collection(db, "trips"), orderBy("date", "desc")), (snapshot) => {
      const trips = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Trip));
      setData(prev => ({ ...prev, trips }));
    });

    const unsubPassengers = onSnapshot(collection(db, "passengers"), (snapshot) => {
      const passengers = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Passenger));
      setData(prev => ({ ...prev, passengers }));
    });

    const unsubSettings = onSnapshot(doc(db, "settings", "global"), (snapshot) => {
      if (snapshot.exists()) {
        setData(prev => ({ ...prev, settings: snapshot.data() as Settings }));
      } else {
        // Init settings if don't exist
        setDoc(doc(db, "settings", "global"), DEFAULT_SETTINGS);
      }
      setIsLoading(false);
    });

    return () => {
      unsubVehicles();
      unsubDrivers();
      unsubTrips();
      unsubPassengers();
      unsubSettings();
    };
  }, []);

  const loggedInDriver = useMemo(() => 
    data.drivers.find(d => d.id === currentDriverId),
  [data.drivers, currentDriverId]);

  const assignedVehicle = useMemo(() => 
    loggedInDriver ? data.vehicles.find(v => v.id === loggedInDriver.vehicleId) : null,
  [data.vehicles, loggedInDriver]);

  const t = TRANSLATIONS.ar;
  const isDarkMode = data.settings.theme === 'dark';
  const availableDates = useMemo(() => getNext7Days(), []);

  // Filtered trips by role and visibility
  const filteredTrips = useMemo(() => {
    const withinRange = data.trips.filter(t => t.date >= tripStartDate && t.date <= tripEndDate);
    if (userRole === 'owner') return withinRange;
    if (userRole === 'driver' && assignedVehicle) {
      return withinRange.filter(t => t.vehicleId === assignedVehicle.id && t.visibleToDriver);
    }
    return [];
  }, [data.trips, userRole, assignedVehicle, tripStartDate, tripEndDate]);

  const stats = useMemo(() => {
    const dashboardTrips = data.trips.slice(0, 30);
    const totalRevenue = dashboardTrips.reduce((acc, curr) => acc + curr.revenue, 0);
    const totalProfit = dashboardTrips.reduce((acc, curr) => acc + curr.netProfit, 0);
    const totalFuel = dashboardTrips.reduce((acc, curr) => acc + curr.fuelCost, 0);
    const totalExpenses = dashboardTrips.reduce((acc, curr) => acc + curr.expenses, 0);
    
    const chartData = [...dashboardTrips].reverse().slice(-7).map(trip => ({
      date: new Date(trip.date).toLocaleDateString('ar-TN', { day: 'numeric', month: 'short' }),
      revenue: trip.revenue,
      profit: trip.netProfit
    }));

    return { totalRevenue, totalProfit, totalFuel, totalExpenses, chartData };
  }, [data.trips]);

  const dailyPassengers = useMemo(() => {
    return data.passengers.filter(p => {
      const isDateMatch = p.date === passengerFilterDate;
      const isVehicleMatch = userRole === 'owner' ? true : p.vehicleId === assignedVehicle?.id;
      return isDateMatch && isVehicleMatch;
    });
  }, [data.passengers, passengerFilterDate, userRole, assignedVehicle]);

  // --- Firestore Actions ---

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) return;

    if (selectedRole === 'owner') {
      if (loginPassword === data.settings.ownerPassword) {
        setUserRole('owner');
        sessionStorage.setItem('zedm_session_role', 'owner');
        setActiveTab('dashboard');
        setLoginError('');
      } else {
        setLoginError('كلمة مرور صاحب السيارة غير صحيحة');
      }
    } else if (selectedRole === 'driver') {
      const driver = data.drivers.find(d => d.name === loginUsername && d.password === loginPassword);
      if (driver) {
        setUserRole('driver');
        setCurrentDriverId(driver.id);
        sessionStorage.setItem('zedm_session_role', 'driver');
        sessionStorage.setItem('zedm_session_driver_id', driver.id);
        setActiveTab('passengers');
        setLoginError('');
      } else {
        setLoginError('اسم السائق أو كلمة المرور غير صحيحة');
      }
    }
  };

  const handleLogout = () => {
    setUserRole(null);
    setCurrentDriverId(null);
    sessionStorage.clear();
    setSelectedRole(null);
    setLoginPassword('');
    setLoginUsername('');
  };

  const updateSettings = async (updates: Partial<Settings>) => {
    const newSettings = { ...data.settings, ...updates };
    await setDoc(doc(db, "settings", "global"), newSettings);
  };

  const addVehicle = async (v: Omit<Vehicle, 'id'>) => {
    await addDoc(collection(db, "vehicles"), v);
  };

  const addDriver = async (d: Omit<DriverAccount, 'id'>) => {
    await addDoc(collection(db, "drivers"), d);
  };

  const removeDriver = async (id: string) => {
    await deleteDoc(doc(db, "drivers", id));
  };

  const addTrip = async (tripData: Omit<Trip, 'id' | 'driverShare' | 'netProfit' | 'visibleToDriver'>) => {
    const vehicle = data.vehicles.find(v => v.id === tripData.vehicleId);
    if (!vehicle) return;
    const driverShare = tripData.revenue * (data.settings.driverPercentage / 100);
    const netProfit = tripData.revenue - driverShare - tripData.fuelCost - tripData.expenses;
    const newTrip = { ...tripData, driverShare, netProfit, visibleToDriver: true };
    
    await addDoc(collection(db, "trips"), newTrip);
    
    const vehicleRef = doc(db, "vehicles", tripData.vehicleId);
    await updateDoc(vehicleRef, {
      currentKM: vehicle.currentKM + tripData.kmTraveled
    });
  };

  const toggleTripVisibility = async (id: string) => {
    const trip = data.trips.find(t => t.id === id);
    if (trip) {
      await updateDoc(doc(db, "trips", id), { visibleToDriver: !trip.visibleToDriver });
    }
  };

  const addPassenger = async (p: Omit<Passenger, 'id'>) => {
    await addDoc(collection(db, "passengers"), p);
  };

  const updatePassenger = async (p: Passenger) => {
    const { id, ...rest } = p;
    await updateDoc(doc(db, "passengers", id), rest);
    setEditingPassenger(null);
  };

  const removePassenger = async (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا الحجز؟')) {
      await deleteDoc(doc(db, "passengers", id));
    }
  };

  const handleEditPassenger = (p: Passenger) => {
    setEditingPassenger(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-4 font-['Cairo']">
        <Loader2 className="animate-spin text-red-600 mb-4" size={48} />
        <p className="text-slate-600 font-black">جاري مزامنة البيانات مع السحابة...</p>
      </div>
    );
  }

  if (!userRole) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4 font-['Cairo']">
        <div className="max-w-md w-full animate-in fade-in zoom-in duration-500">
          <div className="text-center mb-8">
            <div className="inline-flex bg-red-600 p-5 rounded-[2rem] text-white mb-4 shadow-xl shadow-red-200">
              <Car size={48} />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight text-center uppercase">zed-louage</h1>
            <p className="text-slate-500 mt-2 font-semibold text-sm">الإدارة الذكية للأسطول والحجوزات</p>
          </div>

          <div className="bg-white/90 backdrop-blur-xl rounded-[2.5rem] shadow-2xl p-8 border border-white">
            {!selectedRole ? (
              <div className="space-y-4">
                <h2 className="text-xl font-black text-slate-800 text-center mb-6">تسجيل الدخول</h2>
                <button 
                  onClick={() => setSelectedRole('owner')}
                  className="w-full flex items-center justify-between p-6 bg-red-50 border-2 border-transparent hover:border-red-500 rounded-3xl transition-all duration-300 group"
                >
                  <div className="flex items-center gap-4 text-right">
                    <div className="bg-red-600 p-3 rounded-2xl text-white shadow-lg">
                      <ShieldCheck size={24} />
                    </div>
                    <div>
                      <span className="block font-black text-lg text-slate-800">صاحب السيارة</span>
                      <span className="text-xs text-red-600 font-bold">تحكم كامل بالإعدادات</span>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-red-300 group-hover:translate-x-[-4px] transition-transform" />
                </button>

                <button 
                  onClick={() => setSelectedRole('driver')}
                  className="w-full flex items-center justify-between p-6 bg-slate-50 border-2 border-transparent hover:border-slate-400 rounded-3xl transition-all duration-300 group"
                >
                  <div className="flex items-center gap-4 text-right">
                    <div className="bg-slate-700 p-3 rounded-2xl text-white shadow-lg">
                      <User size={24} />
                    </div>
                    <div>
                      <span className="block font-black text-lg text-slate-800">سائق</span>
                      <span className="text-xs text-slate-500 font-bold">تسجيل الرحلات والحجوزات</span>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-slate-300 group-hover:translate-x-[-4px] transition-transform" />
                </button>
              </div>
            ) : (
              <form onSubmit={handleLogin} className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <button type="button" onClick={() => { setSelectedRole(null); setLoginError(''); }} className="p-2 hover:bg-slate-100 rounded-full transition text-slate-400">
                    <ChevronRight className="rotate-180" size={20} />
                  </button>
                  <h2 className="text-xl font-black text-slate-800">
                    دخول {selectedRole === 'owner' ? 'المالك' : 'السائق'}
                  </h2>
                </div>

                <div className="space-y-4">
                  {selectedRole === 'driver' && (
                    <div className="relative">
                      <User className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                      <input 
                        type="text"
                        value={loginUsername}
                        onChange={(e) => setLoginUsername(e.target.value)}
                        placeholder="اسم السائق"
                        className="w-full p-4 pr-12 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-red-500 font-bold transition-all"
                        autoFocus
                      />
                    </div>
                  )}
                  
                  <div className="relative">
                    <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input 
                      type={showPassword ? "text" : "password"}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="كلمة المرور"
                      className="w-full p-4 pr-12 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-red-500 font-bold tracking-widest transition-all"
                      autoFocus={selectedRole === 'owner'}
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-600 transition"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>

                  {loginError && (
                    <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-xl text-sm font-bold animate-pulse">
                      <AlertTriangle size={16} />
                      <span>{loginError}</span>
                    </div>
                  )}
                </div>

                <button 
                  type="submit"
                  className="w-full bg-red-600 text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-red-200 hover:bg-red-700 active:scale-95 transition-all duration-300"
                >
                  تأكيد الدخول
                </button>
              </form>
            )}
          </div>
          <p className="text-center text-[10px] text-slate-400 mt-10 font-black uppercase tracking-widest">zed-louage — Cloud Version</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col md:flex-row bg-[#f8fafc] font-['Cairo'] transition-colors ${isDarkMode ? 'dark' : ''}`}>
      {/* Sidebar */}
      <aside className="w-full md:w-72 bg-white border-l border-slate-100 p-6 flex flex-col gap-8 shadow-sm z-10">
        <div className="flex items-center gap-4 px-2">
          <div className="bg-red-600 p-2.5 rounded-2xl text-white shadow-lg shadow-red-100">
            <Car size={24} />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900 leading-tight uppercase">zed-louage</h1>
            <span className="text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-black uppercase">Pro Edition</span>
          </div>
        </div>

        <nav className="flex flex-col gap-1.5 flex-1">
          {userRole === 'owner' ? (
            <>
              <SidebarItem icon={LayoutDashboard} label={t.dashboard} active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
              <SidebarItem icon={Users} label={t.passengers} active={activeTab === 'passengers'} onClick={() => setActiveTab('passengers')} />
              <SidebarItem icon={History} label="سجل المحاسبة" active={activeTab === 'trips'} onClick={() => setActiveTab('trips')} />
              <SidebarItem icon={Car} label={t.vehicles} active={activeTab === 'vehicles'} onClick={() => setActiveTab('vehicles')} />
              <SidebarItem icon={Users} label={t.drivers} active={activeTab === 'drivers'} onClick={() => setActiveTab('drivers')} />
              <SidebarItem icon={Wrench} label={t.maintenance} active={activeTab === 'maintenance'} onClick={() => setActiveTab('maintenance')} />
              <SidebarItem icon={SettingsIcon} label={t.settings} active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
            </>
          ) : (
            <>
              <SidebarItem icon={Users} label="حجوزات المسافرين" active={activeTab === 'passengers'} onClick={() => setActiveTab('passengers')} />
              <SidebarItem icon={Plus} label="تسجيل رحلة مالية" active={activeTab === 'logTrip'} onClick={() => setActiveTab('logTrip')} />
              <SidebarItem icon={History} label="سجل العمليات" active={activeTab === 'trips'} onClick={() => setActiveTab('trips')} />
            </>
          )}
        </nav>

        <div className="pt-6 border-t border-slate-50 space-y-3">
           <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-slate-600 shadow-sm">
                {userRole === 'owner' ? <ShieldCheck size={20}/> : <User size={20}/>}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-[10px] text-slate-400 font-black uppercase">الحساب</p>
                <p className="text-sm font-black text-slate-800 truncate">
                  {userRole === 'owner' ? 'صاحب الأسطول' : `السائق: ${loggedInDriver?.name}`}
                </p>
                {userRole === 'driver' && assignedVehicle && (
                  <p className="text-[10px] text-red-600 font-bold">{assignedVehicle.plateNumber}</p>
                )}
              </div>
           </div>
           <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 w-full rounded-2xl text-red-500 hover:bg-red-50 font-black transition-all text-sm">
             <LogOut size={20}/>
             <span>تسجيل الخروج</span>
           </button>
        </div>
      </aside>

      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">
              {activeTab === 'dashboard' && t.dashboard}
              {activeTab === 'vehicles' && t.vehicles}
              {activeTab === 'drivers' && t.drivers}
              {activeTab === 'trips' && 'سجل المحاسبة المالية'}
              {activeTab === 'passengers' && t.passengers}
              {activeTab === 'maintenance' && t.maintenance}
              {activeTab === 'settings' && t.settings}
              {activeTab === 'logTrip' && t.logTrip}
            </h2>
            <div className="flex items-center gap-4 text-slate-500 mt-1 font-semibold">
               <div className="flex items-center gap-2">
                 <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                 <p className="text-sm flex items-center gap-1"><Cloud size={14}/> مزامنة فورية (Firebase)</p>
               </div>
            </div>
          </div>
          
          {(userRole === 'owner' || userRole === 'driver') && (
            <button 
              onClick={() => { setEditingPassenger(null); setActiveTab('passengers'); }}
              className="bg-red-600 text-white px-6 py-3 rounded-2xl flex items-center gap-2 hover:bg-red-700 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-red-100"
            >
              <Plus size={20} />
              <span className="font-black text-sm">تسجيل مسافر</span>
            </button>
          )}
        </header>

        {activeTab === 'dashboard' && userRole === 'owner' && (
          <div className="space-y-10 animate-in fade-in duration-700">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard title={t.totalRevenue} value={`${stats.totalRevenue.toFixed(3)} د.ت`} icon={TrendingUp} colorClass="bg-green-50 text-green-600" />
              <StatCard title={t.totalProfit} value={`${stats.totalProfit.toFixed(3)} د.ت`} icon={Wallet} colorClass="bg-red-50 text-red-600" />
              <StatCard title={t.fuel} value={`${stats.totalFuel.toFixed(3)} د.ت`} icon={Fuel} colorClass="bg-orange-50 text-orange-600" />
              <StatCard title={t.expenses} value={`${stats.totalExpenses.toFixed(3)} د.ت`} icon={LogOut} colorClass="bg-red-50 text-red-600" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
                <h3 className="text-lg font-black mb-8 text-slate-800">تطور الأرباح (آخر 7 رحلات)</h3>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats.chartData}>
                      <defs>
                        <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#dc2626" stopOpacity={0.15}/>
                          <stop offset="95%" stopColor="#dc2626" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 'bold'}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 'bold'}} />
                      <Tooltip 
                        contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px'}}
                        itemStyle={{color: '#dc2626', fontWeight: 'bold'}}
                      />
                      <Area type="monotone" dataKey="profit" stroke="#dc2626" fillOpacity={1} fill="url(#colorProfit)" strokeWidth={4} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
                <h3 className="text-lg font-black mb-8 text-slate-800">تحليل المداخيل</h3>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 'bold'}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 'bold'}} />
                      <Tooltip 
                        contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                        cursor={{fill: '#f8fafc', radius: 8}}
                      />
                      <Bar dataKey="revenue" fill="#dc2626" radius={[6, 6, 0, 0]} barSize={32} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'passengers' && (
          <div className="space-y-8 animate-in slide-in-from-right-4 duration-500 pb-20">
            {/* Passenger Date Selection List */}
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
               <p className="text-[10px] font-black text-slate-400 uppercase mb-4 px-2">اختر يوم الحجز (الأيام السبعة القادمة)</p>
               <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                 {availableDates.map(date => (
                   <button 
                     key={date}
                     onClick={() => setPassengerFilterDate(date)}
                     className={`flex-shrink-0 px-6 py-4 rounded-2xl transition-all duration-300 flex flex-col items-center gap-1 ${
                       passengerFilterDate === date 
                        ? 'bg-red-600 text-white shadow-lg shadow-red-200 scale-105' 
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-100'
                     }`}
                   >
                     <span className="text-[10px] font-black uppercase tracking-tight">{getDayName(date)}</span>
                     <span className="text-sm font-black">{new Date(date).toLocaleDateString('ar-TN', { day: 'numeric', month: 'short' })}</span>
                   </button>
                 ))}
               </div>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
              <h3 className="text-xl font-black mb-6 flex items-center gap-3">
                <div className="bg-red-50 p-2 rounded-xl text-red-600">
                  {editingPassenger ? <Edit2 size={20}/> : <Plus size={20}/>}
                </div>
                {editingPassenger ? 'تعديل حجز مسافر' : 'تسجيل مسافر جديد'}
              </h3>
              <PassengerForm 
                initialData={editingPassenger}
                availableDates={availableDates}
                vehicles={data.vehicles} 
                passengers={data.passengers}
                fixedVehicleId={userRole === 'driver' ? assignedVehicle?.id : undefined} 
                onSave={editingPassenger ? updatePassenger : addPassenger} 
                onCancel={() => setEditingPassenger(null)}
              />
            </div>
            
            <div className="space-y-8">
              <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3 px-4 mt-12 mb-4">
                 قائمة الحجوزات - {getDayName(passengerFilterDate)} {new Date(passengerFilterDate).toLocaleDateString('ar-TN')}
              </h3>

              {(userRole === 'owner' ? data.vehicles : (assignedVehicle ? [assignedVehicle] : [])).map(v => {
                const vehiclePassengers = dailyPassengers.filter(p => p.vehicleId === v.id);
                
                const tunisToJelmaSeats = vehiclePassengers
                  .filter(p => p.direction === 'TunisToJelma')
                  .reduce((sum, p) => sum + p.seatsCount, 0);
                  
                const jelmaToTunisSeats = vehiclePassengers
                  .filter(p => p.direction === 'JelmaToTunis')
                  .reduce((sum, p) => sum + p.seatsCount, 0);

                return (
                  <div key={v.id} className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden animate-in fade-in duration-500 mb-8">
                    <div className="p-8 border-b border-slate-50 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50">
                      <div className="flex items-center gap-4">
                        <div className="bg-white p-3 rounded-2xl shadow-sm text-red-600 border border-slate-100"><Car size={24}/></div>
                        <div>
                           <h4 className="font-black text-lg text-slate-800">{v.model} - {v.plateNumber}</h4>
                           <p className="text-xs font-bold text-slate-400">سجل حجوزات السيارة</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="px-5 py-2.5 bg-blue-50 border border-blue-100 rounded-2xl flex items-center gap-3 shadow-sm">
                           <div className="text-right">
                              <p className="text-[9px] font-black text-blue-400 uppercase leading-none">تونس ➔ جلمة</p>
                              <p className={`text-sm font-black ${tunisToJelmaSeats >= 8 ? 'text-red-600' : 'text-blue-700'}`}>
                                {8 - tunisToJelmaSeats} متبقي
                              </p>
                           </div>
                           <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[10px] font-black text-blue-700">
                             {tunisToJelmaSeats}/8
                           </div>
                        </div>
                        <div className="px-5 py-2.5 bg-orange-50 border border-orange-100 rounded-2xl flex items-center gap-3 shadow-sm">
                           <div className="text-right">
                              <p className="text-[9px] font-black text-orange-400 uppercase leading-none">جلمة ➔ تونس</p>
                              <p className={`text-sm font-black ${jelmaToTunisSeats >= 8 ? 'text-red-600' : 'text-orange-700'}`}>
                                {8 - jelmaToTunisSeats} متبقي
                              </p>
                           </div>
                           <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[10px] font-black text-orange-700">
                             {jelmaToTunisSeats}/8
                           </div>
                        </div>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-right whitespace-nowrap">
                        <thead className="bg-slate-50/30">
                          <tr>
                            <th className="px-8 py-5 font-black text-slate-500 text-xs uppercase tracking-widest text-right">المسافر</th>
                            <th className="px-8 py-5 font-black text-slate-500 text-xs uppercase tracking-widest text-right">المقاعد</th>
                            <th className="px-8 py-5 font-black text-slate-500 text-xs uppercase tracking-widest text-right">رقم الهاتف</th>
                            <th className="px-8 py-5 font-black text-slate-500 text-xs uppercase tracking-widest text-right">المسار</th>
                            <th className="px-8 py-5 font-black text-slate-500 text-xs uppercase tracking-widest text-right">إجراءات</th>
                          </tr>
                        </thead>
                        <tbody>
                          {vehiclePassengers.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-8 py-16 text-center text-slate-300 font-bold italic">لا توجد حجوزات لهذه السيارة اليوم</td>
                            </tr>
                          ) : vehiclePassengers.map(p => {
                            const cleanPhone = p.phone.replace(/\s/g, '');
                            return (
                              <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors group">
                                <td className="px-8 py-5 font-black text-slate-800">{p.name}</td>
                                <td className="px-8 py-5">
                                  <span className="bg-red-50 text-red-700 px-3 py-1 rounded-full text-xs font-black flex items-center gap-1 w-fit border border-red-100">
                                    <Armchair size={14}/> {p.seatsCount}
                                  </span>
                                </td>
                                <td className="px-8 py-5">
                                  <div className="flex items-center gap-3">
                                    <span className="text-slate-600 font-bold">{p.phone}</span>
                                    <div className="flex gap-2">
                                      <a href={`tel:${cleanPhone}`} className="p-2 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition shadow-sm">
                                        <Phone size={14}/>
                                      </a>
                                      <a href={`https://wa.me/${cleanPhone.startsWith('0') ? '216' + cleanPhone.substring(1) : (cleanPhone.startsWith('216') ? cleanPhone : '216' + cleanPhone)}`} target="_blank" rel="noreferrer" className="p-2 bg-green-50 text-green-600 rounded-full hover:bg-green-100 transition shadow-sm">
                                        <MessageCircle size={14}/>
                                      </a>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-8 py-5">
                                  <span className={`px-4 py-1.5 rounded-full text-xs font-black flex items-center gap-2 w-fit ${p.direction === 'TunisToJelma' ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'}`}>
                                    <ArrowLeftRight size={14} className={p.direction === 'JelmaToTunis' ? 'rotate-180' : ''} />
                                    {p.direction === 'TunisToJelma' ? 'تونس إلي جلمة' : 'جلمة إلي تونس'}
                                  </span>
                                </td>
                                <td className="px-8 py-5">
                                   <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button 
                                        onClick={() => handleEditPassenger(p)}
                                        className="p-2 text-slate-400 hover:text-blue-600 bg-white border border-slate-100 rounded-xl hover:shadow-sm"
                                        title="تعديل"
                                      >
                                        <Edit2 size={16}/>
                                      </button>
                                      <button 
                                        onClick={() => removePassenger(p.id)}
                                        className="p-2 text-slate-400 hover:text-red-600 bg-white border border-slate-100 rounded-xl hover:shadow-sm"
                                        title="حذف"
                                      >
                                        <Trash2 size={16}/>
                                      </button>
                                   </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'trips' && (
           <div className="space-y-8 animate-in fade-in duration-500 pb-20">
             {/* Accounting Filter View */}
             <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col md:flex-row gap-6 items-end justify-between">
                <div className="flex flex-col sm:flex-row gap-6 w-full md:w-auto">
                   <div className="flex-1 space-y-2">
                      <label className="text-xs font-black text-slate-400 mr-2 uppercase tracking-tighter flex items-center gap-2">
                        <Filter size={14}/> من تاريخ
                      </label>
                      <input 
                        type="date" 
                        value={tripStartDate} 
                        onChange={(e) => setTripStartDate(e.target.value)}
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black outline-none focus:ring-2 focus:ring-red-500 transition-all"
                      />
                   </div>
                   <div className="flex-1 space-y-2">
                      <label className="text-xs font-black text-slate-400 mr-2 uppercase tracking-tighter flex items-center gap-2">
                        <Filter size={14}/> إلى تاريخ
                      </label>
                      <input 
                        type="date" 
                        value={tripEndDate} 
                        onChange={(e) => setTripEndDate(e.target.value)}
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black outline-none focus:ring-2 focus:ring-red-500 transition-all"
                      />
                   </div>
                </div>
                
                <div className="bg-red-50 px-8 py-4 rounded-2xl border border-red-100 text-center w-full md:w-auto">
                   <p className="text-[10px] font-black text-red-400 uppercase leading-none mb-1">إجمالي الأرباح المجمعة</p>
                   <p className="text-2xl font-black text-red-600">
                     {filteredTrips.reduce((sum, t) => sum + t.netProfit, 0).toFixed(3)} د.ت
                   </p>
                </div>
             </div>

             {/* Grouped Tables by Vehicle */}
             {(userRole === 'owner' ? data.vehicles : (assignedVehicle ? [assignedVehicle] : [])).map(v => {
                const vehicleTrips = filteredTrips.filter(t => t.vehicleId === v.id);
                const vehicleTotalProfit = vehicleTrips.reduce((sum, t) => sum + t.netProfit, 0);

                return (
                  <div key={v.id} className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
                    <div className="p-8 border-b border-slate-50 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50">
                      <div className="flex items-center gap-4">
                        <div className="bg-white p-3 rounded-2xl shadow-sm text-red-600 border border-slate-100"><Car size={24}/></div>
                        <div>
                           <h4 className="font-black text-lg text-slate-800">{v.model} - {v.plateNumber}</h4>
                           <p className="text-xs font-bold text-slate-400">سجل محاسبة السيارة خلال الفترة المحددة</p>
                        </div>
                      </div>
                      <div className="px-8 py-3 bg-green-50 border border-green-100 rounded-2xl text-center">
                         <p className="text-[10px] font-black text-green-400 uppercase leading-none mb-1">صافي الحساب لهذه السيارة</p>
                         <p className="text-xl font-black text-green-700">
                           {vehicleTotalProfit.toFixed(3)} د.ت
                         </p>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                       <table className="w-full text-right whitespace-nowrap">
                          <thead className="bg-slate-50/30">
                            <tr>
                              <th className="px-8 py-5 font-black text-slate-500 text-xs uppercase tracking-widest text-right">التاريخ</th>
                              <th className="px-8 py-5 font-black text-slate-500 text-xs uppercase tracking-widest text-right">المداخيل</th>
                              <th className="px-8 py-5 font-black text-slate-500 text-xs uppercase tracking-widest text-right">مناب السائق</th>
                              <th className="px-8 py-5 font-black text-slate-500 text-xs uppercase tracking-widest text-right">الوقود</th>
                              <th className="px-8 py-5 font-black text-slate-500 text-xs uppercase tracking-widest text-right">الربح الصافي</th>
                              {userRole === 'owner' && (
                                <th className="px-8 py-5 font-black text-slate-500 text-xs uppercase tracking-widest text-right">ظهور للسائق</th>
                              )}
                            </tr>
                          </thead>
                          <tbody>
                            {vehicleTrips.length === 0 ? (
                              <tr>
                                <td colSpan={userRole === 'owner' ? 6 : 5} className="px-8 py-16 text-center text-slate-300 font-bold italic">لا توجد سجلات محاسبية خلال هذه الفترة</td>
                              </tr>
                            ) : vehicleTrips.map(trip => (
                              <tr key={trip.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors group">
                                <td className="px-8 py-5 text-slate-600 font-bold">
                                   <div className="flex flex-col">
                                      <span className="text-[10px] font-black uppercase text-slate-400">{getDayName(trip.date)}</span>
                                      <span>{new Date(trip.date).toLocaleDateString('ar-TN')}</span>
                                   </div>
                                </td>
                                <td className="px-8 py-5 font-black text-slate-800">{trip.revenue.toFixed(3)}</td>
                                <td className="px-8 py-5 text-slate-500 font-bold">{trip.driverShare.toFixed(3)}</td>
                                <td className="px-8 py-5 text-orange-600 font-bold">{trip.fuelCost.toFixed(3)}</td>
                                <td className="px-8 py-5">
                                   <span className={`px-4 py-1.5 rounded-full text-sm font-black ${trip.netProfit > 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                      {trip.netProfit.toFixed(3)}
                                   </span>
                                </td>
                                {userRole === 'owner' && (
                                  <td className="px-8 py-5">
                                     <button 
                                       onClick={() => toggleTripVisibility(trip.id)}
                                       className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-black text-xs ${
                                         trip.visibleToDriver 
                                          ? 'bg-blue-50 text-blue-600 hover:bg-blue-100' 
                                          : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                                       }`}
                                     >
                                       {trip.visibleToDriver ? <EyeIcon size={14}/> : <EyeOffIcon size={14}/>}
                                       {trip.visibleToDriver ? 'ظاهر' : 'مخفي'}
                                     </button>
                                  </td>
                                )}
                              </tr>
                            ))}
                          </tbody>
                       </table>
                    </div>
                  </div>
                );
             })}
           </div>
        )}

        {activeTab === 'vehicles' && userRole === 'owner' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-500">
            {data.vehicles.map(v => {
              const kmSinceOil = v.currentKM - v.lastOilChangeKM;
              const oilAlert = kmSinceOil >= data.settings.oilChangeInterval;
              const driver = data.drivers.find(d => d.vehicleId === v.id);
              return (
                <div key={v.id} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col gap-4 relative overflow-hidden group">
                  {oilAlert && <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] px-3 py-1 flex items-center gap-1 rounded-bl-2xl font-black uppercase"> <AlertTriangle size={12}/> {t.oilAlert}</div>}
                  <div className="flex justify-between items-center">
                    <div className="bg-red-100 p-3 rounded-2xl text-red-600 group-hover:scale-110 transition-transform"><Car size={24}/></div>
                    <span className="bg-slate-100 px-3 py-1 rounded-full text-xs font-black text-slate-600 tracking-wider">{v.plateNumber}</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-800">{v.model}</h3>
                    <p className="text-slate-500 text-xs font-bold mt-1">السائق: <span className="text-red-600">{driver ? driver.name : 'لا يوجد'}</span></p>
                  </div>
                  <div className="grid grid-cols-1 gap-2 mt-2">
                    <div className="p-3 bg-slate-50 rounded-2xl flex justify-between items-center">
                      <p className="text-[10px] text-slate-400 uppercase font-black">إجمالي المسافة</p>
                      <p className="font-black text-slate-700">{v.currentKM} كم</p>
                    </div>
                    <div className={`p-3 rounded-2xl flex justify-between items-center ${oilAlert ? 'bg-red-50' : 'bg-green-50'}`}>
                      <p className="text-[10px] text-slate-400 uppercase font-black">منذ تغيير الزيت</p>
                      <p className={`font-black ${oilAlert ? 'text-red-600' : 'text-green-600'}`}>+ {kmSinceOil} كم</p>
                    </div>
                  </div>
                </div>
              );
            })}
            <AddVehicleForm onSave={addVehicle} />
          </div>
        )}

        {activeTab === 'maintenance' && userRole === 'owner' && (
           <div className="space-y-6">
              {data.vehicles.map(v => {
                 const kmSinceOil = v.currentKM - v.lastOilChangeKM;
                 const progress = Math.min((kmSinceOil / data.settings.oilChangeInterval) * 100, 100);
                 const isDue = kmSinceOil >= data.settings.oilChangeInterval;
                 return (
                   <div key={v.id} className="bg-white p-8 rounded-[2rem] border border-slate-100 flex items-center justify-between">
                      <div>
                        <h4 className="font-black text-xl text-slate-800">{v.model} - {v.plateNumber}</h4>
                        <div className="w-64 h-2 bg-slate-100 rounded-full mt-4 overflow-hidden">
                           <div className={`h-full transition-all ${isDue ? 'bg-red-500' : 'bg-red-600'}`} style={{width: `${progress}%`}} />
                        </div>
                        <p className="text-xs font-bold text-slate-400 mt-2">منذ آخر تغيير: {kmSinceOil} كم / {data.settings.oilChangeInterval} كم</p>
                      </div>
                      <button 
                        onClick={() => {
                          const updated = data.vehicles.map(veh => veh.id === v.id ? { ...veh, lastOilChangeKM: veh.currentKM } : veh);
                          const vehRef = doc(db, "vehicles", v.id);
                          updateDoc(vehRef, { lastOilChangeKM: v.currentKM });
                        }}
                        className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-black text-sm"
                      >تأكيد الصيانة</button>
                   </div>
                 )
              })}
           </div>
        )}

        {activeTab === 'logTrip' && (
           <TripForm 
             vehicles={data.vehicles} 
             fixedVehicleId={userRole === 'driver' ? assignedVehicle?.id : undefined}
             onSave={(t) => { addTrip(t); setActiveTab('trips'); }}
             onCancel={() => setActiveTab('trips')}
           />
        )}

        {activeTab === 'drivers' && userRole === 'owner' && (
           <div className="space-y-8">
              <AddDriverForm vehicles={data.vehicles} onSave={addDriver} />
              <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden">
                 <table className="w-full text-right">
                    <thead className="bg-slate-50 font-black text-xs text-slate-400">
                      <tr>
                        <th className="p-6">الاسم</th>
                        <th className="p-6">السيارة</th>
                        <th className="p-6">كلمة المرور</th>
                        <th className="p-6"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.drivers.map(d => (
                        <tr key={d.id} className="border-b border-slate-50">
                          <td className="p-6 font-black">{d.name}</td>
                          <td className="p-6">{data.vehicles.find(v => v.id === d.vehicleId)?.plateNumber}</td>
                          <td className="p-6 tracking-widest">{d.password}</td>
                          <td className="p-6 text-left"><button onClick={() => removeDriver(d.id)} className="text-red-400 hover:text-red-600"><Trash2 size={18}/></button></td>
                        </tr>
                      ))}
                    </tbody>
                 </table>
              </div>
           </div>
        )}

        {activeTab === 'settings' && userRole === 'owner' && (
          <div className="max-w-xl space-y-6">
            <div className="bg-white p-8 rounded-[2rem] border border-slate-100">
              <h3 className="font-black text-lg mb-6">إعدادات الحماية</h3>
              <div className="space-y-4">
                <label className="text-sm font-bold text-slate-500">كلمة مرور المالك</label>
                <input type="text" value={data.settings.ownerPassword} onChange={e => updateSettings({ownerPassword: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black" />
              </div>
            </div>
            <div className="bg-white p-8 rounded-[2rem] border border-slate-100">
              <h3 className="font-black text-lg mb-6">إعدادات الصيانة</h3>
              <div className="space-y-4">
                <label className="text-sm font-bold text-slate-500">دورة تغيير الزيت (كم)</label>
                <input type="number" value={data.settings.oilChangeInterval} onChange={e => updateSettings({oilChangeInterval: parseInt(e.target.value)})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black" />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// --- Forms ---

interface PassengerFormProps {
  initialData?: Passenger | null;
  availableDates: string[];
  vehicles: Vehicle[];
  passengers: Passenger[];
  fixedVehicleId?: string;
  onSave: (p: any) => void;
  onCancel: () => void;
}

const PassengerForm = ({ initialData, availableDates, vehicles, passengers, fixedVehicleId, onSave, onCancel }: PassengerFormProps) => {
  const [form, setForm] = useState({ 
    id: initialData?.id || '',
    name: initialData?.name || '', 
    phone: initialData?.phone || '', 
    direction: initialData?.direction || 'TunisToJelma' as 'TunisToJelma' | 'JelmaToTunis', 
    date: initialData?.date || availableDates[0], 
    vehicleId: fixedVehicleId || initialData?.vehicleId || (vehicles[0]?.id || ''),
    seatsCount: initialData?.seatsCount || 1
  });

  useEffect(() => {
    if (initialData) {
      setForm({
        id: initialData.id,
        name: initialData.name,
        phone: initialData.phone,
        direction: initialData.direction,
        date: initialData.date,
        vehicleId: initialData.vehicleId,
        seatsCount: initialData.seatsCount
      });
    }
  }, [initialData]);

  const takenSeatsInDirection = passengers.filter(p => 
    p.date === form.date && 
    p.vehicleId === form.vehicleId && 
    p.direction === form.direction &&
    p.id !== form.id
  ).reduce((sum, p) => sum + p.seatsCount, 0);

  const maxSeatsPerDirection = 8;
  const remainingSeats = maxSeatsPerDirection - takenSeatsInDirection;

  return (
    <div className="space-y-6 animate-in slide-in-from-top-4 duration-300">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="space-y-2">
          <label className="text-xs font-black text-slate-400 mr-2 uppercase tracking-tighter">اسم المسافر الكامل</label>
          <input 
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-sm font-black focus:ring-2 focus:ring-red-500 transition-all" 
            value={form.name} onChange={e => setForm({...form, name: e.target.value})} 
            placeholder="مثال: صالح بن علي"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-black text-slate-400 mr-2 uppercase tracking-tighter">رقم الهاتف للتواصل</label>
          <input 
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-sm font-black focus:ring-2 focus:ring-red-500 transition-all" 
            value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} 
            placeholder="مثال: 22 333 444"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-black text-slate-400 mr-2 uppercase tracking-tighter">الاتجاه (الوجهة)</label>
          <select 
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-sm font-black focus:ring-2 focus:ring-red-500 transition-all" 
            value={form.direction} onChange={e => setForm({...form, direction: e.target.value as any})}
          >
            <option value="TunisToJelma">من تونس إلي جلمة (ذهاب)</option>
            <option value="JelmaToTunis">من جلمة إلي تونس (إياب)</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-black text-slate-400 mr-2 uppercase tracking-tighter">تاريخ الحجز</label>
          <select 
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-sm font-black focus:ring-2 focus:ring-red-500 transition-all" 
            value={form.date} onChange={e => setForm({...form, date: e.target.value})}
          >
            {availableDates.map(d => (
              <option key={d} value={d}>{getDayName(d)} - {new Date(d).toLocaleDateString('ar-TN')}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-6 p-6 bg-slate-50 rounded-[2rem] border border-slate-200">
        <div className="flex-1 space-y-2">
          <label className="text-xs font-black text-slate-400 mr-2 uppercase tracking-tighter">عدد المقاعد في هذا الاتجاه</label>
          <div className="flex flex-wrap items-center gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
              <button
                key={n}
                onClick={() => setForm({...form, seatsCount: n})}
                disabled={n > remainingSeats}
                className={`w-10 h-10 rounded-xl font-black text-xs transition-all border ${
                  form.seatsCount === n 
                    ? 'bg-red-600 text-white shadow-lg border-red-600 scale-110' 
                    : n > remainingSeats 
                      ? 'bg-slate-100 text-slate-300 cursor-not-allowed border-slate-100'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-red-300'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {!fixedVehicleId && (
          <div className="flex-1 space-y-2">
            <label className="text-xs font-black text-slate-400 mr-2 uppercase tracking-tighter">اختر السيارة</label>
            <select 
              className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none text-sm font-black" 
              value={form.vehicleId} onChange={e => setForm({...form, vehicleId: e.target.value})}
            >
              {vehicles.map(v => <option key={v.id} value={v.id}>{v.plateNumber} ({v.model})</option>)}
            </select>
          </div>
        )}
        
        <div className="flex-1 flex items-center justify-between gap-4 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
           <div>
              <p className="text-[10px] font-black text-slate-400 uppercase">المقاعد المتاحة (بالوجهة)</p>
              <p className={`text-lg font-black ${remainingSeats > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {remainingSeats > 0 ? `${remainingSeats} مقاعد` : 'مكتملة'}
              </p>
           </div>
           <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black ${remainingSeats > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
             {takenSeatsInDirection}/8
           </div>
        </div>

        <div className="flex gap-2">
          {initialData && (
            <button onClick={onCancel} className="px-6 py-5 rounded-2xl font-black text-sm bg-slate-200 text-slate-600 hover:bg-slate-300 transition-all">إلغاء</button>
          )}
          <button 
            onClick={() => {
              if (!form.name || !form.phone || !form.vehicleId) return alert('يرجى إكمال بيانات المسافر');
              if (form.seatsCount > remainingSeats) return alert(`عذراً، المقاعد المتاحة لهذا الاتجاه لا تكفي (فقط ${remainingSeats} متبقي)`);
              onSave(form);
              if (!initialData) setForm({ ...form, name: '', phone: '', seatsCount: 1 });
            }} 
            disabled={remainingSeats <= 0}
            className={`px-10 py-5 rounded-2xl font-black text-sm shadow-xl transition-all active:scale-95 flex items-center gap-2 ${remainingSeats > 0 ? 'bg-red-600 text-white shadow-red-100 hover:bg-red-700' : 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'}`}
          >
            {initialData ? <CheckCircle2 size={18}/> : <Plus size={18}/>}
            {initialData ? 'تحديث الحجز' : 'تأكيد تسجيل المسافر'}
          </button>
        </div>
      </div>
    </div>
  );
};

const AddVehicleForm = ({ onSave }: { onSave: (v: Omit<Vehicle, 'id'>) => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({ plateNumber: '', model: '', currentKM: 0, lastOilChangeKM: 0 });
  if (!isOpen) return (
    <button onClick={() => setIsOpen(true)} className="border-2 border-dashed border-slate-200 p-8 rounded-[2rem] flex flex-col items-center justify-center gap-3 text-slate-400 hover:border-red-400 hover:text-red-500 transition-all duration-300 group">
      <div className="p-5 bg-slate-50 rounded-full group-hover:bg-red-50 transition shadow-sm"><Plus size={32} /></div>
      <span className="font-black text-sm tracking-tight">إضافة سيارة جديدة</span>
    </button>
  );
  return (
    <div className="bg-white p-8 rounded-[2rem] shadow-2xl border-2 border-red-500 flex flex-col gap-5 animate-in zoom-in-95 duration-200">
      <h3 className="font-black text-xl border-b border-slate-50 pb-4">بيانات السيارة</h3>
      <input placeholder="رقم اللوحة" className="p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold" value={form.plateNumber} onChange={e => setForm({...form, plateNumber: e.target.value})} />
      <input placeholder="الموديل" className="p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold" value={form.model} onChange={e => setForm({...form, model: e.target.value})} />
      <input type="number" placeholder="العداد الحالي" className="p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold" value={form.currentKM || ''} onChange={e => setForm({...form, currentKM: parseInt(e.target.value) || 0})} />
      <div className="flex gap-3">
        <button onClick={() => { onSave({...form, lastOilChangeKM: form.currentKM}); setIsOpen(false); }} className="flex-1 bg-red-600 text-white py-4 rounded-2xl font-black">حفظ</button>
        <button onClick={() => setIsOpen(false)} className="px-6 py-4 text-slate-500 font-black">إلغاء</button>
      </div>
    </div>
  );
};

const AddDriverForm = ({ vehicles, onSave }: { vehicles: Vehicle[], onSave: (d: Omit<DriverAccount, 'id'>) => void }) => {
  const [form, setForm] = useState({ name: '', password: '', vehicleId: vehicles[0]?.id || '' });
  return (
    <div className="bg-white p-8 rounded-[2rem] border border-slate-100 grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
      <div className="space-y-2"><label className="text-xs font-black text-slate-400">الاسم</label><input className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold" value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
      <div className="space-y-2"><label className="text-xs font-black text-slate-400">كلمة السر</label><input className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold" value={form.password} onChange={e => setForm({...form, password: e.target.value})} /></div>
      <div className="space-y-2"><label className="text-xs font-black text-slate-400">السيارة</label><select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold" value={form.vehicleId} onChange={e => setForm({...form, vehicleId: e.target.value})}>{vehicles.map(v => <option key={v.id} value={v.id}>{v.plateNumber}</option>)}</select></div>
      <button onClick={() => onSave(form)} className="bg-red-600 text-white py-4 rounded-2xl font-black">إضافة سائق</button>
    </div>
  );
}

const TripForm = ({ vehicles, fixedVehicleId, onSave, onCancel }: { vehicles: Vehicle[], fixedVehicleId?: string, onSave: (t: any) => void, onCancel: () => void }) => {
  const [form, setForm] = useState({ vehicleId: fixedVehicleId || (vehicles[0]?.id || ''), date: new Date().toISOString().split('T')[0], revenue: 0, kmTraveled: 0, fuelCost: 0, expenses: 0, expenseNote: '' });
  return (
    <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl border border-slate-100 flex flex-col gap-8">
      <h3 className="text-2xl font-black">تسجيل رحلة مالية اليوم</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <select disabled={!!fixedVehicleId} value={form.vehicleId} onChange={e => setForm({...form, vehicleId: e.target.value})} className="p-4 bg-slate-50 border rounded-2xl font-black">{vehicles.map(v => <option key={v.id} value={v.id}>{v.plateNumber}</option>)}</select>
        <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="p-4 bg-slate-50 border rounded-2xl font-black" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2"><label className="font-black text-sm">المداخيل (د.ت)</label><input type="number" step="0.001" className="w-full p-5 bg-red-50 border-2 border-red-100 rounded-2xl text-red-700 font-black text-2xl" value={form.revenue || ''} onChange={e => setForm({...form, revenue: parseFloat(e.target.value) || 0})} /></div>
        <div className="space-y-2"><label className="font-black text-sm">تكلفة الوقود</label><input type="number" step="0.001" className="w-full p-5 bg-orange-50 border rounded-2xl text-orange-700 font-black text-2xl" value={form.fuelCost || ''} onChange={e => setForm({...form, fuelCost: parseFloat(e.target.value) || 0})} /></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <input type="number" placeholder="المسافة المقطوعة (كم)" className="p-4 bg-slate-50 border rounded-2xl font-black" value={form.kmTraveled || ''} onChange={e => setForm({...form, kmTraveled: parseInt(e.target.value) || 0})} />
        <input type="number" placeholder="مصاريف أخرى طارئة" className="p-4 bg-red-50 border rounded-2xl font-black" value={form.expenses || ''} onChange={e => setForm({...form, expenses: parseFloat(e.target.value) || 0})} />
      </div>
      <div className="flex gap-4 pt-6">
        <button onClick={() => onSave(form)} className="flex-[2] bg-red-600 text-white py-5 rounded-[1.5rem] font-black shadow-xl shadow-red-100">حفظ بيانات الرحلة</button>
        <button onClick={onCancel} className="flex-1 text-slate-400 font-black">إلغاء</button>
      </div>
    </div>
  );
};
