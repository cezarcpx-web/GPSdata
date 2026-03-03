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
  Clock,
  Sun,
  CloudSun,
  CloudFog,
  CloudLightning,
  CloudDrizzle
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
    rain_probability?: number;
    weather_code?: number;
    description: string;
  };
  forecast: Array<{
    date: string;
    temp_min: number;
    temp_max: number;
    rain: number;
    probability?: number;
    weather_code?: number;
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
  details?: string;
}

// --- Components ---

const getWeatherIcon = (code?: number, size = 24, className = "") => {
  if (code === undefined) return <Cloud size={size} className={className} />;
  
  // WMO Weather interpretation codes (WW)
  if (code === 0) return <Sun size={size} className={cn("text-yellow-500", className)} />;
  if (code >= 1 && code <= 3) return <CloudSun size={size} className={cn("text-slate-400", className)} />;
  if (code === 45 || code === 48) return <CloudFog size={size} className={cn("text-slate-300", className)} />;
  if (code >= 51 && code <= 55) return <CloudDrizzle size={size} className={cn("text-blue-300", className)} />;
  if (code >= 61 && code <= 65) return <CloudRain size={size} className={cn("text-blue-500", className)} />;
  if (code >= 80 && code <= 82) return <CloudRain size={size} className={cn("text-blue-600", className)} />;
  if (code >= 95 && code <= 99) return <CloudLightning size={size} className={cn("text-indigo-500", className)} />;
  
  return <Cloud size={size} className={cn("text-slate-400", className)} />;
};

