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
  Loader2,
  Menu,
  X,
  MapPin
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
  orderBy
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

const NavItemMobile = ({ icon: Icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center justify-center gap-1 flex-1 py-2 transition-all ${
      active ? 'text-red-600 scale-110' : 'text-slate-400'
    }`}
  >
    <Icon size={22} strokeWidth={active ? 2.5 : 2} />
    <span className={`text-[10px] font-black ${active ? 'opacity-100' : 'opacity-70'}`}>{label}</span>
  </button>
);

const StatCard = ({ title, value, icon: Icon, colorClass }: { title: string, value: string, icon: any, colorClass: string }) => (
  <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-md transition-all group">
    <div className="flex justify-between items-center mb-2">
      <div className={`p-2.5 rounded-2xl ${colorClass}`}>
        <Icon size={20} />
      </div>
      <span className="text-slate-400 group-hover:text-red-500 transition-colors"><TrendingUp size={14}/></span>
    </div>
    <h3 className="text-slate-500 text-xs font-bold">{title}</h3>
    <p className="text-xl font-black mt-0.5 text-slate-900 tracking-tight">{value}</p>
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
        setDoc(doc(db, "settings", "global"), DEFAULT_SETTINGS);
      }
      setIsLoading(false);
    });

    return () => {
      unsubVehicles(); unsubDrivers(); unsubTrips(); unsubPassengers(); unsubSettings();
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
  };

  // Fix: Added handleEditPassenger function to fix the "Cannot find name 'handleEditPassenger'" error.
  // This sets the selected passenger as the one being edited and scrolls to the form.
  const handleEditPassenger = (p: Passenger) => {
    setEditingPassenger(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const updateSettings = async (updates: Partial<Settings>) => {
    await setDoc(doc(db, "settings", "global"), { ...data.settings, ...updates });
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

  const addTrip = async (tripData: any) => {
    const vehicle = data.vehicles.find(v => v.id === tripData.vehicleId);
    if (!vehicle) return;
    const driverShare = tripData.revenue * (data.settings.driverPercentage / 100);
    const netProfit = tripData.revenue - driverShare - tripData.fuelCost - tripData.expenses;
    const newTrip = { ...tripData, driverShare, netProfit, visibleToDriver: true };
    await addDoc(collection(db, "trips"), newTrip);
    await updateDoc(doc(db, "vehicles", tripData.vehicleId), { currentKM: vehicle.currentKM + tripData.kmTraveled });
  };

  const toggleTripVisibility = async (id: string) => {
    const trip = data.trips.find(t => t.id === id);
    if (trip) await updateDoc(doc(db, "trips", id), { visibleToDriver: !trip.visibleToDriver });
  };

  const addPassenger = async (p: any) => await addDoc(collection(db, "passengers"), p);
  const updatePassenger = async (p: Passenger) => {
    const { id, ...rest } = p;
    await updateDoc(doc(db, "passengers", id), rest);
    setEditingPassenger(null);
  };
  const removePassenger = async (id: string) => { if (confirm('حذف الحجز؟')) await deleteDoc(doc(db, "passengers", id)); };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-4">
        <Loader2 className="animate-spin text-red-600 mb-4" size={48} />
        <p className="text-slate-600 font-black font-['Cairo']">مزامنة البيانات...</p>
      </div>
    );
  }

  if (!userRole) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4 font-['Cairo']">
        <div className="max-w-md w-full animate-in fade-in zoom-in duration-500">
          <div className="text-center mb-10">
            <div className="inline-flex bg-red-600 p-6 rounded-[2.5rem] text-white mb-4 shadow-2xl shadow-red-200">
              <Car size={56} />
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight uppercase">zed-louage</h1>
            <p className="text-slate-400 mt-2 font-bold">الجيل الجديد من إدارة النقل</p>
          </div>

          <div className="bg-white/80 backdrop-blur-2xl rounded-[3rem] shadow-2xl p-8 border border-white">
            {!selectedRole ? (
              <div className="space-y-4">
                <button 
                  onClick={() => setSelectedRole('owner')}
                  className="w-full flex items-center justify-between p-6 bg-red-50 hover:bg-red-100 rounded-[2rem] transition-all group"
                >
                  <div className="flex items-center gap-4 text-right">
                    <div className="bg-red-600 p-4 rounded-2xl text-white shadow-lg"><ShieldCheck size={28} /></div>
                    <div>
                      <span className="block font-black text-xl text-slate-800">صاحب السيارة</span>
                      <span className="text-xs text-red-500 font-black">تحكم كامل بالنظام</span>
                    </div>
                  </div>
                  <ChevronRight size={24} className="text-red-300 group-hover:translate-x-[-8px] transition-transform" />
                </button>

                <button 
                  onClick={() => setSelectedRole('driver')}
                  className="w-full flex items-center justify-between p-6 bg-slate-50 hover:bg-slate-100 rounded-[2rem] transition-all group"
                >
                  <div className="flex items-center gap-4 text-right">
                    <div className="bg-slate-700 p-4 rounded-2xl text-white shadow-lg"><User size={28} /></div>
                    <div>
                      <span className="block font-black text-xl text-slate-800">سائق</span>
                      <span className="text-xs text-slate-400 font-black">تسجيل الرحلات والحجوزات</span>
                    </div>
                  </div>
                  <ChevronRight size={24} className="text-slate-300 group-hover:translate-x-[-8px] transition-transform" />
                </button>
              </div>
            ) : (
              <form onSubmit={handleLogin} className="space-y-6">
                <div className="flex items-center gap-3 mb-4">
                  <button type="button" onClick={() => setSelectedRole(null)} className="p-2 hover:bg-slate-100 rounded-full transition text-slate-400">
                    <X size={24} />
                  </button>
                  <h2 className="text-2xl font-black text-slate-800">دخول {selectedRole === 'owner' ? 'المالك' : 'السائق'}</h2>
                </div>

                <div className="space-y-4">
                  {selectedRole === 'driver' && (
                    <input 
                      type="text" value={loginUsername} onChange={(e) => setLoginUsername(e.target.value)}
                      placeholder="اسم السائق"
                      className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-red-100 font-bold transition-all"
                    />
                  )}
                  <div className="relative">
                    <input 
                      type={showPassword ? "text" : "password"} value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="كلمة المرور"
                      className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-red-100 font-bold tracking-widest transition-all"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  {loginError && <p className="text-red-500 text-xs font-black text-center">{loginError}</p>}
                </div>

                <button type="submit" className="w-full bg-red-600 text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-red-100 hover:scale-[1.02] active:scale-95 transition-all">
                  تأكيد الدخول
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-[#f8fafc] font-['Cairo'] pb-24 md:pb-0 flex flex-col md:flex-row transition-colors ${isDarkMode ? 'dark' : ''}`}>
      
      {/* Sidebar - Desktop Only */}
      <aside className="hidden md:flex w-72 bg-white border-l border-slate-100 p-8 flex-col gap-8 shadow-sm h-screen sticky top-0">
        <div className="flex items-center gap-4">
          <div className="bg-red-600 p-3 rounded-2xl text-white shadow-lg"><Car size={28} /></div>
          <h1 className="text-xl font-black text-slate-900 uppercase">zed-louage</h1>
        </div>
        <nav className="flex flex-col gap-2 flex-1">
          {userRole === 'owner' && <SidebarItem icon={LayoutDashboard} label={t.dashboard} active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />}
          <SidebarItem icon={Users} label={t.passengers} active={activeTab === 'passengers'} onClick={() => setActiveTab('passengers')} />
          <SidebarItem icon={History} label="المحاسبة" active={activeTab === 'trips'} onClick={() => setActiveTab('trips')} />
          {userRole === 'owner' && (
            <>
              <SidebarItem icon={Car} label={t.vehicles} active={activeTab === 'vehicles'} onClick={() => setActiveTab('vehicles')} />
              <SidebarItem icon={Users} label={t.drivers} active={activeTab === 'drivers'} onClick={() => setActiveTab('drivers')} />
              <SidebarItem icon={Wrench} label={t.maintenance} active={activeTab === 'maintenance'} onClick={() => setActiveTab('maintenance')} />
              <SidebarItem icon={SettingsIcon} label={t.settings} active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
            </>
          )}
        </nav>
        <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 rounded-2xl text-red-500 hover:bg-red-50 font-black transition-all text-sm">
          <LogOut size={20}/> <span>تسجيل الخروج</span>
        </button>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-100 px-4 py-2 flex justify-between items-center z-50 shadow-[0_-10px_25px_-5px_rgba(0,0,0,0.1)]">
        {userRole === 'owner' && <NavItemMobile icon={LayoutDashboard} label="الرئيسية" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />}
        <NavItemMobile icon={Users} label="المسافرين" active={activeTab === 'passengers'} onClick={() => setActiveTab('passengers')} />
        {userRole === 'driver' && <NavItemMobile icon={Plus} label="رحلة" active={activeTab === 'logTrip'} onClick={() => setActiveTab('logTrip')} />}
        <NavItemMobile icon={History} label="المحاسبة" active={activeTab === 'trips'} onClick={() => setActiveTab('trips')} />
        <button onClick={() => setIsSidebarOpen(true)} className="flex flex-col items-center justify-center gap-1 flex-1 py-2 text-slate-400">
           <Menu size={22} /> <span className="text-[10px] font-black uppercase">المزيد</span>
        </button>
      </nav>

      {/* Mobile Fullscreen Menu Drawer */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-[60] bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-300">
           <div className="absolute left-0 right-0 bottom-0 bg-white rounded-t-[3rem] p-8 space-y-4 shadow-2xl animate-in slide-in-from-bottom-full duration-300">
              <div className="flex justify-between items-center mb-4">
                 <h3 className="text-xl font-black">القائمة</h3>
                 <button onClick={() => setIsSidebarOpen(false)} className="p-2 bg-slate-100 rounded-full"><X size={20}/></button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 {userRole === 'owner' && (
                   <>
                     <button onClick={() => { setActiveTab('vehicles'); setIsSidebarOpen(false); }} className="p-4 bg-slate-50 rounded-3xl flex flex-col items-center gap-2 font-black text-sm"><Car size={24} className="text-red-600"/> السيارات</button>
                     <button onClick={() => { setActiveTab('drivers'); setIsSidebarOpen(false); }} className="p-4 bg-slate-50 rounded-3xl flex flex-col items-center gap-2 font-black text-sm"><Users size={24} className="text-red-600"/> السائقين</button>
                     <button onClick={() => { setActiveTab('maintenance'); setIsSidebarOpen(false); }} className="p-4 bg-slate-50 rounded-3xl flex flex-col items-center gap-2 font-black text-sm"><Wrench size={24} className="text-red-600"/> الصيانة</button>
                     <button onClick={() => { setActiveTab('settings'); setIsSidebarOpen(false); }} className="p-4 bg-slate-50 rounded-3xl flex flex-col items-center gap-2 font-black text-sm"><SettingsIcon size={24} className="text-red-600"/> الإعدادات</button>
                   </>
                 )}
                 <button onClick={handleLogout} className="p-4 bg-red-50 rounded-3xl flex flex-col items-center gap-2 font-black text-sm text-red-600 col-span-2"><LogOut size={24}/> تسجيل الخروج</button>
              </div>
           </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-10">
        <header className="flex justify-between items-center mb-8 md:mb-12">
          <div>
            <h2 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight">
               {activeTab === 'dashboard' ? 'نظرة عامة' : 
                activeTab === 'passengers' ? 'إدارة الحجوزات' :
                activeTab === 'trips' ? 'السجل المالي' : 
                activeTab === 'logTrip' ? 'تسجيل رحلة جديدة' : 'الإعدادات'}
            </h2>
            <div className="flex items-center gap-2 text-slate-400 mt-1 text-xs font-bold">
               <Cloud size={14} className="text-green-500" /> مـزامنـة فـوريـة مـع السحـابـة
            </div>
          </div>
          <div className="flex items-center gap-4">
             <div className="hidden md:flex flex-col items-end">
                <p className="text-sm font-black text-slate-800">{userRole === 'owner' ? 'صاحب الأسطول' : loggedInDriver?.name}</p>
                <p className="text-[10px] text-red-600 font-black uppercase">Zed-Louage Pro</p>
             </div>
             <div className="w-12 h-12 bg-red-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-red-100">
                {userRole === 'owner' ? <ShieldCheck /> : <User />}
             </div>
          </div>
        </header>

        {activeTab === 'dashboard' && userRole === 'owner' && (
          <div className="space-y-8 animate-in fade-in duration-700">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="إجمالي المداخيل" value={`${stats.totalRevenue.toFixed(3)}`} icon={TrendingUp} colorClass="bg-green-50 text-green-600" />
              <StatCard title="الربح الصافي" value={`${stats.totalProfit.toFixed(3)}`} icon={Wallet} colorClass="bg-red-50 text-red-600" />
              <StatCard title="مصاريف الوقود" value={`${stats.totalFuel.toFixed(3)}`} icon={Fuel} colorClass="bg-orange-50 text-orange-600" />
              <StatCard title="مصاريف أخرى" value={`${stats.totalExpenses.toFixed(3)}`} icon={LogOut} colorClass="bg-slate-50 text-slate-600" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-slate-50">
                <h3 className="text-lg font-black mb-6 flex items-center gap-2"><div className="w-2 h-2 bg-red-600 rounded-full"></div>تطور الأرباح</h3>
                <div className="h-[250px] md:h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats.chartData}>
                      <defs><linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#dc2626" stopOpacity={0.15}/><stop offset="95%" stopColor="#dc2626" stopOpacity={0}/></linearGradient></defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 'bold'}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 'bold'}} />
                      <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                      <Area type="monotone" dataKey="profit" stroke="#dc2626" fillOpacity={1} fill="url(#colorProfit)" strokeWidth={3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-slate-50">
                <h3 className="text-lg font-black mb-6 flex items-center gap-2"><div className="w-2 h-2 bg-red-600 rounded-full"></div>تحليل الرحلات</h3>
                <div className="h-[250px] md:h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 'bold'}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 'bold'}} />
                      <Tooltip contentStyle={{borderRadius: '16px', border: 'none'}} />
                      <Bar dataKey="revenue" fill="#dc2626" radius={[4, 4, 0, 0]} barSize={24} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'passengers' && (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-500 pb-10">
            {/* Date Swiper Filter */}
            <div className="bg-white p-4 md:p-6 rounded-[2rem] shadow-sm overflow-hidden border border-slate-50">
               <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                 {availableDates.map(date => (
                   <button 
                     key={date} onClick={() => setPassengerFilterDate(date)}
                     className={`flex-shrink-0 px-5 py-3 rounded-2xl transition-all flex flex-col items-center ${
                       passengerFilterDate === date ? 'bg-red-600 text-white shadow-xl shadow-red-100 scale-105' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                     }`}
                   >
                     <span className="text-[9px] font-black uppercase">{getDayName(date)}</span>
                     <span className="text-xs font-black">{new Date(date).getDate()} {new Date(date).toLocaleDateString('ar-TN', {month: 'short'})}</span>
                   </button>
                 ))}
               </div>
            </div>

            {/* Registration Form Card */}
            <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-xl shadow-slate-100/50 border border-slate-100">
               <h3 className="text-xl font-black mb-6 flex items-center gap-3">
                 <div className="bg-red-50 p-2 rounded-xl text-red-600">{editingPassenger ? <Edit2 size={20}/> : <Plus size={20}/>}</div>
                 {editingPassenger ? 'تعديل حجز' : 'حجز جديد'}
               </h3>
               <PassengerForm 
                 initialData={editingPassenger} availableDates={availableDates}
                 vehicles={data.vehicles} passengers={data.passengers}
                 fixedVehicleId={userRole === 'driver' ? assignedVehicle?.id : undefined}
                 onSave={editingPassenger ? updatePassenger : addPassenger}
                 onCancel={() => setEditingPassenger(null)}
               />
            </div>

            {/* Mobile View: Passenger Cards */}
            <div className="space-y-6">
              {(userRole === 'owner' ? data.vehicles : (assignedVehicle ? [assignedVehicle] : [])).map(v => {
                const vPassengers = dailyPassengers.filter(p => p.vehicleId === v.id);
                const t2j = vPassengers.filter(p => p.direction === 'TunisToJelma').reduce((s, p) => s + p.seatsCount, 0);
                const j2t = vPassengers.filter(p => p.direction === 'JelmaToTunis').reduce((s, p) => s + p.seatsCount, 0);

                return (
                  <div key={v.id} className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center text-white"><Car size={16}/></div>
                        <span className="font-black text-slate-800">{v.plateNumber}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className={`text-[10px] font-black px-3 py-1 rounded-full ${t2j >= 8 ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>ذهاب: {t2j}/8</span>
                        <span className={`text-[10px] font-black px-3 py-1 rounded-full ${j2t >= 8 ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'}`}>إياب: {j2t}/8</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {vPassengers.length === 0 ? (
                        <div className="bg-slate-50 border border-dashed border-slate-200 rounded-[2rem] p-10 text-center text-slate-400 font-bold italic">لا توجد حجوزات اليوم</div>
                      ) : vPassengers.map(p => (
                        <div key={p.id} className="bg-white p-5 rounded-[2.5rem] shadow-sm border border-slate-50 relative overflow-hidden group">
                           {/* Ticket Design */}
                           <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-red-600 opacity-20 group-hover:opacity-100 transition-opacity"></div>
                           <div className="flex justify-between items-start mb-4">
                              <div>
                                <p className="text-lg font-black text-slate-900">{p.name}</p>
                                <div className="flex items-center gap-1.5 text-slate-400 font-bold text-xs mt-0.5">
                                  <Phone size={12}/> <span>{p.phone}</span>
                                </div>
                              </div>
                              <div className="bg-red-50 text-red-700 px-3 py-1.5 rounded-2xl text-[10px] font-black flex items-center gap-1">
                                 <Armchair size={14}/> {p.seatsCount} مقاعد
                              </div>
                           </div>
                           <div className="flex items-center justify-between py-3 border-y border-dashed border-slate-100 my-4">
                              <div className="flex items-center gap-2">
                                <MapPin size={12} className="text-red-500" />
                                <span className="text-[10px] font-black text-slate-600">
                                   {p.direction === 'TunisToJelma' ? 'تونس' : 'جلمة'}
                                </span>
                              </div>
                              <ArrowLeftRight size={14} className="text-slate-300" />
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-slate-600">
                                   {p.direction === 'TunisToJelma' ? 'جلمة' : 'تونس'}
                                </span>
                                <MapPin size={12} className="text-red-500" />
                              </div>
                           </div>
                           <div className="flex items-center justify-between">
                              <div className="flex gap-2">
                                <a href={`tel:${p.phone}`} className="p-3 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-100 transition"><Phone size={18}/></a>
                                <a href={`https://wa.me/${p.phone.replace(/^0/, '216')}`} className="p-3 bg-green-50 text-green-600 rounded-2xl hover:bg-green-100 transition"><MessageCircle size={18}/></a>
                              </div>
                              <div className="flex gap-2">
                                <button onClick={() => handleEditPassenger(p)} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:text-blue-600 transition"><Edit2 size={18}/></button>
                                <button onClick={() => removePassenger(p.id)} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:text-red-600 transition"><Trash2 size={18}/></button>
                              </div>
                           </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'trips' && (
           <div className="space-y-6 animate-in fade-in duration-500 pb-10">
             <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-50 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex gap-3 w-full md:w-auto">
                   <div className="flex-1">
                      <p className="text-[10px] font-black text-slate-400 mr-2 uppercase">من تاريخ</p>
                      <input type="date" value={tripStartDate} onChange={e => setTripStartDate(e.target.value)} className="w-full p-3 bg-slate-50 border-none rounded-2xl font-black text-xs outline-none focus:ring-2 focus:ring-red-100" />
                   </div>
                   <div className="flex-1">
                      <p className="text-[10px] font-black text-slate-400 mr-2 uppercase">إلى تاريخ</p>
                      <input type="date" value={tripEndDate} onChange={e => setTripEndDate(e.target.value)} className="w-full p-3 bg-slate-50 border-none rounded-2xl font-black text-xs outline-none focus:ring-2 focus:ring-red-100" />
                   </div>
                </div>
                <div className="bg-red-600 px-8 py-3 rounded-2xl text-white text-center w-full md:w-auto shadow-xl shadow-red-100">
                   <p className="text-[10px] font-black uppercase opacity-70">إجمالي الأرباح</p>
                   <p className="text-xl font-black">{filteredTrips.reduce((s,t) => s+t.netProfit, 0).toFixed(3)} د.ت</p>
                </div>
             </div>

             <div className="space-y-8">
               {(userRole === 'owner' ? data.vehicles : (assignedVehicle ? [assignedVehicle] : [])).map(v => {
                  const vTrips = filteredTrips.filter(t => t.vehicleId === v.id);
                  return (
                    <div key={v.id} className="space-y-4">
                       <div className="flex items-center gap-3 px-2">
                          <div className="w-2 h-6 bg-red-600 rounded-full"></div>
                          <h4 className="font-black text-slate-800">{v.plateNumber} — {v.model}</h4>
                       </div>
                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {vTrips.map(trip => (
                            <div key={trip.id} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-50 relative overflow-hidden group">
                               <div className="flex justify-between items-start mb-4">
                                  <div>
                                     <p className="text-xs font-black text-slate-400 uppercase">{getDayName(trip.date)}</p>
                                     <p className="text-sm font-black text-slate-800">{new Date(trip.date).toLocaleDateString('ar-TN')}</p>
                                  </div>
                                  <div className={`px-4 py-1.5 rounded-full text-xs font-black ${trip.netProfit > 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                     {trip.netProfit.toFixed(3)} د.ت
                                  </div>
                               </div>
                               <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-50">
                                  <div className="text-center">
                                     <p className="text-[9px] font-black text-slate-400 uppercase">المداخيل</p>
                                     <p className="text-xs font-black text-slate-800">{trip.revenue.toFixed(3)}</p>
                                  </div>
                                  <div className="text-center border-x border-slate-50">
                                     <p className="text-[9px] font-black text-slate-400 uppercase">الوقود</p>
                                     <p className="text-xs font-black text-orange-600">{trip.fuelCost.toFixed(3)}</p>
                                  </div>
                                  <div className="text-center">
                                     <p className="text-[9px] font-black text-slate-400 uppercase">السائق</p>
                                     <p className="text-xs font-black text-slate-500">{trip.driverShare.toFixed(3)}</p>
                                  </div>
                               </div>
                               {userRole === 'owner' && (
                                 <button 
                                   onClick={() => toggleTripVisibility(trip.id)}
                                   className={`mt-4 w-full py-2.5 rounded-xl text-[10px] font-black flex items-center justify-center gap-2 transition-all ${trip.visibleToDriver ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400'}`}
                                 >
                                   {trip.visibleToDriver ? <EyeIcon size={14}/> : <EyeOffIcon size={14}/>}
                                   {trip.visibleToDriver ? 'ظاهر للسائق' : 'مخفي عن السائق'}
                                 </button>
                               )}
                            </div>
                          ))}
                       </div>
                    </div>
                  )
               })}
             </div>
           </div>
        )}

        {activeTab === 'logTrip' && (
           <div className="animate-in slide-in-from-bottom-6 duration-500">
             <TripForm 
                vehicles={data.vehicles} fixedVehicleId={assignedVehicle?.id}
                onSave={(t) => { addTrip(t); setActiveTab('trips'); }}
                onCancel={() => setActiveTab('trips')}
             />
           </div>
        )}

        {/* Other tabs remain largely the same in logic but with updated container classes */}
        {(activeTab === 'vehicles' || activeTab === 'drivers' || activeTab === 'maintenance' || activeTab === 'settings') && (
           <div className="bg-white p-6 md:p-10 rounded-[3rem] shadow-sm border border-slate-50 animate-in fade-in duration-500">
              {activeTab === 'vehicles' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                   {data.vehicles.map(v => (
                     <div key={v.id} className="p-6 bg-slate-50 rounded-[2.5rem] border border-slate-100 space-y-4">
                        <div className="flex justify-between items-center">
                           <div className="bg-red-600 p-3 rounded-2xl text-white shadow-lg"><Car size={24}/></div>
                           <span className="bg-white px-4 py-1.5 rounded-full text-xs font-black text-slate-600 shadow-sm">{v.plateNumber}</span>
                        </div>
                        <h4 className="text-xl font-black text-slate-800">{v.model}</h4>
                        <div className="space-y-2">
                           <div className="flex justify-between text-xs font-bold text-slate-400"><span>المسافة المقطوعة</span> <span className="text-slate-900">{v.currentKM} كم</span></div>
                           <div className="w-full h-2 bg-white rounded-full overflow-hidden">
                              <div className="h-full bg-red-600" style={{width: `${Math.min(((v.currentKM - v.lastOilChangeKM)/data.settings.oilChangeInterval)*100, 100)}%`}}></div>
                           </div>
                        </div>
                     </div>
                   ))}
                   <AddVehicleForm onSave={addVehicle} />
                </div>
              )}
              {activeTab === 'drivers' && <AddDriverForm vehicles={data.vehicles} onSave={addDriver} data={data} removeDriver={removeDriver} />}
              {activeTab === 'settings' && <SettingsView settings={data.settings} updateSettings={updateSettings} />}
           </div>
        )}

      </main>
    </div>
  );
}

// --- Forms ---

const PassengerForm = ({ initialData, availableDates, vehicles, passengers, fixedVehicleId, onSave, onCancel }: any) => {
  const [form, setForm] = useState({ 
    id: initialData?.id || '', name: initialData?.name || '', phone: initialData?.phone || '', 
    direction: initialData?.direction || 'TunisToJelma', date: initialData?.date || availableDates[0], 
    vehicleId: fixedVehicleId || initialData?.vehicleId || (vehicles[0]?.id || ''), seatsCount: initialData?.seatsCount || 1
  });

  useEffect(() => { if (initialData) setForm({...initialData}); }, [initialData]);

  const takenSeats = passengers.filter(p => p.date === form.date && p.vehicleId === form.vehicleId && p.direction === form.direction && p.id !== form.id).reduce((s,p)=>s+p.seatsCount, 0);
  const remaining = 8 - takenSeats;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input placeholder="اسم المسافر" className="w-full p-5 bg-slate-50 rounded-[1.5rem] border-none font-bold outline-none focus:ring-4 focus:ring-red-100 transition-all" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
        <input placeholder="رقم الهاتف" className="w-full p-5 bg-slate-50 rounded-[1.5rem] border-none font-bold outline-none focus:ring-4 focus:ring-red-100 transition-all" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
        <select className="w-full p-5 bg-slate-50 rounded-[1.5rem] border-none font-black outline-none appearance-none" value={form.direction} onChange={e => setForm({...form, direction: e.target.value as any})}>
          <option value="TunisToJelma">من تونس إلى جلمة</option>
          <option value="JelmaToTunis">من جلمة إلى تونس</option>
        </select>
        <select className="w-full p-5 bg-slate-50 rounded-[1.5rem] border-none font-black outline-none" value={form.date} onChange={e => setForm({...form, date: e.target.value})}>
           {availableDates.map(d => <option key={d} value={d}>{getDayName(d)} - {new Date(d).getDate()}/{new Date(d).getMonth()+1}</option>)}
        </select>
      </div>

      <div className="p-6 bg-slate-50 rounded-[2.5rem] space-y-4">
         <p className="text-[10px] font-black text-slate-400 uppercase text-center">عدد المقاعد</p>
         <div className="flex flex-wrap justify-center gap-2">
            {[1,2,3,4,5,6,7,8].map(n => (
              <button key={n} onClick={() => setForm({...form, seatsCount: n})} disabled={n > remaining} className={`w-11 h-11 rounded-2xl font-black transition-all ${form.seatsCount === n ? 'bg-red-600 text-white shadow-lg' : n > remaining ? 'bg-slate-200 text-slate-300' : 'bg-white text-slate-500 border border-slate-100'}`}>
                {n}
              </button>
            ))}
         </div>
      </div>

      <div className="flex gap-2">
         {initialData && <button onClick={onCancel} className="flex-1 py-5 bg-slate-100 rounded-2xl font-black">إلغاء</button>}
         <button 
           onClick={() => { if(!form.name || !form.phone) return alert('أكمل البيانات'); onSave(form); if(!initialData) setForm({...form, name: '', phone: '', seatsCount: 1}); }}
           className="flex-[2] py-5 bg-red-600 text-white rounded-2xl font-black shadow-xl shadow-red-100"
         >
           {initialData ? 'تحديث الحجز' : 'تأكيد الحجز'}
         </button>
      </div>
    </div>
  );
};

const TripForm = ({ vehicles, fixedVehicleId, onSave, onCancel }: any) => {
  const [form, setForm] = useState({ vehicleId: fixedVehicleId || (vehicles[0]?.id || ''), date: new Date().toISOString().split('T')[0], revenue: 0, kmTraveled: 0, fuelCost: 0, expenses: 0 });
  return (
    <div className="bg-white p-8 md:p-12 rounded-[3rem] shadow-2xl space-y-8 border border-slate-50">
       <h3 className="text-2xl font-black">تسجيل رحلة مالية</h3>
       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2"><p className="text-xs font-black text-slate-400 mr-2">المداخيل د.ت</p><input type="number" step="0.001" className="w-full p-6 bg-red-50 rounded-3xl font-black text-3xl text-red-600 border-none outline-none" value={form.revenue || ''} onChange={e => setForm({...form, revenue: parseFloat(e.target.value)||0})} /></div>
          <div className="space-y-2"><p className="text-xs font-black text-slate-400 mr-2">الوقود د.ت</p><input type="number" step="0.001" className="w-full p-6 bg-orange-50 rounded-3xl font-black text-3xl text-orange-600 border-none outline-none" value={form.fuelCost || ''} onChange={e => setForm({...form, fuelCost: parseFloat(e.target.value)||0})} /></div>
          <div className="space-y-2"><p className="text-xs font-black text-slate-400 mr-2">المسافة كم</p><input type="number" className="w-full p-6 bg-slate-50 rounded-3xl font-black text-2xl outline-none" value={form.kmTraveled || ''} onChange={e => setForm({...form, kmTraveled: parseInt(e.target.value)||0})} /></div>
          <div className="space-y-2"><p className="text-xs font-black text-slate-400 mr-2">مصاريف أخرى</p><input type="number" className="w-full p-6 bg-slate-50 rounded-3xl font-black text-2xl outline-none" value={form.expenses || ''} onChange={e => setForm({...form, expenses: parseFloat(e.target.value)||0})} /></div>
       </div>
       <div className="flex gap-4">
          <button onClick={() => onSave(form)} className="flex-[2] py-6 bg-red-600 text-white rounded-3xl font-black shadow-2xl shadow-red-200 text-xl">حفظ العملية</button>
          <button onClick={onCancel} className="flex-1 py-6 bg-slate-100 text-slate-400 rounded-3xl font-black">إلغاء</button>
       </div>
    </div>
  );
};

const AddVehicleForm = ({ onSave }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const [f, setF] = useState({ plateNumber: '', model: '', currentKM: 0 });
  if (!isOpen) return <button onClick={() => setIsOpen(true)} className="p-8 border-2 border-dashed border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center gap-3 text-slate-400 hover:text-red-600 hover:border-red-200 transition-all"><Plus size={32}/><span className="font-black">إضافة سيارة</span></button>;
  return (
    <div className="p-8 bg-white rounded-[2.5rem] shadow-2xl border-2 border-red-500 space-y-4 animate-in zoom-in-90">
       <input placeholder="رقم اللوحة" className="w-full p-4 bg-slate-50 rounded-2xl font-black" value={f.plateNumber} onChange={e=>setF({...f, plateNumber: e.target.value})}/>
       <input placeholder="الموديل" className="w-full p-4 bg-slate-50 rounded-2xl font-black" value={f.model} onChange={e=>setF({...f, model: e.target.value})}/>
       <input type="number" placeholder="العداد الحالي" className="w-full p-4 bg-slate-50 rounded-2xl font-black" value={f.currentKM || ''} onChange={e=>setF({...f, currentKM: parseInt(e.target.value)||0})}/>
       <div className="flex gap-2">
          <button onClick={() => { onSave({...f, lastOilChangeKM: f.currentKM}); setIsOpen(false); }} className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-black">حفظ</button>
          <button onClick={() => setIsOpen(false)} className="px-6 py-4 text-slate-400 font-black">إلغاء</button>
       </div>
    </div>
  );
};

const AddDriverForm = ({ vehicles, onSave, data, removeDriver }: any) => {
  const [f, setF] = useState({ name: '', password: '', vehicleId: vehicles[0]?.id || '' });
  return (
    <div className="space-y-8">
       <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-slate-50 p-6 rounded-[2.5rem]">
          <div className="space-y-1"><p className="text-[10px] font-black text-slate-400 mr-2">الاسم</p><input className="w-full p-4 bg-white rounded-2xl font-black" value={f.name} onChange={e=>setF({...f, name: e.target.value})}/></div>
          <div className="space-y-1"><p className="text-[10px] font-black text-slate-400 mr-2">كلمة السر</p><input className="w-full p-4 bg-white rounded-2xl font-black" value={f.password} onChange={e=>setF({...f, password: e.target.value})}/></div>
          <div className="space-y-1"><p className="text-[10px] font-black text-slate-400 mr-2">السيارة</p><select className="w-full p-4 bg-white rounded-2xl font-black" value={f.vehicleId} onChange={e=>setF({...f, vehicleId: e.target.value})}>{vehicles.map((v:any)=><option key={v.id} value={v.id}>{v.plateNumber}</option>)}</select></div>
          <button onClick={() => onSave(f)} className="py-4 bg-red-600 text-white rounded-2xl font-black shadow-lg">إضافة</button>
       </div>
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.drivers.map((d:any) => (
            <div key={d.id} className="p-6 bg-white border border-slate-100 rounded-[2rem] flex justify-between items-center shadow-sm">
               <div><p className="font-black text-slate-800">{d.name}</p><p className="text-[10px] font-bold text-slate-400 uppercase">{vehicles.find((v:any)=>v.id===d.vehicleId)?.plateNumber}</p></div>
               <button onClick={() => removeDriver(d.id)} className="p-3 text-red-300 hover:text-red-600 transition"><Trash2 size={20}/></button>
            </div>
          ))}
       </div>
    </div>
  );
};

const SettingsView = ({ settings, updateSettings }: any) => (
  <div className="max-w-xl space-y-6">
     <div className="space-y-4">
        <label className="text-sm font-black text-slate-400 mr-2">كلمة مرور المالك</label>
        <input type="text" value={settings.ownerPassword} onChange={e => updateSettings({ownerPassword: e.target.value})} className="w-full p-5 bg-slate-50 rounded-[1.5rem] font-black" />
     </div>
     <div className="space-y-4">
        <label className="text-sm font-black text-slate-400 mr-2">تنبيه الصيانة كل (كم)</label>
        <input type="number" value={settings.oilChangeInterval} onChange={e => updateSettings({oilChangeInterval: parseInt(e.target.value)})} className="w-full p-5 bg-slate-50 rounded-[1.5rem] font-black" />
     </div>
  </div>
);