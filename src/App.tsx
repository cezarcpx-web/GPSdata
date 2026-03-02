import React, { useState, useEffect } from 'react';
import { 
  Cloud, 
  CloudRain, 
  Droplets, 
  Wind, 
  AlertTriangle, 
  Info, 
  ShieldAlert, 
  BarChart3, 
  History, 
  Settings, 
  Download,
  Navigation,
  Thermometer,
  Waves,
  ChevronRight,
  Menu,
  X,
  Plus,
  Lock,
  Unlock
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  BarChart,
  Bar
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from './lib/utils';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// --- Types ---
interface WeatherData {
  current: {
    temp: number;
    feels_like: number;
    humidity: number;
    wind_speed: number;
    rain_1h?: number;
    description: string;
  };
  forecast: Array<{
    date: string;
    temp_min: number;
    temp_max: number;
    rain: number;
    description: string;
  }>;
}

interface FloodRisk {
  risk: string;
  color: string;
  rain24h: number;
  rain48h: number;
  rain72h: number;
  riverLevel: number;
  trend: string;
}

interface Alert {
  id: number;
  timestamp: string;
  level: 'info' | 'warning' | 'danger';
  message: string;
}

// --- Components ---

const SidebarItem = ({ icon: Icon, label, active, onClick }: { icon: any, label: string, active?: boolean, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className={cn(
      "flex items-center w-full gap-4 px-6 py-4 text-sm transition-all duration-500 rounded-2xl group relative overflow-hidden",
      active 
        ? "bg-blue-600 text-white shadow-2xl shadow-blue-600/20" 
        : "text-slate-500 hover:bg-slate-800/50 hover:text-white"
    )}
  >
    {active && (
      <motion.div 
        layoutId="sidebar-active"
        className="absolute inset-0 bg-blue-600 -z-10"
        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
      />
    )}
    <Icon size={18} className={cn("transition-all duration-500", active ? "scale-110 rotate-3" : "group-hover:scale-110 group-hover:-rotate-3")} />
    <span className={cn("font-medium tracking-tight transition-all duration-300", active ? "font-black translate-x-1" : "font-medium group-hover:translate-x-1")}>{label}</span>
  </button>
);

const StatCard = ({ icon: Icon, label, value, unit, color = "blue" }: { icon: any, label: string, value: string | number, unit?: string, color?: string }) => (
  <div className="bento-item group relative overflow-hidden">
    <div className={cn(
      "absolute -right-8 -top-8 w-24 h-24 rounded-full blur-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-1000",
      `bg-${color}-500`
    )} />
    <div className="flex items-center justify-between mb-6 relative z-10">
      <div className={cn("p-4 rounded-2xl transition-all duration-700 group-hover:scale-110 group-hover:rotate-6 shadow-sm", `bg-${color}-500/10 text-${color}-600`)}>
        <Icon size={20} />
      </div>
      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">{label}</span>
    </div>
    <div className="flex items-baseline gap-1 relative z-10">
      <span className="text-5xl font-black tracking-tighter text-white mono group-hover:scale-105 transition-transform duration-500 origin-left">{value}</span>
      {unit && <span className="text-sm font-black text-slate-500 uppercase tracking-widest ml-1">{unit}</span>}
    </div>
  </div>
);

const ReportTemplate = ({ weather, floodRisk, alerts, history }: { weather: WeatherData | null, floodRisk: FloodRisk | null, alerts: Alert[], history: any[] }) => (
  <div id="pdf-report" className="p-10 bg-white text-slate-900 w-[800px] absolute -left-[9999px] top-0">
    {/* Header */}
    <div className="flex justify-between items-center border-b-2 border-slate-900 pb-6 mb-8">
      <div>
        <h1 className="text-3xl font-black uppercase tracking-tighter">Relatório de Monitoramento</h1>
        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Defesa Civil - Ubá / MG</p>
      </div>
      <div className="text-right">
        <p className="text-xs font-bold text-slate-500 uppercase">Data de Emissão</p>
        <p className="text-lg font-bold">{format(new Date(), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: ptBR })}</p>
      </div>
    </div>

    {/* Risk Status */}
    {floodRisk && (
      <div className={cn(
        "p-6 rounded-xl mb-8 border-2",
        floodRisk.color === 'red' ? "bg-red-50 border-red-500 text-red-700" :
        floodRisk.color === 'orange' ? "bg-orange-50 border-orange-500 text-orange-700" :
        floodRisk.color === 'yellow' ? "bg-yellow-50 border-yellow-500 text-yellow-700" :
        "bg-emerald-50 border-emerald-500 text-emerald-700"
      )}>
        <h2 className="text-xl font-black uppercase mb-2">Status de Risco: {floodRisk.risk}</h2>
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="bg-white/50 p-3 rounded-lg">
            <p className="text-[10px] font-bold uppercase opacity-60">Nível do Rio Ubá</p>
            <p className="text-xl font-black">{floodRisk.riverLevel.toFixed(2)}m</p>
          </div>
          <div className="bg-white/50 p-3 rounded-lg">
            <p className="text-[10px] font-bold uppercase opacity-60">Chuva 24h</p>
            <p className="text-xl font-black">{floodRisk.rain24h.toFixed(1)}mm</p>
          </div>
          <div className="bg-white/50 p-3 rounded-lg">
            <p className="text-[10px] font-bold uppercase opacity-60">Tendência</p>
            <p className="text-xl font-black">{floodRisk.trend}</p>
          </div>
        </div>
      </div>
    )}

    {/* Current Weather */}
    <div className="mb-8">
      <h3 className="text-sm font-black uppercase tracking-widest mb-4 border-b border-slate-200 pb-2">Condições Atuais</h3>
      <div className="grid grid-cols-4 gap-4">
        <div className="border border-slate-200 p-4 rounded-xl">
          <p className="text-[10px] font-bold text-slate-500 uppercase">Temperatura</p>
          <p className="text-xl font-bold">{weather?.current?.temp ?? '--'}°C</p>
        </div>
        <div className="border border-slate-200 p-4 rounded-xl">
          <p className="text-[10px] font-bold text-slate-500 uppercase">Umidade</p>
          <p className="text-xl font-bold">{weather?.current?.humidity ?? '--'}%</p>
        </div>
        <div className="border border-slate-200 p-4 rounded-xl">
          <p className="text-[10px] font-bold text-slate-500 uppercase">Vento</p>
          <p className="text-xl font-bold">{weather?.current?.wind_speed ?? '--'} km/h</p>
        </div>
        <div className="border border-slate-200 p-4 rounded-xl">
          <p className="text-[10px] font-bold text-slate-500 uppercase">Condição</p>
          <p className="text-sm font-bold uppercase">{weather?.current?.description ?? '--'}</p>
        </div>
      </div>
    </div>

    {/* Active Alerts */}
    <div className="mb-8">
      <h3 className="text-sm font-black uppercase tracking-widest mb-4 border-b border-slate-200 pb-2">Alertas Ativos</h3>
      <div className="space-y-3">
        {alerts.length > 0 ? alerts.map((alert: any) => (
          <div key={alert.id} className="p-4 border border-slate-200 rounded-xl bg-slate-50">
            <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">{format(new Date(alert.timestamp), 'dd/MM HH:mm')}</p>
            <p className="font-bold text-sm">{alert.message}</p>
          </div>
        )) : (
          <p className="text-sm text-slate-500 italic">Nenhum alerta ativo no momento.</p>
        )}
      </div>
    </div>

    {/* History Summary */}
    <div>
      <h3 className="text-sm font-black uppercase tracking-widest mb-4 border-b border-slate-200 pb-2">Histórico Recente (Chuva)</h3>
      <div className="flex items-end gap-2 h-40 pt-10">
        {history.slice(-15).map((h: any, i: number) => (
          <div key={i} className="flex-1 flex flex-col items-center">
            <div className="w-full bg-blue-500 rounded-t-sm relative" style={{ height: `${Math.max(4, h.rain * 1.5)}px` }}>
              <span className="absolute -top-5 left-0 right-0 text-[8px] font-bold text-center">{h.rain.toFixed(0)}</span>
            </div>
            <p className="text-[8px] font-bold text-slate-400 mt-2 rotate-45 origin-left">{format(new Date(h.date), 'dd/MM')}</p>
          </div>
        ))}
      </div>
    </div>

    <div className="mt-20 pt-6 border-t border-slate-200 text-center">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Relatório gerado automaticamente pelo Sistema de Monitoramento de Ubá</p>
      <p className="text-[8px] text-slate-300 mt-1">Este documento tem caráter informativo e deve ser validado pela autoridade competente.</p>
    </div>
  </div>
);

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [floodRisk, setFloodRisk] = useState<FloodRisk | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [token, setToken] = useState<string | null>(localStorage.getItem('admin_token'));
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: loginPassword })
      });
      if (res.ok) {
        const data = await res.json();
        setToken(data.token);
        localStorage.setItem('admin_token', data.token);
        setLoginPassword('');
      } else {
        setLoginError('Senha incorreta. Acesso negado.');
      }
    } catch (err) {
      setLoginError('Erro ao conectar ao servidor.');
    }
  };

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem('admin_token');
    setActiveTab('dashboard');
  };

  // Admin state
  const [adminRain, setAdminRain] = useState('');
  const [adminRiver, setAdminRiver] = useState('');
  const [adminAlert, setAdminAlert] = useState('');
  const [adminAlertLevel, setAdminAlertLevel] = useState('info');

  const fetchData = async () => {
    try {
      const [wRes, fRes, aRes, hRes] = await Promise.all([
        fetch('/api/weather'),
        fetch('/api/flood-risk'),
        fetch('/api/alerts'),
        fetch('/api/history')
      ]);
      
      setWeather(await wRes.json());
      setFloodRisk(await fRes.json());
      setAlerts(await aRes.json());
      setHistory(await hRes.json());
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 300000); // 5 mins
    return () => clearInterval(interval);
  }, []);

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/reading', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ rainfall_24h: Number(adminRain), river_level: Number(adminRiver) })
    });
    if (res.status === 401) {
      handleLogout();
      return;
    }
    setAdminRain('');
    setAdminRiver('');
    fetchData();
  };

  const handleAlertSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/alert', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ level: adminAlertLevel, message: adminAlert })
    });
    if (res.status === 401) {
      handleLogout();
      return;
    }
    setAdminAlert('');
    fetchData();
  };

  const exportPDF = async () => {
    const element = document.getElementById('pdf-report');
    if (!element) return;
    
    // Temporarily make it visible for capture but off-screen
    element.style.position = 'relative';
    element.style.left = '0';
    
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff'
    });
    
    element.style.position = 'absolute';
    element.style.left = '-9999px';

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`relatorio-defesa-civil-uba-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#020617] text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-bold animate-pulse">Carregando dados de Ubá...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#020617] text-white font-sans selection:bg-blue-500/30 selection:text-blue-200 relative">
      <div className="noise" />
      
      {/* Sidebar Mobile Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-slate-900/10 lg:hidden backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-80 bg-slate-900 border-r border-slate-800 transition-all duration-700 ease-in-out lg:relative lg:translate-x-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full p-10">
          <div className="flex items-center gap-5 mb-20 group cursor-default">
            <div className="bg-blue-600 p-4 rounded-[1.5rem] shadow-2xl shadow-blue-600/30 transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110">
              <ShieldAlert className="text-white" size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white leading-none tracking-tighter serif italic">DEFESA CIVIL</h1>
              <p className="text-[10px] text-slate-500 font-black tracking-[0.4em] uppercase mt-2">Ubá / MG</p>
            </div>
          </div>

          <nav className="flex-1 space-y-4">
            <SidebarItem 
              icon={BarChart3} 
              label="Dashboard" 
              active={activeTab === 'dashboard'} 
              onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }} 
            />
            <SidebarItem 
              icon={History} 
              label="Histórico" 
              active={activeTab === 'history'} 
              onClick={() => { setActiveTab('history'); setIsSidebarOpen(false); }} 
            />
            <SidebarItem 
              icon={token ? Unlock : Lock} 
              label="Administração" 
              active={activeTab === 'admin'} 
              onClick={() => { setActiveTab('admin'); setIsSidebarOpen(false); }} 
            />
          </nav>

          {token && (
            <div className="mt-auto pt-6 border-t border-slate-800">
              <button 
                onClick={handleLogout}
                className="flex items-center w-full gap-4 px-6 py-4 text-sm text-red-400 hover:bg-red-500/10 rounded-2xl transition-all duration-300 font-bold uppercase tracking-widest"
              >
                <X size={18} />
                Sair do Sistema
              </button>
            </div>
          )}

          <div className="mt-auto pt-10 space-y-6">
            {/* System Health Widget */}
            <div className="p-6 bg-slate-800/50 rounded-[2rem] border border-slate-800">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">System Health</span>
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <div className="space-y-3">
                <div className="h-1 w-full bg-slate-700 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: "98%" }}
                    className="h-full bg-emerald-500"
                  />
                </div>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">98.2% Uptime</p>
              </div>
            </div>

            <div className="p-6 bg-slate-800/50 rounded-[2rem] border border-slate-800 group cursor-pointer hover:shadow-2xl hover:shadow-slate-900/50 transition-all duration-500">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-sm font-black text-slate-400 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">CZ</div>
                <div className="overflow-hidden">
                  <p className="text-sm font-black text-white truncate tracking-tight">Cezar P.</p>
                  <p className="text-[10px] text-slate-500 font-bold truncate uppercase tracking-[0.2em] mt-0.5">Operador</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#020617]">
        <ReportTemplate weather={weather} floodRisk={floodRisk} alerts={alerts} history={history} />
        {/* Header */}
        <header className="h-28 flex items-center justify-between px-12 bg-slate-900/40 border-b border-slate-800 backdrop-blur-2xl sticky top-0 z-30">
          <div className="flex items-center gap-8">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-4 lg:hidden text-slate-400 hover:text-white bg-slate-800 rounded-2xl transition-all shadow-sm"
            >
              <Menu size={20} />
            </button>
            <div>
              <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em] mb-2">
                {activeTab === 'dashboard' ? 'Real-time Analytics' : activeTab === 'history' ? 'Historical Archive' : 'System Control'}
              </h2>
              <p className="text-3xl font-black text-white tracking-tighter serif italic leading-none">
                {activeTab === 'dashboard' ? 'Monitoramento em Tempo Real' : activeTab === 'history' ? 'Histórico Climático' : 'Painel Administrativo'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-8">
            <div className="hidden xl:flex flex-col items-end">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Local Time (Ubá)</p>
              <p className="text-sm font-black text-white mono">{format(new Date(), 'HH:mm', { locale: ptBR })}</p>
            </div>
            <div className="h-10 w-px bg-slate-800" />
            <button 
              onClick={exportPDF}
              className="flex items-center gap-4 px-8 py-4 text-xs font-black bg-blue-600 hover:bg-blue-700 text-white rounded-2xl transition-all shadow-2xl shadow-blue-600/20 active:scale-95 group"
            >
              <Download size={18} className="group-hover:-translate-y-1 transition-transform" />
              <span className="hidden sm:inline uppercase tracking-[0.2em]">Exportar PDF</span>
            </button>
          </div>
        </header>

        <div className="p-12 overflow-y-auto flex-1 scroll-smooth" id="dashboard-content">
          {activeTab === 'dashboard' && (
            <div className="space-y-12 max-w-7xl mx-auto">
              {/* Risk Alert Banner */}
              {floodRisk && (
                <motion.div 
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className={cn(
                    "p-12 rounded-[4rem] border flex flex-col md:flex-row items-center justify-between gap-12 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] relative overflow-hidden group",
                    floodRisk.color === 'red' ? "bg-red-950/40 border-red-900/50 text-red-200" :
                    floodRisk.color === 'orange' ? "bg-orange-950/40 border-orange-900/50 text-orange-200" :
                    floodRisk.color === 'yellow' ? "bg-yellow-950/40 border-yellow-900/50 text-yellow-200" :
                    "bg-emerald-950/40 border-emerald-900/50 text-emerald-200"
                  )}
                >
                  {/* Dramatic decorative background element */}
                  <div className={cn(
                    "absolute -right-20 -top-20 w-96 h-96 rounded-full blur-[100px] opacity-20 transition-all duration-1000 group-hover:scale-150 group-hover:opacity-30",
                    floodRisk.color === 'red' ? "bg-red-500" :
                    floodRisk.color === 'orange' ? "bg-orange-500" :
                    floodRisk.color === 'yellow' ? "bg-yellow-500" :
                    "bg-emerald-500"
                  )} />

                  <div className="flex items-center gap-10 relative z-10">
                    <div className={cn(
                      "p-8 rounded-[2.5rem] shadow-2xl transition-all duration-700 group-hover:rotate-12 group-hover:scale-110 animate-float",
                      floodRisk.color === 'red' ? "bg-red-600 text-white shadow-red-600/30" :
                      floodRisk.color === 'orange' ? "bg-orange-600 text-white shadow-orange-600/30" :
                      floodRisk.color === 'yellow' ? "bg-yellow-600 text-white shadow-yellow-600/30" :
                      "bg-emerald-600 text-white shadow-emerald-600/30"
                    )}>
                      <AlertTriangle size={48} />
                    </div>
                    <div>
                      <h3 className="text-7xl font-black uppercase italic tracking-tighter serif leading-none mb-3 group-hover:tracking-normal transition-all duration-700">Risco: {floodRisk.risk}</h3>
                      <p className="text-sm font-black opacity-40 uppercase tracking-[0.4em]">Monitoramento Hidrológico Ativo</p>
                    </div>
                  </div>
                  <div className="flex gap-8 relative z-10">
                    <div className="text-center px-10 py-8 bg-slate-900/40 rounded-[3rem] backdrop-blur-2xl border border-white/10 shadow-xl shadow-black/20 hover:scale-105 transition-transform duration-500">
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 mb-3">Nível do Rio</p>
                      <p className="text-5xl font-black mono tracking-tighter text-white">{floodRisk.riverLevel.toFixed(2)}m</p>
                    </div>
                    <div className="text-center px-10 py-8 bg-slate-900/40 rounded-[3rem] backdrop-blur-2xl border border-white/10 shadow-xl shadow-black/20 hover:scale-105 transition-transform duration-500">
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 mb-3">Chuva 24h</p>
                      <p className="text-5xl font-black mono tracking-tighter text-white">{floodRisk.rain24h.toFixed(1)}mm</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Main Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                {/* Weather Stats */}
                <div className="lg:col-span-8 space-y-12">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
                    <StatCard icon={Thermometer} label="Temp. Atual" value={weather?.current?.temp ?? '--'} unit="°C" />
                    <StatCard icon={Droplets} label="Umidade" value={weather?.current?.humidity ?? '--'} unit="%" color="emerald" />
                    <StatCard icon={Wind} label="Vento" value={weather?.current?.wind_speed ?? '--'} unit="km/h" color="slate" />
                    <StatCard icon={CloudRain} label="Precipitação" value={weather?.current?.rain_1h ?? '0'} unit="mm" color="blue" />
                  </div>

                  {/* Precipitation Chart */}
                  <div className="bento-item !p-12 relative overflow-hidden group">
                    <div className="absolute -right-20 -top-20 w-80 h-80 bg-blue-500/5 rounded-full blur-[100px] transition-all duration-1000 group-hover:scale-150" />
                    <div className="flex items-center justify-between mb-12 relative z-10">
                      <div>
                        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-3">Análise de Dados</h3>
                        <p className="text-4xl font-black text-white tracking-tighter serif italic leading-none">Tendência de Precipitação</p>
                      </div>
                      <div className="flex gap-3">
                        <div className="px-6 py-3 bg-slate-800 rounded-2xl text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border border-slate-700 shadow-sm">Próximas 24h</div>
                      </div>
                    </div>
                    <div className="h-[400px] w-full relative z-10">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={weather?.forecast || []}>
                          <defs>
                            <linearGradient id="colorRain" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                          <XAxis 
                            dataKey="date" 
                            tickFormatter={(val) => format(new Date(val), 'HH:mm', { locale: ptBR })}
                            stroke="#94a3b8"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            dy={15}
                            tick={{ fontWeight: 800, letterSpacing: '1px' }}
                          />
                          <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} dx={-15} tick={{ fontWeight: 800 }} />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'rgba(255, 255, 255, 0.9)', 
                              border: '1px solid #f1f5f9', 
                              borderRadius: '24px', 
                              boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.1)',
                              backdropFilter: 'blur(10px)',
                              padding: '20px'
                            }}
                            itemStyle={{ color: '#0f172a', fontWeight: 900, fontSize: '14px' }}
                            labelStyle={{ color: '#94a3b8', fontWeight: 900, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}
                            cursor={{ stroke: '#3b82f6', strokeWidth: 2, strokeDasharray: '5 5' }}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="rain" 
                            stroke="#3b82f6" 
                            fillOpacity={1} 
                            fill="url(#colorRain)" 
                            strokeWidth={5}
                            animationDuration={2500}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Alerts & Notices */}
                <div className="lg:col-span-4">
                  <div className="bento-item !p-12 h-full relative overflow-hidden group">
                    <div className="absolute -right-20 -top-20 w-64 h-64 bg-orange-500/5 rounded-full blur-[80px] transition-all duration-1000 group-hover:scale-150" />
                    <div className="flex items-center gap-6 mb-12 relative z-10">
                      <div className="p-4 bg-orange-500/10 text-orange-600 rounded-[1.5rem] shadow-sm transform transition-all duration-500 group-hover:rotate-12 group-hover:scale-110">
                        <ShieldAlert size={24} />
                      </div>
                      <div>
                        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-2">Comunicados</h3>
                        <p className="text-3xl font-black text-white tracking-tighter serif italic leading-none">Avisos Oficiais</p>
                      </div>
                    </div>
                    <div className="space-y-8 relative z-10">
                      {alerts.length > 0 ? alerts.map((alert, i) => (
                        <motion.div 
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          key={alert.id} 
                          className={cn(
                            "p-8 rounded-[2.5rem] border transition-all duration-500 hover:scale-[1.03] cursor-default",
                            alert.level === 'danger' ? "bg-red-950/40 border-red-900/50 text-red-200 shadow-2xl shadow-red-900/20" :
                            alert.level === 'warning' ? "bg-orange-950/40 border-orange-900/50 text-orange-200 shadow-2xl shadow-orange-900/20" :
                            "bg-blue-950/40 border-blue-900/50 text-blue-200 shadow-2xl shadow-blue-900/20"
                          )}
                        >
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <Info size={16} className="opacity-40" />
                              <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mono">{format(new Date(alert.timestamp), 'HH:mm')}</span>
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mono">{format(new Date(alert.timestamp), 'dd/MM')}</span>
                          </div>
                          <p className="font-black text-lg leading-tight tracking-tight serif italic">{alert.message}</p>
                        </motion.div>
                      )) : (
                        <div className="flex flex-col items-center justify-center py-32 text-slate-200">
                          <ShieldAlert size={80} strokeWidth={1} className="mb-8 opacity-20 animate-pulse" />
                          <p className="text-[10px] font-black uppercase tracking-[0.5em]">Nenhum alerta ativo</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Forecast Section */}
              <div className="bento-item !p-12 relative overflow-hidden group">
                <div className="absolute -left-20 -bottom-20 w-96 h-96 bg-emerald-500/5 rounded-full blur-[120px] transition-all duration-1000 group-hover:scale-150" />
                <div className="flex items-center justify-between mb-12 relative z-10">
                  <div>
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-3">Planejamento</h3>
                    <p className="text-4xl font-black text-white tracking-tighter serif italic leading-none">Previsão Semanal</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-8 relative z-10">
                  {weather?.forecast?.map((day, i) => (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      key={i} 
                      className="p-10 bg-slate-800/50 border border-slate-800 rounded-[3rem] text-center hover:bg-slate-800 hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.5)] transition-all duration-700 cursor-default group/day"
                    >
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-6 group-hover/day:text-white transition-colors">
                        {i === 0 ? 'Hoje' : format(new Date(day.date), 'eee', { locale: ptBR })}
                      </p>
                      <div className="flex justify-center mb-8 text-blue-500 transition-all duration-700 group-hover/day:scale-125 group-hover/day:-rotate-12 group-hover/day:drop-shadow-2xl">
                        {day.rain > 10 ? <CloudRain size={40} /> : <Cloud size={40} />}
                      </div>
                      <div className="flex flex-col gap-2 mb-6">
                        <span className="text-4xl font-black text-white mono tracking-tighter group-hover/day:scale-110 transition-transform duration-500">{day.temp_max?.toFixed(0) ?? '--'}°</span>
                        <span className="text-sm font-black text-slate-500 mono tracking-tighter">{day.temp_min?.toFixed(0) ?? '--'}°</span>
                      </div>
                      <div className="pt-6 border-t border-slate-800">
                        <p className="text-[10px] font-black text-blue-400 mono tracking-[0.2em] uppercase">{day.rain?.toFixed(1) ?? '0.0'}mm</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-12 max-w-7xl mx-auto">
              <div className="bento-item !p-12 relative overflow-hidden group">
                <div className="absolute -right-20 -top-20 w-96 h-96 bg-blue-500/5 rounded-full blur-[120px] transition-all duration-1000 group-hover:scale-150" />
                <div className="flex items-center justify-between mb-12 relative z-10">
                  <div>
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-3">Dados Históricos</h3>
                    <p className="text-4xl font-black text-white tracking-tighter serif italic leading-none">Volume de Chuva (30 Dias)</p>
                  </div>
                </div>
                <div className="h-[500px] w-full relative z-10">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={history}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis 
                        dataKey="date" 
                        stroke="#94a3b8" 
                        fontSize={10} 
                        tickFormatter={(val) => format(new Date(val), 'dd/MM')}
                        tickLine={false}
                        axisLine={false}
                        dy={15}
                        tick={{ fontWeight: 800, letterSpacing: '1px' }}
                      />
                      <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} dx={-15} tick={{ fontWeight: 800 }} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'rgba(15, 23, 42, 0.9)', 
                          border: '1px solid #1e293b', 
                          borderRadius: '24px', 
                          boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.5)',
                          backdropFilter: 'blur(10px)',
                          padding: '20px'
                        }}
                        itemStyle={{ color: '#f8fafc', fontWeight: 900, fontSize: '14px' }}
                        labelStyle={{ color: '#94a3b8', fontWeight: 900, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}
                        cursor={{ fill: 'rgba(59, 130, 246, 0.05)', radius: 12 }}
                      />
                      <Bar 
                        dataKey="rain" 
                        fill="#3b82f6" 
                        radius={[12, 12, 0, 0]} 
                        animationDuration={2000}
                        barSize={30}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'admin' && !token && (
            <div className="max-w-md mx-auto mt-20">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bento-item !p-12 relative overflow-hidden group"
              >
                <div className="absolute -right-20 -top-20 w-64 h-64 bg-slate-900/5 rounded-full blur-[80px]" />
                <div className="flex flex-col items-center text-center mb-10 relative z-10">
                  <div className="p-6 bg-blue-600 text-white rounded-[2rem] shadow-2xl mb-6">
                    <Lock size={32} />
                  </div>
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-2">Área Restrita</h3>
                  <p className="text-3xl font-black text-white tracking-tighter serif italic leading-none">Autenticação</p>
                  <p className="text-slate-400 mt-4 text-sm font-medium">Insira a senha de administrador para acessar as ferramentas de gestão.</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6 relative z-10">
                  <div className="space-y-4">
                    <input 
                      type="password" 
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full bg-slate-800/50 border border-slate-800 rounded-[2rem] px-8 py-5 text-white font-black focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:bg-slate-800 transition-all duration-500 text-center tracking-[0.5em]"
                      placeholder="••••••••"
                      required
                    />
                    {loginError && (
                      <p className="text-red-400 text-[10px] font-black uppercase tracking-widest text-center mt-2">{loginError}</p>
                    )}
                  </div>
                  <button type="submit" className="w-full py-6 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-[2rem] transition-all duration-500 shadow-2xl shadow-blue-600/20 active:scale-[0.98] uppercase tracking-[0.3em] text-xs">
                    Entrar no Painel
                  </button>
                </form>
              </motion.div>
            </div>
          )}

          {activeTab === 'admin' && token && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 max-w-7xl mx-auto">
              <div className="bento-item !p-12 relative overflow-hidden group">
                <div className="absolute -right-20 -top-20 w-64 h-64 bg-blue-500/5 rounded-full blur-[80px] transition-all duration-1000 group-hover:scale-150" />
                <div className="flex items-center gap-6 mb-12 relative z-10">
                  <div className="p-4 bg-blue-500/10 text-blue-600 rounded-[1.5rem] shadow-sm transform transition-all duration-500 group-hover:rotate-12 group-hover:scale-110">
                    <Plus size={24} />
                  </div>
                  <div>
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-2">Entrada de Dados</h3>
                    <p className="text-3xl font-black text-white tracking-tighter serif italic leading-none">Leitura Manual</p>
                  </div>
                </div>
                <form onSubmit={handleAdminSubmit} className="space-y-8 relative z-10">
                  <div className="space-y-4">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">Chuva Acumulada (24h - mm)</label>
                    <input 
                      type="number" 
                      value={adminRain}
                      onChange={(e) => setAdminRain(e.target.value)}
                      className="w-full bg-slate-800/50 border border-slate-800 rounded-[2rem] px-8 py-5 text-white font-black focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:bg-slate-800 transition-all duration-500 mono text-lg"
                      placeholder="0.0"
                      required
                    />
                  </div>
                  <div className="space-y-4">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">Nível do Rio Ubá (m)</label>
                    <input 
                      type="number" 
                      value={adminRiver}
                      onChange={(e) => setAdminRiver(e.target.value)}
                      className="w-full bg-slate-800/50 border border-slate-800 rounded-[2rem] px-8 py-5 text-white font-black focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:bg-slate-800 transition-all duration-500 mono text-lg"
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <button type="submit" className="w-full py-6 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-[2rem] transition-all duration-500 shadow-2xl shadow-blue-600/20 active:scale-[0.98] uppercase tracking-[0.3em] text-xs flex items-center justify-center gap-4">
                    <Plus size={18} />
                    Salvar Leitura
                  </button>
                </form>
              </div>

              <div className="bento-item !p-12 relative overflow-hidden group">
                <div className="absolute -right-20 -top-20 w-64 h-64 bg-orange-500/5 rounded-full blur-[80px] transition-all duration-1000 group-hover:scale-150" />
                <div className="flex items-center gap-6 mb-12 relative z-10">
                  <div className="p-4 bg-orange-500/10 text-orange-600 rounded-[1.5rem] shadow-sm transform transition-all duration-500 group-hover:rotate-12 group-hover:scale-110">
                    <ShieldAlert size={24} />
                  </div>
                  <div>
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-2">Comunicação</h3>
                    <p className="text-3xl font-black text-white tracking-tighter serif italic leading-none">Emitir Alerta Oficial</p>
                  </div>
                </div>
                <form onSubmit={handleAlertSubmit} className="space-y-8 relative z-10">
                  <div className="space-y-4">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">Nível de Gravidade</label>
                    <select 
                      value={adminAlertLevel}
                      onChange={(e) => setAdminAlertLevel(e.target.value)}
                      className="w-full bg-slate-800/50 border border-slate-800 rounded-[2rem] px-8 py-5 text-white font-black focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:bg-slate-800 transition-all duration-500 appearance-none uppercase tracking-widest text-xs"
                    >
                      <option value="info">INFORMATIVO (AZUL)</option>
                      <option value="warning">ATENÇÃO (AMARELO)</option>
                      <option value="danger">CRÍTICO (VERMELHO)</option>
                    </select>
                  </div>
                  <div className="space-y-4">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">Mensagem do Alerta</label>
                    <textarea 
                      value={adminAlert}
                      onChange={(e) => setAdminAlert(e.target.value)}
                      className="w-full bg-slate-800/50 border border-slate-800 rounded-[2rem] px-8 py-5 text-white font-black focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:bg-slate-800 transition-all duration-500 min-h-[150px] serif italic text-lg resize-none"
                      placeholder="Digite a mensagem oficial..."
                      required
                    />
                  </div>
                  <button type="submit" className="w-full py-6 bg-orange-600 hover:bg-orange-700 text-white font-black rounded-[2rem] transition-all duration-500 shadow-2xl shadow-orange-600/20 active:scale-[0.98] uppercase tracking-[0.3em] text-xs flex items-center justify-center gap-4">
                    <ShieldAlert size={18} />
                    Publicar Alerta
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="mt-auto p-10 text-center">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em] mb-2">
            Prefeitura Municipal de Ubá &copy; {new Date().getFullYear()}
          </p>
          <p className="text-[8px] font-black text-slate-600 uppercase tracking-[0.2em]">
            Sistema de Monitoramento de Riscos e Desastres Naturais
          </p>
        </footer>
      </main>
    </div>
  );
}
