
import React, { useState, useEffect, useMemo } from 'react';
import * as Lucide from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import { 
  collection, onSnapshot, doc, setDoc, addDoc, updateDoc, deleteDoc, query, orderBy 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { db } from './firebase';
import { Vehicle, Trip, Passenger, Settings, AppData, UserRole, DriverAccount } from './types';
import { DEFAULT_SETTINGS, TRANSLATIONS } from './constants';

// --- Components ---

const MobileNavItem = ({ icon: Icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center justify-center flex-1 transition-all duration-300 ${active ? 'text-red-600 scale-110' : 'text-slate-400'}`}
  >
    <Icon size={24} strokeWidth={active ? 2.5 : 2} />
    <span className="text-[10px] font-bold mt-1">{label}</span>
  </button>
);

const StatCard = ({ title, value, icon: Icon, trend }: { title: string, value: string, icon: any, trend?: string }) => (
  <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100">
    <div className="flex justify-between items-start">
      <div className="bg-red-50 p-2 rounded-xl text-red-600"><Icon size={20} /></div>
      {trend && <span className="text-[10px] font-bold text-green-500">{trend}</span>}
    </div>
    <p className="text-slate-400 text-[10px] font-bold mt-3 uppercase">{title}</p>
    <p className="text-lg font-black text-slate-800">{value}</p>
  </div>
);

// --- Main App ---

export default function App() {
  const [userRole, setUserRole] = useState<UserRole>(() => (sessionStorage.getItem('role') as UserRole) || null);
  const [currentDriverId, setCurrentDriverId] = useState<string | null>(() => sessionStorage.getItem('driverId'));
  const [activeTab, setActiveTab] = useState('passengers');
  const [data, setData] = useState<AppData>({ vehicles: [], drivers: [], trips: [], passengers: [], settings: DEFAULT_SETTINGS });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Form States
  const [loginPass, setLoginPass] = useState('');
  const [loginUser, setLoginUser] = useState('');
  const [loginError, setLoginError] = useState('');

  const t = TRANSLATIONS.ar;

  useEffect(() => {
    const unsubV = onSnapshot(collection(db, "vehicles"), s => setData(p => ({ ...p, vehicles: s.docs.map(d => ({ ...d.data(), id: d.id } as Vehicle)) })));
    const unsubD = onSnapshot(collection(db, "drivers"), s => setData(p => ({ ...p, drivers: s.docs.map(d => ({ ...d.data(), id: d.id } as DriverAccount)) })));
    const unsubT = onSnapshot(query(collection(db, "trips"), orderBy("date", "desc")), s => setData(p => ({ ...p, trips: s.docs.map(d => ({ ...d.data(), id: d.id } as Trip)) })));
    const unsubP = onSnapshot(collection(db, "passengers"), s => setData(p => ({ ...p, passengers: s.docs.map(d => ({ ...d.data(), id: d.id } as Passenger)) })));
    const unsubS = onSnapshot(doc(db, "settings", "global"), s => {
      if (s.exists()) setData(p => ({ ...p, settings: s.data() as Settings }));
      setIsLoading(false);
    });
    return () => { unsubV(); unsubD(); unsubT(); unsubP(); unsubS(); };
  }, []);

  const loggedInDriver = useMemo(() => data.drivers.find(d => d.id === currentDriverId), [data.drivers, currentDriverId]);
  const assignedVehicle = useMemo(() => loggedInDriver ? data.vehicles.find(v => v.id === loggedInDriver.vehicleId) : null, [data.vehicles, loggedInDriver]);

  const handleLogin = (role: 'owner' | 'driver') => {
    if (role === 'owner') {
      if (loginPass === data.settings.ownerPassword) {
        setUserRole('owner');
        sessionStorage.setItem('role', 'owner');
        setActiveTab('dashboard');
      } else setLoginError('كلمة المرور خاطئة');
    } else {
      const driver = data.drivers.find(d => d.name === loginUser && d.password === loginPass);
      if (driver) {
        setUserRole('driver');
        setCurrentDriverId(driver.id);
        sessionStorage.setItem('role', 'driver');
        sessionStorage.setItem('driverId', driver.id);
        setActiveTab('passengers');
      } else setLoginError('بيانات الدخول غير صحيحة');
    }
  };

  const logout = () => {
    setUserRole(null);
    sessionStorage.clear();
  };

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Lucide.Loader2 className="animate-spin text-red-600" size={40} />
    </div>
  );

  if (!userRole) return (
    <div className="min-h-screen bg-slate-50 p-6 flex flex-col justify-center font-['Cairo']">
      <div className="text-center mb-10">
        <div className="inline-block bg-red-600 p-4 rounded-3xl text-white shadow-2xl mb-4">
          <Lucide.Car size={48} />
        </div>
        <h1 className="text-3xl font-black text-slate-900 uppercase">Zed.m Louage</h1>
        <p className="text-slate-400 font-bold">Cloud Pro Management</p>
      </div>

      <div className="bg-white p-8 rounded-[2.5rem] shadow-xl space-y-6">
        <div className="flex bg-slate-100 p-1 rounded-2xl">
          <button onClick={() => setLoginUser('')} className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${!loginUser ? 'bg-white shadow-sm text-red-600' : 'text-slate-500'}`}>صاحب السيارة</button>
          <button onClick={() => setLoginUser('driver')} className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${loginUser ? 'bg-white shadow-sm text-red-600' : 'text-slate-500'}`}>سائق</button>
        </div>

        {loginUser && (
          <input 
            type="text" placeholder="اسم المستخدم" 
            className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none font-bold text-sm focus:ring-2 focus:ring-red-100"
            value={loginUser === 'driver' ? '' : loginUser} onChange={e => setLoginUser(e.target.value)}
          />
        )}
        <input 
          type="password" placeholder="كلمة المرور" 
          className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none font-bold text-sm tracking-widest focus:ring-2 focus:ring-red-100"
          value={loginPass} onChange={e => setLoginPass(e.target.value)}
        />
        {loginError && <p className="text-red-500 text-[10px] font-bold text-center">{loginError}</p>}
        <button 
          onClick={() => handleLogin(loginUser ? 'driver' : 'owner')}
          className="w-full bg-red-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-red-100 active:scale-95 transition-all"
        >دخول النظام</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-24 font-['Cairo']">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-40 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-black text-slate-900 leading-none">
            {activeTab === 'dashboard' ? 'الرئيسية' : activeTab === 'passengers' ? 'الحجوزات' : 'المحاسبة'}
          </h2>
          <span className="text-[10px] font-bold text-red-600 uppercase">Zed.m Pro</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-left">
            <p className="text-[10px] font-black text-slate-400 uppercase leading-none">مرحباً</p>
            <p className="text-xs font-bold text-slate-800">{userRole === 'owner' ? 'المدير' : loggedInDriver?.name}</p>
          </div>
          <button onClick={() => setIsMenuOpen(true)} className="p-2 bg-slate-100 rounded-xl text-slate-600">
            <Lucide.Menu size={20} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        {activeTab === 'dashboard' && userRole === 'owner' && (
          <div className="space-y-6 animate-slide-up">
            <div className="grid grid-cols-2 gap-4">
              <StatCard title="المداخيل" value={`${data.trips.reduce((s,t)=>s+t.revenue, 0).toFixed(2)}`} icon={Lucide.TrendingUp} />
              <StatCard title="الصافي" value={`${data.trips.reduce((s,t)=>s+t.netProfit, 0).toFixed(2)}`} icon={Lucide.Wallet} />
            </div>

            <div className="bg-white p-6 rounded-[2.5rem] shadow-sm">
               <h3 className="text-sm font-black mb-6">تطور الأرباح (آخر 7 رحلات)</h3>
               <div className="h-48 w-full">
                 <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.trips.slice(0, 7).reverse()}>
                       <defs><linearGradient id="colorP" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#dc2626" stopOpacity={0.1}/><stop offset="95%" stopColor="#dc2626" stopOpacity={0}/></linearGradient></defs>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                       <XAxis dataKey="date" hide />
                       <Tooltip contentStyle={{borderRadius:'12px', border:'none'}} />
                       <Area type="monotone" dataKey="netProfit" stroke="#dc2626" fillOpacity={1} fill="url(#colorP)" strokeWidth={3} />
                    </AreaChart>
                 </ResponsiveContainer>
               </div>
            </div>
          </div>
        )}

        {activeTab === 'passengers' && (
          <div className="space-y-6 animate-slide-up">
            <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
               <div className="flex justify-between items-center mb-6">
                 <h3 className="font-black">حجز جديد</h3>
                 <span className="text-[10px] bg-red-50 text-red-600 px-3 py-1 rounded-full font-bold">{selectedDate}</span>
               </div>
               <PassengerForm 
                 vehicles={data.vehicles} 
                 fixedId={assignedVehicle?.id} 
                 onSave={async (p) => { await addDoc(collection(db, "passengers"), p); }} 
               />
            </div>

            <div className="space-y-4">
              <h4 className="font-black text-sm text-slate-500 px-2">قائمة الركاب اليوم</h4>
              {data.passengers.filter(p => p.date === selectedDate).length === 0 ? (
                <div className="p-10 text-center text-slate-300 italic font-bold">لا توجد حجوزات اليوم</div>
              ) : (
                data.passengers.filter(p => p.date === selectedDate).map(p => (
                  <div key={p.id} className="bg-white p-5 rounded-3xl border border-slate-100 flex justify-between items-center shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-2xl ${p.direction === 'TunisToJelma' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                        <Lucide.User size={20} />
                      </div>
                      <div>
                        <p className="font-black text-slate-800 leading-none">{p.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 mt-1">{p.phone}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                       <span className="bg-red-50 text-red-600 px-3 py-1 rounded-xl text-xs font-black">{p.seatsCount} م</span>
                       <a href={`tel:${p.phone}`} className="p-2 bg-slate-50 rounded-xl text-slate-400"><Lucide.Phone size={16}/></a>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'trips' && (
           <div className="space-y-6 animate-slide-up">
              {userRole === 'driver' && <TripForm vehicleId={assignedVehicle?.id || ''} onSave={async (t) => {
                 const driverShare = t.revenue * (data.settings.driverPercentage / 100);
                 const netProfit = t.revenue - driverShare - t.fuelCost - t.expenses;
                 await addDoc(collection(db, "trips"), { ...t, driverShare, netProfit, visibleToDriver: true });
                 setActiveTab('dashboard');
              }} />}
              
              <div className="space-y-4">
                 <h4 className="font-black text-sm text-slate-500 px-2">آخر العمليات المالية</h4>
                 {data.trips.map(t => (
                   <div key={t.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                      <div className="flex justify-between items-start">
                         <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase">{t.date}</p>
                            <p className="font-black text-slate-800">{t.revenue.toFixed(2)} د.ت</p>
                         </div>
                         <div className={`px-3 py-1 rounded-xl text-[10px] font-black ${t.netProfit > 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                           صافي: {t.netProfit.toFixed(2)}
                         </div>
                      </div>
                   </div>
                 ))}
              </div>
           </div>
        )}
      </main>

      {/* Bottom Nav */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-100 bottom-nav px-8 flex justify-between z-40">
        {userRole === 'owner' && <MobileNavItem icon={Lucide.LayoutDashboard} label="الرئيسية" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />}
        <MobileNavItem icon={Lucide.Users} label="الركاب" active={activeTab === 'passengers'} onClick={() => setActiveTab('passengers')} />
        <MobileNavItem icon={Lucide.History} label="المالية" active={activeTab === 'trips'} onClick={() => setActiveTab('trips')} />
        <MobileNavItem icon={Lucide.Settings} label="الإعدادات" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
      </footer>

      {/* Drawer Menu */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsMenuOpen(false)}>
           <div className="absolute left-0 right-0 bottom-0 bg-white rounded-t-[3rem] p-8 space-y-4 animate-slide-up" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                 <h3 className="font-black text-lg">خيارات النظام</h3>
                 <button onClick={() => setIsMenuOpen(false)} className="p-2 bg-slate-100 rounded-full"><Lucide.X size={20}/></button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 {userRole === 'owner' && (
                   <>
                     <button className="flex flex-col items-center gap-2 p-6 bg-slate-50 rounded-3xl font-bold text-sm"><Lucide.Car className="text-red-600"/> الأسطول</button>
                     <button className="flex flex-col items-center gap-2 p-6 bg-slate-50 rounded-3xl font-bold text-sm"><Lucide.ShieldCheck className="text-red-600"/> السائقين</button>
                   </>
                 )}
                 <button onClick={logout} className="flex flex-col items-center gap-2 p-6 bg-red-50 text-red-600 rounded-3xl font-black text-sm col-span-2"><Lucide.LogOut/> تسجيل الخروج</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}