const SidebarItem = ({ icon: Icon, label, active, onClick }: { icon: any, label: string, active?: boolean, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className={cn(
      "flex items-center w-full gap-3 px-4 py-3 text-sm font-medium transition-colors rounded-lg",
      active 
        ? "bg-blue-600 text-white shadow-lg" 
        : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
    )}
  >
    <Icon size={20} />
    <span>{label}</span>
  </button>
);

const StatCard = ({ icon: Icon, label, value, unit, color = "blue" }: { icon: any, label: string, value: string | number, unit?: string, color?: string }) => (
  <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm">
    <div className="flex items-center gap-3 mb-3">
      <div className={cn("p-2 rounded-lg", `bg-${color}-500/10 text-${color}-600`)}>
        <Icon size={20} />
      </div>
      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span>
    </div>
    <div className="flex items-baseline gap-1">
      <span className="text-2xl font-black text-slate-900">{value}</span>
      {unit && <span className="text-sm font-bold text-slate-400">{unit}</span>}
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
            {alert.details && (
              <p className="text-xs mt-2 pt-2 border-t border-slate-200 text-slate-600 italic">{alert.details}</p>
            )}
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
  const [riverTrend, setRiverTrend] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Admin state
  const [adminRain, setAdminRain] = useState('');
  const [adminRiver, setAdminRiver] = useState('');
  const [adminAlert, setAdminAlert] = useState('');
  const [adminAlertDetails, setAdminAlertDetails] = useState('');
  const [adminAlertLevel, setAdminAlertLevel] = useState('info');
  const [expandedAlerts, setExpandedAlerts] = useState<Record<number, boolean>>({});

  const fetchData = async () => {
    try {
      const [wRes, fRes, aRes, hRes] = await Promise.all([
        fetch('/api/weather'),
        fetch('/api/flood-risk'),
        fetch('/api/alerts'),
        fetch('/api/history')
      ]);
      
      const wData = await wRes.json();
      const fData = await fRes.json();
      setWeather(wData);
      setFloodRisk(fData);
      setAlerts(await aRes.json());
      setHistory(await hRes.json());
      
      // Mock river trend based on current level
      const trend = Array.from({ length: 8 }).map((_, i) => ({
        day: i === 0 ? 'Hoje' : format(new Date(Date.now() + i * 86400000), 'eee', { locale: ptBR }),
        level: fData.riverLevel * (1 + (Math.random() * 0.4 - 0.2))
      }));
      setRiverTrend(trend);
      
      setLastUpdated(new Date());
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
    await fetch('/api/admin/reading', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rainfall_24h: Number(adminRain), river_level: Number(adminRiver) })
    });
    setAdminRain('');
    setAdminRiver('');
    fetchData();
  };

  const handleAlertSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/admin/alert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level: adminAlertLevel, message: adminAlert, details: adminAlertDetails })
    });
    setAdminAlert('');
    setAdminAlertDetails('');
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
      <div className="flex items-center justify-center min-h-screen bg-white text-slate-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-bold animate-pulse">Carregando dados de Ubá...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-white text-slate-900 font-sans">
      {/* Sidebar Mobile Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transition-transform lg:relative lg:translate-x-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full p-6">
          <div className="flex items-center gap-3 mb-10">
            <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-600/20">
              <ShieldAlert className="text-white" size={24} />
            </div>
            <div>
              <h1 className="font-black text-slate-900 leading-tight">Defesa Civil</h1>
              <p className="text-[10px] text-slate-400 font-black tracking-widest uppercase">Ubá - MG</p>
            </div>
          </div>

          <nav className="flex-1 space-y-2">
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
              icon={Settings} 
              label="Administração" 
              active={activeTab === 'admin'} 
              onClick={() => { setActiveTab('admin'); setIsSidebarOpen(false); }} 
            />
          </nav>

          <div className="mt-auto pt-6 border-t border-slate-100">
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-black text-slate-600">CZ</div>
              <div className="overflow-hidden">
                <p className="text-xs font-black text-slate-900 truncate">Cezar P.</p>
                <p className="text-[10px] text-slate-500 font-bold truncate">Operador de Monitoramento</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <ReportTemplate weather={weather} floodRisk={floodRisk} alerts={alerts} history={history} />
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-6 bg-white/80 border-b border-slate-200 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 lg:hidden text-slate-500 hover:text-slate-900"
            >
              <Menu size={24} />
            </button>
            <h2 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">
              {activeTab === 'dashboard' ? 'Monitoramento em Tempo Real' : activeTab === 'history' ? 'Histórico Climático' : 'Painel Administrativo'}
            </h2>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={exportPDF}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-black bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-all shadow-sm active:scale-95"
            >
              <Download size={14} />
              <span className="hidden sm:inline">Exportar PDF</span>
            </button>
            <div className="h-4 w-px bg-slate-200 mx-1" />
            <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <div className="flex flex-col items-start sm:items-end">
                <span className="hidden sm:inline">Sistema Online</span>
                {lastUpdated && (
                  <span className="text-[9px] lowercase font-bold opacity-70">
                    atualizado em: {format(lastUpdated, "dd/MM/yyyy HH:mm:ss")}
                  </span>
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="p-6 overflow-y-auto" id="dashboard-content">
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Header Banner - Image Style - Only show if risk is high/critical */}
              {floodRisk && (floodRisk.risk === 'Alto' || floodRisk.risk === 'Crítico') && (
                <motion.div 
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-700 text-white p-4 rounded-xl flex items-center justify-center gap-4 shadow-lg border-b-4 border-red-900"
                >
                  <AlertTriangle size={32} className="text-white fill-white/20" />
                  <h1 className="text-2xl font-black uppercase tracking-tighter">Alerta de Inundação <span className="text-xs font-bold opacity-60 normal-case tracking-normal">(dados Defesa Civil)</span></h1>
                </motion.div>
              )}

              {/* Top Grid - Weather Info */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 px-2 py-0.5 bg-slate-100 text-[8px] font-bold text-slate-400 uppercase rounded-bl-lg">Open-Meteo</div>
                  <p className="text-xs font-bold text-slate-500 uppercase mb-3">Previsão de Chuva</p>
                  <div className="flex items-center gap-4">
                    {getWeatherIcon(weather?.current?.weather_code, 40, "text-blue-500")}
                    <div>
                      <p className="text-3xl font-black text-slate-900">{weather?.current?.rain_1h?.toFixed(0) || '0'} mm</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Acumulado</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 px-2 py-0.5 bg-slate-100 text-[8px] font-bold text-slate-400 uppercase rounded-bl-lg">Open-Meteo</div>
                  <p className="text-xs font-bold text-slate-500 uppercase mb-3">Probabilidade de Chuva</p>
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      {getWeatherIcon(weather?.current?.weather_code, 40, "text-slate-300")}
                      {weather?.current?.rain_probability && weather.current.rain_probability > 0 && (
                        <Droplets size={20} className="text-blue-400 absolute bottom-0 right-0" />
                      )}
                    </div>
                    <p className="text-3xl font-black text-slate-900">{weather?.current?.rain_probability || '0'}%</p>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 px-2 py-0.5 bg-slate-100 text-[8px] font-bold text-slate-400 uppercase rounded-bl-lg">Open-Meteo</div>
                  <p className="text-xs font-bold text-slate-500 uppercase mb-3">Temperatura Atual</p>
                  <div className="flex items-center gap-4">
                    <div className="text-3xl font-black text-slate-900">{weather?.current?.temp?.toFixed(0) || '--'}°C</div>
                    <div className="text-[10px] font-bold text-slate-400">
                      <p>Máx: {weather?.forecast?.[0]?.temp_max?.toFixed(0)}°</p>
                      <p>Mín: {weather?.forecast?.[0]?.temp_min?.toFixed(0)}°</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 px-2 py-0.5 bg-slate-100 text-[8px] font-bold text-slate-400 uppercase rounded-bl-lg">Open-Meteo</div>
                  <p className="text-xs font-bold text-slate-500 uppercase mb-3">Próximos Dias</p>
                  <div className="flex justify-between items-center">
                    {weather?.forecast?.slice(1, 4).map((day, i) => (
                      <div key={i} className="text-center">
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-1">{format(new Date(day.date), 'eee', { locale: ptBR })}</p>
                        {getWeatherIcon(day.weather_code, 16, "mx-auto mb-1")}
                        <p className="text-[10px] font-bold text-slate-900">{day.temp_max.toFixed(0)}°/{day.temp_min.toFixed(0)}°</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Middle Grid - Risk and Chart */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Risk Card */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 px-3 py-1 bg-slate-100 text-[9px] font-black text-slate-400 uppercase rounded-bl-xl">Defesa Civil / Sensores</div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6">Risco de Inundação</h3>
                  
                  {/* Segmented Bar */}
                  <div className="flex h-12 rounded-xl overflow-hidden mb-6 border border-slate-100 shadow-inner">
                    <div className={cn(
                      "flex-1 flex items-center justify-center text-xs font-black uppercase tracking-widest transition-all",
                      floodRisk?.risk === 'Baixo' ? "bg-emerald-500 text-white shadow-[inset_0_0_20px_rgba(0,0,0,0.2)]" : "bg-emerald-100 text-emerald-700 opacity-40"
                    )}>Baixo</div>
                    <div className={cn(
                      "flex-1 flex items-center justify-center text-xs font-black uppercase tracking-widest transition-all",
                      floodRisk?.risk === 'Moderado' ? "bg-yellow-500 text-white shadow-[inset_0_0_20px_rgba(0,0,0,0.2)]" : "bg-yellow-100 text-yellow-700 opacity-40"
                    )}>Médio</div>
                    <div className={cn(
                      "flex-1 flex items-center justify-center text-xs font-black uppercase tracking-widest transition-all",
                      floodRisk?.risk === 'Alto' || floodRisk?.risk === 'Crítico' ? "bg-red-500 text-white shadow-[inset_0_0_20px_rgba(0,0,0,0.2)]" : "bg-red-100 text-red-700 opacity-40"
                    )}>Alto</div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-lg font-black text-slate-900 italic">
                      {floodRisk?.risk === 'Baixo' ? 'Condições estáveis no momento.' :
                       floodRisk?.risk === 'Moderado' ? 'Atenção: Risco moderado de inundação.' :
                       floodRisk?.risk === 'Alto' ? 'Alerta: Risco alto de inundação.' :
                       'Emergência: Risco crítico de inundação!'}
                    </p>
                    <p className="text-sm font-medium text-slate-500">
                      {floodRisk?.risk === 'Baixo' ? 'O nível do rio e a previsão de chuva indicam normalidade. Continue acompanhando as atualizações.' :
                       floodRisk?.risk === 'Moderado' ? 'Elevação gradual do nível do rio. Recomendamos atenção redobrada em áreas ribeirinhas.' :
                       floodRisk?.risk === 'Alto' ? 'Nível do rio em estágio de alerta. Prepare-se para possíveis alagamentos e siga as orientações da Defesa Civil.' :
                       'Transbordamento iminente ou em curso. Evacue áreas de risco imediatamente e procure locais seguros.'}
                    </p>
                  </div>

                  <AnimatePresence>
                    {floodRisk?.risk !== 'Baixo' && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="mt-6 pt-6 border-t border-slate-100 space-y-4 overflow-hidden"
                      >
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-slate-100 rounded-lg shrink-0">
                            <Info size={16} className="text-slate-500" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Origem dos Dados</p>
                            <p className="text-xs font-bold text-slate-700">Sensores Hidrológicos e Pluviométricos (Cemaden/Defesa Civil)</p>
                          </div>
                        </div>
                        
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-slate-100 rounded-lg shrink-0">
                            <AlertTriangle size={16} className="text-slate-500" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Motivo do Alerta</p>
                            <p className="text-xs font-bold text-slate-700">
                              {floodRisk?.riverLevel && floodRisk.riverLevel > 3.5 ? "Nível do Rio Ubá acima da cota de atenção." :
                               floodRisk?.rain24h && floodRisk.rain24h > 50 ? "Chuva acumulada nas últimas 24h superior a 50mm." :
                               "Combinação de previsão meteorológica e saturação do solo."}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* River Level Chart */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 px-3 py-1 bg-slate-100 text-[9px] font-black text-slate-400 uppercase rounded-bl-xl">Estação Hidrométrica</div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6">Nível do Rio Ubá - 7 Dias</h3>
                  <div className="h-48 w-full relative">
                    {/* Background Zones */}
                    <div className="absolute inset-0 flex flex-col pointer-events-none opacity-10">
                      <div className="flex-1 bg-red-500" />
                      <div className="flex-1 bg-yellow-500" />
                      <div className="flex-1 bg-emerald-500" />
                    </div>
                    
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={riverTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="day" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis hide domain={[0, 6]} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px' }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="level" 
                          stroke="#334155" 
                          strokeWidth={4} 
                          dot={{ r: 6, fill: '#fff', stroke: '#334155', strokeWidth: 2 }}
                          activeDot={{ r: 8 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex justify-between mt-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-emerald-500" />
                      <span className="text-[10px] font-black uppercase text-slate-400">Baixo</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-yellow-500" />
                      <span className="text-[10px] font-black uppercase text-slate-400">Médio</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500" />
                      <span className="text-[10px] font-black uppercase text-slate-400">Alto</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Section - Alerts */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                  <Info size={18} className="text-blue-500" />
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Último Alerta da Região</h3>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  <div className="lg:col-span-3">
                    {alerts.length > 0 ? (
                      <div className={cn(
                        "border rounded-3xl p-6 transition-all h-full",
                        alerts[0].level === 'danger' ? "bg-red-50/50 border-red-100" :
                        alerts[0].level === 'warning' ? "bg-orange-50/50 border-orange-100" :
                        "bg-blue-50/50 border-blue-100"
                      )}>
                        <div className={cn(
                          "flex items-center gap-2 mb-4",
                          alerts[0].level === 'danger' ? "text-red-500/60" :
                          alerts[0].level === 'warning' ? "text-orange-500/60" :
                          "text-blue-500/60"
                        )}>
                          <Clock size={16} />
                          <span className="text-[10px] font-black uppercase tracking-widest">
                            {format(new Date(alerts[0].timestamp), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                        
                        <h4 className={cn(
                          "text-xl font-black mb-4",
                          alerts[0].level === 'danger' ? "text-red-600" :
                          alerts[0].level === 'warning' ? "text-orange-600" :
                          "text-blue-600"
                        )}>Defesa Civil</h4>
                        
                        <div className={cn(
                          "h-px w-full mb-4",
                          alerts[0].level === 'danger' ? "bg-red-100" :
                          alerts[0].level === 'warning' ? "bg-orange-100" :
                          "bg-blue-100"
                        )} />
                        
                        <p className={cn(
                          "font-bold leading-relaxed",
                          alerts[0].level === 'danger' ? "text-red-600/80" :
                          alerts[0].level === 'warning' ? "text-orange-600/80" :
                          "text-blue-600/80"
                        )}>
                          {alerts[0].message}
                          {alerts[0].details && (
                            <span className="block mt-2 text-sm opacity-80 font-medium italic">
                              {alerts[0].details}
                            </span>
                          )}
                        </p>

                        <p className={cn(
                          "mt-4 text-[10px] font-bold uppercase tracking-wider",
                          alerts[0].level === 'danger' ? "text-red-400" :
                          alerts[0].level === 'warning' ? "text-orange-400" :
                          "text-blue-400"
                        )}>
                          Em caso de emergência, acione a Defesa Civil pelo WhatsApp: (32) 99818-9318.
                        </p>
                      </div>
                    ) : (
                      <div className="text-center py-10 text-slate-300 bg-slate-50 border border-slate-100 rounded-3xl h-full flex items-center justify-center">
                        <p className="text-xs font-black uppercase tracking-widest">Nenhum alerta ativo no momento</p>
                      </div>
                    )}
                  </div>

                  {/* Legend / Palette */}
                  <div className="lg:col-span-1 space-y-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Legenda de Alertas</p>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3 p-3 rounded-2xl bg-blue-50 border border-blue-100">
                        <div className="w-4 h-4 rounded-full bg-blue-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-[10px] font-black text-blue-600 uppercase">Informativo</p>
                          <p className="text-[10px] font-medium text-blue-500/80 leading-tight">Avisos gerais e orientações preventivas.</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 rounded-2xl bg-orange-50 border border-orange-100">
                        <div className="w-4 h-4 rounded-full bg-orange-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-[10px] font-black text-orange-600 uppercase">Atenção</p>
                          <p className="text-[10px] font-medium text-orange-500/80 leading-tight">Risco moderado, requer vigilância e monitoramento.</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 rounded-2xl bg-red-50 border border-red-100">
                        <div className="w-4 h-4 rounded-full bg-red-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-[10px] font-black text-red-600 uppercase">Emergência</p>
                          <p className="text-[10px] font-medium text-red-500/80 leading-tight">Risco alto ou crítico, requer ação imediata.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* SMS Subscription Info */}
              <div className="p-6 bg-blue-600 rounded-3xl text-white shadow-xl shadow-blue-600/20 flex flex-col md:flex-row items-center gap-6">
                <div className="p-4 bg-white/20 rounded-2xl shrink-0">
                  <Navigation size={32} className="text-white" />
                </div>
                <div className="text-center md:text-left">
                  <h4 className="text-xl font-black uppercase tracking-tighter mb-1">Receba Alertas via SMS</h4>
                  <p className="text-sm font-bold opacity-90 leading-relaxed">
                    Para receber os alertas da Defesa Civil sobre Ubá, envie um SMS para o número 
                    <span className="bg-white text-blue-600 px-2 py-0.5 rounded-md mx-2 inline-block">40199</span> 
                    com o CEP 
                    <span className="bg-white text-blue-600 px-2 py-0.5 rounded-md mx-2 inline-block">36500-001</span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-6">
              <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-6">Volume de Chuva - Últimos 30 Dias</h3>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={history}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis 
                        dataKey="date" 
                        stroke="#94a3b8" 
                        fontSize={10} 
                        tickFormatter={(val) => format(new Date(val), 'dd/MM')}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Bar dataKey="rain" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'admin' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Manual Alert Issuance */}
              <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                  <ShieldAlert size={18} className="text-orange-500" />
                  Emitir Alertas Manuais
                </h3>
                <form onSubmit={handleAlertSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nível de Gravidade</label>
                    <select 
                      value={adminAlertLevel}
                      onChange={(e) => setAdminAlertLevel(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                    >
                      <option value="info">Informativo (Azul)</option>
                      <option value="warning">Atenção (Laranja)</option>
                      <option value="danger">Emergência (Vermelho)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Mensagem do Alerta</label>
                    <textarea 
                      value={adminAlert}
                      onChange={(e) => setAdminAlert(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all h-20 resize-none"
                      placeholder="Título/Resumo do alerta..."
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Detalhes Adicionais (Opcional)</label>
                    <textarea 
                      value={adminAlertDetails}
                      onChange={(e) => setAdminAlertDetails(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all h-24 resize-none"
                      placeholder="Instruções detalhadas, locais afetados, etc..."
                    />
                  </div>
                  <button type="submit" className="w-full py-3 bg-orange-600 hover:bg-orange-500 text-white font-black rounded-xl transition-all shadow-lg shadow-orange-600/20 active:scale-[0.98]">
                    Publicar Alerta
                  </button>
                </form>
              </div>

              {/* Last Alert Display */}
              <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                  <Info size={18} className="text-blue-500" />
                  Último Alerta da Região
                </h3>
                
                {alerts.length > 0 ? (
                  <div className={cn(
                    "p-5 rounded-2xl border transition-all",
                    alerts[0].level === 'danger' ? "bg-red-50 border-red-100 text-red-700" :
                    alerts[0].level === 'warning' ? "bg-orange-50 border-orange-100 text-orange-700" :
                    "bg-blue-50 border-blue-100 text-blue-700"
                  )}>
                    <div className="flex items-center gap-2 mb-3 opacity-60">
                      <Clock size={14} />
                      <span className="text-[10px] font-black uppercase tracking-widest">
                        {format(new Date(alerts[0].timestamp), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    <p className="font-black text-lg mb-2">{alerts[0].message}</p>
                    {alerts[0].details && (
                      <p className="text-sm opacity-80 leading-relaxed border-t border-current/10 pt-3 mt-3">
                        {alerts[0].details}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                    <ShieldAlert size={48} strokeWidth={1} className="mb-4 opacity-20" />
                    <p className="text-xs font-black uppercase tracking-widest">Nenhum alerta registrado</p>
                  </div>
                )}

                <div className="mt-6 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Dica de Operação</p>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Alertas publicados aqui são enviados imediatamente para o dashboard público e incluídos nos relatórios oficiais em PDF.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="mt-auto p-6 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-t border-slate-100">
          Prefeitura Municipal de Ubá &copy; {new Date().getFullYear()} - Sistema de Monitoramento de Riscos
        </footer>
      </main>
    </div>
  );
}