// --- Sub-Forms ---

const PassengerForm = ({ vehicles, fixedId, onSave }: any) => {
  const [f, setF] = useState({ name: '', phone: '', seatsCount: 1, direction: 'TunisToJelma', vehicleId: fixedId || (vehicles[0]?.id || ''), date: new Date().toISOString().split('T')[0] });
  return (
    <div className="space-y-4">
      <input placeholder="اسم المسافر" className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none font-bold" value={f.name} onChange={e=>setF({...f, name: e.target.value})} />
      <input placeholder="رقم الهاتف" className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none font-bold" value={f.phone} onChange={e=>setF({...f, phone: e.target.value})} />
      <div className="flex gap-2">
        <select className="flex-1 p-4 bg-slate-50 rounded-2xl font-bold" value={f.direction} onChange={e=>setF({...f, direction: e.target.value as any})}>
           <option value="TunisToJelma">تونس ➔ جلمة</option>
           <option value="JelmaToTunis">جلمة ➔ تونس</option>
        </select>
        <div className="flex items-center gap-2 bg-slate-50 px-4 rounded-2xl">
           <button onClick={() => setF({...f, seatsCount: Math.max(1, f.seatsCount-1)})} className="text-red-600 font-black">-</button>
           <span className="font-black text-sm px-2">{f.seatsCount}</span>
           <button onClick={() => setF({...f, seatsCount: Math.min(8, f.seatsCount+1)})} className="text-red-600 font-black">+</button>
        </div>
      </div>
      {!fixedId && (
        <select className="w-full p-4 bg-slate-50 rounded-2xl font-bold" value={f.vehicleId} onChange={e=>setF({...f, vehicleId: e.target.value})}>
           {vehicles.map((v:any)=><option key={v.id} value={v.id}>{v.plateNumber}</option>)}
        </select>
      )}
      <button onClick={() => { if(!f.name || !f.phone) return alert('أكمل البيانات'); onSave(f); setF({...f, name:'', phone:''}); }} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black">تأكيد الحجز</button>
    </div>
  );
};

const TripForm = ({ vehicleId, onSave }: any) => {
  const [f, setF] = useState({ revenue: 0, fuelCost: 0, kmTraveled: 0, expenses: 0, date: new Date().toISOString().split('T')[0], vehicleId });
  return (
    <div className="bg-white p-6 rounded-[2.5rem] shadow-sm space-y-6">
       <h3 className="font-black">تسجيل رحلة مالية</h3>
       <div className="space-y-4">
          <div className="flex gap-4">
             <div className="flex-1"><p className="text-[10px] font-black text-slate-400 mb-1">المداخيل</p><input type="number" className="w-full p-4 bg-red-50 text-red-600 rounded-2xl font-black text-xl" value={f.revenue || ''} onChange={e=>setF({...f, revenue: parseFloat(e.target.value)||0})} /></div>
             <div className="flex-1"><p className="text-[10px] font-black text-slate-400 mb-1">الوقود</p><input type="number" className="w-full p-4 bg-orange-50 text-orange-600 rounded-2xl font-black text-xl" value={f.fuelCost || ''} onChange={e=>setF({...f, fuelCost: parseFloat(e.target.value)||0})} /></div>
          </div>
          <input type="number" placeholder="المسافة المقطوعة (كم)" className="w-full p-4 bg-slate-50 rounded-2xl font-bold" value={f.kmTraveled || ''} onChange={e=>setF({...f, kmTraveled: parseInt(e.target.value)||0})} />
          <button onClick={() => onSave(f)} className="w-full bg-red-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-red-100">حفظ الرحلة</button>
       </div>
    </div>
  );
};
