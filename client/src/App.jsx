import React, { useState, useEffect, Fragment, useMemo, useCallback, useRef } from 'react';
import { Wallet, TrendingDown, Upload, Plus, X, Receipt, Search, Bell, Settings, Filter, BarChart3, PieChart, ArrowUpRight, LogOut, ShieldCheck, UserPlus, Users, Lock, ChevronRight, LayoutDashboard, History, CreditCard, Activity, Target, ArrowDownRight, Smartphone, MousePointer2, Mail, Send, CheckCircle2, Bot, MessageSquare, AlertCircle, RefreshCcw, HardDrive, Cpu, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid, AreaChart, Area } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, Transition, Menu } from '@headlessui/react';
import { useDropzone } from 'react-dropzone';
import { cva } from 'class-variance-authority';
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

const API_BASE = 'http://localhost:8081/api';
const CATEGORIES = ['Food', 'Tech', 'Transport', 'Utilities', 'Travel', 'Entertainment', 'Health', 'Other'];
const BUDGET_LIMITS = { 'Food': 5000, 'Tech': 15000, 'Transport': 3000, 'Other': 2000 };

const buttonVariants = cva(
    "inline-flex items-center justify-center rounded-xl text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50 disabled:pointer-events-none uppercase tracking-widest",
    {
        variants: {
            variant: {
                default: "bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg shadow-indigo-500/20 hover:opacity-90",
                outline: "border border-white/10 bg-white/5 hover:bg-white/10 text-white",
                ghost: "hover:bg-white/5 text-slate-400 hover:text-white",
                danger: "bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20",
            },
            size: { default: "h-12 px-8", sm: "h-9 px-4 text-[10px]", lg: "h-14 px-10 text-base", icon: "h-12 w-12" },
        },
        defaultVariants: { variant: "default", size: "default" },
    }
);

const Card = ({ className, ...props }) => (
    <div className={cn("rounded-[2rem] border border-white/10 bg-white/[0.03] backdrop-blur-xl shadow-2xl overflow-hidden", className)} {...props} />
);

// --- MAIN APPLICATION ---
function App() {
    const [token, setToken] = useState(localStorage.getItem('spendwise_token'));
    const [user, setUser] = useState(JSON.parse(localStorage.getItem('spendwise_user')));
    const [transactions, setTransactions] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const [showManual, setShowManual] = useState(false);
    const [showAdmin, setShowAdmin] = useState(false);
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [showChat, setShowChat] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loginForm, setLoginForm] = useState({ username: '', password: '' });
    const [loginError, setLoginError] = useState('');

    const secureFetch = async (url, options = {}) => {
        const headers = { ...options.headers, 'Authorization': `Bearer ${token}` };
        const res = await fetch(`${API_BASE}${url}`, { ...options, headers });
        if (res.status === 401 || res.status === 403) { handleLogout(); throw new Error("Session Expired"); }
        return res;
    };

    const fetchData = async () => {
        if (!token) return;
        try {
            const res = await secureFetch('/transactions');
            const data = await res.json();
            if (Array.isArray(data)) setTransactions(data);
        } catch (e) { console.error("Fetch Error", e); }
    };

    useEffect(() => {
        if (token) {
            fetchData();
            const interval = setInterval(fetchData, 8000);
            return () => clearInterval(interval);
        }
    }, [token]);

    const onDrop = useCallback(async (acceptedFiles) => {
        if (acceptedFiles.length === 0) return;
        setIsUploading(true);
        const formData = new FormData();
        acceptedFiles.forEach(file => formData.append('invoices', file));
        try {
            await secureFetch('/upload', { method: 'POST', body: formData });
            fetchData();
            addNotification("Batch Upload Successful", "Intelligence nodes processing transactions.");
        } catch (e) { addNotification("Upload Failed", e.message, true); }
        setIsUploading(false);
    }, [token]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

    const addNotification = (title, msg, isError = false) => {
        setNotifications(prev => [{ id: Date.now(), title, msg, isError }, ...prev.slice(0, 4)]);
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoginError('');
        try {
            const res = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(loginForm)
            });
            const result = await res.json();
            if (result.success) {
                localStorage.setItem('spendwise_token', result.token);
                localStorage.setItem('spendwise_user', JSON.stringify(result.user));
                setToken(result.token);
                setUser(result.user);
            } else { setLoginError(result.error); }
        } catch (e) { setLoginError("Server Unavailable"); }
    };

    const handleLogout = () => {
        localStorage.removeItem('spendwise_token');
        localStorage.removeItem('spendwise_user');
        setToken(null);
        setUser(null);
    };

    // --- DATA COMPUTATION ---
    const { chartData, timeSeriesData, budgetData, aggregateValue } = useMemo(() => {
        const catTotals = {};
        const dailyTotals = {};
        let total = 0;
        transactions.forEach(t => {
            const amt = parseFloat(t.amount) || 0;
            total += amt;
            catTotals[t.category] = (catTotals[t.category] || 0) + amt;
            const date = t.date;
            dailyTotals[date] = (dailyTotals[date] || 0) + amt;
        });
        const sortedTimeSeries = Object.keys(dailyTotals).sort().map(date => ({ date, amount: dailyTotals[date] }));
        const barData = Object.keys(catTotals).map(k => ({ name: k, amount: catTotals[k] }));
        const budgetUsage = Object.keys(BUDGET_LIMITS).map(cat => ({
            name: cat, limit: BUDGET_LIMITS[cat], actual: catTotals[cat] || 0,
            percent: Math.min(100, Math.round(((catTotals[cat] || 0) / BUDGET_LIMITS[cat]) * 100))
        }));
        return { chartData: barData, timeSeriesData: sortedTimeSeries, budgetData: budgetUsage, aggregateValue: total };
    }, [transactions]);

    const filteredTransactions = transactions.filter(t =>
        t.item.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (!token) return <LoginPage form={loginForm} setForm={setLoginForm} onLogin={handleLogin} error={loginError} />;

    return (
        <div className="min-h-screen bg-[#020617] text-slate-200 font-sans selection:bg-indigo-500/30 overflow-x-hidden">
            <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full pointer-events-none" />
            <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />

            <header className="fixed top-0 w-full z-[100] border-b border-white/5 bg-[#020617]/40 backdrop-blur-2xl">
                <div className="max-w-[1600px] mx-auto px-8 h-24 flex items-center justify-between">
                    <div className="flex items-center gap-12">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gradient-to-tr from-indigo-600 to-indigo-400 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-600/20">
                                <TrendingDown className="text-white" size={24} />
                            </div>
                            <span className="text-2xl font-black tracking-tighter italic uppercase text-white">Spend Wise</span>
                        </div>
                        <nav className="hidden lg:flex items-center gap-8 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                            <span className="text-white border-b-2 border-indigo-500 pb-1 cursor-pointer flex items-center gap-2"><LayoutDashboard size={14} /> Intelligence</span>
                            <span onClick={() => setShowEmailModal(true)} className="hover:text-white transition-colors cursor-pointer flex items-center gap-2"><Mail size={14} /> Email Node</span>
                            {user?.role === 'admin' && (
                                <span className="hover:text-white transition-colors cursor-pointer flex items-center gap-2" onClick={() => setShowAdmin(true)}><ShieldCheck size={14} /> Command Hub</span>
                            )}
                        </nav>
                    </div>

                    <div className="flex items-center gap-6">
                        <NotificationHub items={notifications} />

                        <div className="flex gap-3">
                            <button onClick={() => setShowChat(true)} className={cn(buttonVariants({ variant: "outline", size: "icon" }))}>
                                <Bot size={18} />
                            </button>
                            <label {...getRootProps()} className={cn(buttonVariants({ variant: "default", size: "default" }), "cursor-pointer relative overflow-hidden", isUploading && "opacity-50")}>
                                <input {...getInputProps()} />
                                <Upload size={16} className="mr-2" /> {isUploading ? 'Ingesting...' : 'Drop Intel'}
                            </label>

                            <Menu as="div" className="relative ml-2">
                                <Menu.Button className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors">
                                    <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center font-black text-[10px]">{user?.username[0].toUpperCase()}</div>
                                </Menu.Button>
                                <Transition as={Fragment} enter="duration-100" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="duration-75" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                                    <Menu.Items className="absolute right-0 mt-4 w-56 bg-slate-900 border border-white/10 rounded-2xl p-2 outline-none shadow-3xl">
                                        <Menu.Item><button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase text-red-500 hover:bg-red-400/10 rounded-xl transition-colors"><LogOut size={14} /> Terminate</button></Menu.Item>
                                    </Menu.Items>
                                </Transition>
                            </Menu>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-[1600px] mx-auto px-8 pt-40 pb-32">
                <AnimatePresence>
                    {isDragActive && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-indigo-600/20 backdrop-blur-xl flex flex-col items-center justify-center border-[8px] border-dashed border-indigo-500/40 m-8 rounded-[4rem] pointer-events-none">
                            <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="w-32 h-32 bg-indigo-500 rounded-full flex items-center justify-center shadow-2xl shadow-indigo-500/50 mb-8"><MousePointer2 size={48} className="text-white" /></motion.div>
                            <h2 className="text-5xl font-black text-white uppercase tracking-tighter italic">Ingest Intelligence</h2>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Dashboard Core */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
                    <MetricCard label="TOTAL VALUE" value={`R${aggregateValue.toLocaleString()}`} trend="+12.4%" trendUp={true} icon={<Wallet className="text-indigo-400" />} />
                    <MetricCard label="PEAK VELOCITY" value={`R${timeSeriesData[timeSeriesData.length - 1]?.amount.toLocaleString() || 0}`} trend="-3.2%" trendUp={false} icon={<Activity className="text-blue-400" />} />
                    <MetricCard label="AI NODES" value="ACTIVE" trend="GPT-4o" trendUp={true} icon={<Cpu className="text-violet-400" />} />
                    <MetricCard label="SYNC STATUS" value="READY" trend="OFFLINE" trendUp={true} icon={<RefreshCcw className="text-emerald-400" />} />
                </div>

                <div className="grid grid-cols-12 gap-8 text-left">
                    <Card className="col-span-12 lg:col-span-8 p-12">
                        <h3 className="text-2xl font-black text-white uppercase tracking-tight italic mb-12">Resource Telemetry</h3>
                        <div className="h-[350px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={timeSeriesData}>
                                    <defs><linearGradient id="colorAmt" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} /><stop offset="95%" stopColor="#6366f1" stopOpacity={0} /></linearGradient></defs>
                                    <CartesianGrid strokeDasharray="1 1" vertical={false} stroke="#ffffff03" />
                                    <XAxis dataKey="date" stroke="#475569" fontSize={10} axisLine={false} tickLine={false} dy={15} />
                                    <YAxis stroke="#475569" fontSize={10} axisLine={false} tickLine={false} dx={-15} />
                                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '16px' }} />
                                    <Area type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorAmt)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>

                    <Card className="col-span-12 lg:col-span-4 p-10 flex flex-col">
                        <div className="flex justify-between items-center mb-10"><h3 className="text-xl font-black text-white uppercase tracking-tighter italic">Budget Nodes</h3><Target size={20} className="text-emerald-500" /></div>
                        <div className="space-y-6 flex-1">
                            {budgetData.map(b => (
                                <div key={b.name} className="space-y-2">
                                    <div className="flex justify-between text-[9px] font-black uppercase text-slate-500"><span>{b.name}</span><span>R{b.actual.toLocaleString()}</span></div>
                                    <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/5"><motion.div initial={{ width: 0 }} animate={{ width: `${b.percent}%` }} className={cn("h-full rounded-full transition-all duration-1000", b.percent > 90 ? "bg-red-500" : "bg-indigo-500")} /></div>
                                </div>
                            ))}
                        </div>
                        <button className="mt-8 w-full py-4 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-all flex items-center justify-center gap-2"><Download size={14} /> Export Report</button>
                    </Card>

                    <Card className="col-span-12 lg:col-span-7 p-12 relative overflow-hidden">
                        <h3 className="text-2xl font-black text-white uppercase tracking-tight italic mb-12">Recurring Subscriptions</h3>
                        <SubscriptionList secureFetch={secureFetch} />
                    </Card>

                    <Card className="col-span-12 lg:col-span-5 flex flex-col overflow-hidden">
                        <div className="p-10 border-b border-white/5 bg-white/[0.02] flex justify-between items-center"><h3 className="text-xl font-black text-white uppercase tracking-tighter italic">Operational Feed</h3><History size={16} className="text-slate-500" /></div>
                        <div className="flex-1 overflow-y-auto max-h-[400px] custom-scrollbar">
                            <table className="w-full"><tbody className="divide-y divide-white/5">
                                {filteredTransactions.map(t => (
                                    <tr key={t.id} className="hover:bg-white/[0.04] group transition-all">
                                        <td className="p-8 text-left"><div><span className="font-black text-lg text-white block uppercase mb-1 group-hover:text-indigo-400 transition-colors">{t.item}</span><span className="text-[9px] text-slate-500 font-black tracking-widest uppercase">{t.category} • {t.date}</span></div></td>
                                        <td className="p-8 text-right font-black text-2xl text-white tracking-tighter italic">R{parseFloat(t.amount).toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody></table>
                        </div>
                    </Card>
                </div>
            </main>

            {/* Phase 2 Intelligence Components */}
            <AIChatAssistant isOpen={showChat} onClose={() => setShowChat(false)} secureFetch={secureFetch} />
            <AdminModal isOpen={showAdmin} onClose={() => setShowAdmin(false)} secureFetch={secureFetch} />
            <EmailIngestionModal isOpen={showEmailModal} onClose={() => setShowEmailModal(false)} onIngest={onDrop} />
        </div>
    );
}

// --- INTELLIGENCE MODULES ---

function NotificationHub({ items }) {
    return (
        <Menu as="div" className="relative">
            <Menu.Button className="relative w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors">
                <Bell size={18} />
                {items.length > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-indigo-500 rounded-full animate-ping" />}
            </Menu.Button>
            <Transition as={Fragment} enter="duration-100" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="duration-75">
                <Menu.Items className="absolute right-0 mt-4 w-80 bg-slate-900/95 border border-white/10 rounded-3xl p-4 shadow-3xl text-left backdrop-blur-3xl z-[200]">
                    <div className="flex justify-between items-center mb-6 px-2"><span className="text-[10px] font-black uppercase text-slate-500 tracking-widest leading-none mt-2">Intelligence Hub</span><AlertCircle size={14} className="text-indigo-500" /></div>
                    <div className="space-y-2">
                        {items.length === 0 ? <p className="text-center py-8 text-[10px] font-black text-slate-700 uppercase">No Active Alerts</p> : items.map(n => (
                            <div key={n.id} className={cn("p-4 rounded-2xl border bg-white/5", n.isError ? "border-red-500/20" : "border-indigo-500/10")}>
                                <h4 className={cn("text-xs font-black uppercase tracking-tight", n.isError ? "text-red-400" : "text-white")}>{n.title}</h4>
                                <p className="text-[10px] text-slate-500 mt-1 font-bold leading-relaxed">{n.msg}</p>
                            </div>
                        ))}
                    </div>
                </Menu.Items>
            </Transition>
        </Menu>
    );
}

function AIChatAssistant({ isOpen, onClose, secureFetch }) {
    const [msgs, setMsgs] = useState([{ role: 'bot', text: 'Spend Wise Assistant Active. How can I analyze your financial telemetry?' }]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const endRef = useRef(null);

    useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

    const handleSend = async () => {
        if (!input.trim() || loading) return;
        const userMsg = input;
        setInput('');
        setMsgs(prev => [...prev, { role: 'user', text: userMsg }]);
        setLoading(true);
        try {
            const res = await secureFetch('/ai/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: userMsg }) });
            const data = await res.json();
            setMsgs(prev => [...prev, { role: 'bot', text: data.answer }]);
        } catch (e) { setMsgs(prev => [...prev, { role: 'bot', text: "Telemetry engine offline." }]); }
        setLoading(false);
    };

    return (
        <Transition show={isOpen} as={Fragment}>
            <Dialog onClose={onClose} className="relative z-[300]">
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm" />
                <div className="fixed bottom-8 right-8 w-full max-w-md h-[600px]">
                    <Dialog.Panel className="w-full h-full bg-[#020617] border border-white/10 rounded-[2.5rem] shadow-4xl flex flex-col p-8 overflow-hidden">
                        <div className="flex justify-between items-center mb-8"><h3 className="text-xl font-black uppercase italic text-white flex items-center gap-3"><Bot className="text-indigo-500" /> Intelligence Chat</h3><button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl"><X size={20} /></button></div>
                        <div className="flex-1 overflow-y-auto space-y-6 custom-scrollbar pr-2 text-left">
                            {msgs.map((m, i) => (
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={i} className={cn("p-6 rounded-3xl text-sm leading-relaxed", m.role === 'user' ? "ml-12 bg-indigo-600 text-white font-bold" : "mr-12 bg-white/5 border border-white/5 text-slate-300 font-medium whitespace-pre-wrap")}>
                                    {m.text}
                                </motion.div>
                            ))}
                            {loading && <div className="text-[10px] font-black uppercase text-indigo-500 animate-pulse px-4">AI Processing...</div>}
                            <div ref={endRef} />
                        </div>
                        <div className="mt-8 flex gap-3">
                            <input onKeyDown={e => e.key === 'Enter' && handleSend()} className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none font-bold text-sm placeholder:text-slate-700" placeholder="Analyze Intelligence..." value={input} onChange={e => setInput(e.target.value)} />
                            <button onClick={handleSend} className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center hover:opacity-90 transition-all text-white"><Send size={20} /></button>
                        </div>
                    </Dialog.Panel>
                </div>
            </Dialog>
        </Transition>
    );
}

function SubscriptionList({ secureFetch }) {
    const [subs, setSubs] = useState([]);
    useEffect(() => {
        secureFetch('/intel/subscriptions').then(r => r.json()).then(setSubs);
    }, []);

    return (
        <div className="space-y-4 text-left">
            {subs.length === 0 ? <p className="text-[10px] uppercase font-black text-slate-700 py-12 text-center">Scanning for recurring patterns...</p> : subs.map((s, i) => (
                <div key={i} className="flex justify-between items-center p-6 bg-white/5 rounded-2xl border border-white/5 hover:border-indigo-500/20 transition-all group">
                    <div className="flex items-center gap-6 text-left">
                        <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center group-hover:bg-indigo-500 transition-colors"><RefreshCcw size={20} className="text-indigo-500 group-hover:text-white" /></div>
                        <div><p className="font-black text-lg text-white uppercase tracking-tighter italic leading-none mb-1 group-hover:text-indigo-400 transition-colors">{s.item}</p><p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Detected Recurring Flow</p></div>
                    </div>
                    <div className="text-right"><p className="font-black text-2xl text-white tracking-tighter italic">R{parseFloat(s.amount).toFixed(2)}</p><span className="text-[8px] font-black text-indigo-500 uppercase tracking-[0.3em]">Verified</span></div>
                </div>
            ))}
        </div>
    );
}

function AdminModal({ isOpen, onClose, secureFetch }) {
    const [users, setUsers] = useState([]);
    const [health, setHealth] = useState(null);
    const load = async () => {
        secureFetch('/admin/users').then(r => r.json()).then(setUsers);
        secureFetch('/intel/health').then(r => r.json()).then(setHealth);
    };
    useEffect(() => { if (isOpen) load(); }, [isOpen]);

    return (
        <Dialog open={isOpen} onClose={onClose} className="relative z-[300]">
            <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-3xl" />
            <div className="fixed inset-0 flex items-center justify-center p-8">
                <Dialog.Panel className="w-full max-w-6xl bg-[#020617] p-16 rounded-[4.5rem] border border-white/10 shadow-3xl h-[85vh] flex flex-col">
                    <div className="flex justify-between items-center mb-16"><h3 className="text-4xl font-black text-white uppercase italic underline decoration-indigo-500/10">Master Ops Center</h3><button onClick={onClose} className="p-4 bg-white/5 rounded-2xl"><X /></button></div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12 flex-1 overflow-hidden text-left">

                        {/* Status Panel */}
                        <div className="space-y-8 bg-white/5 p-10 rounded-[3rem] border border-white/5">
                            <h4 className="text-[10px] font-black uppercase text-indigo-500 tracking-[0.3em] mb-4">System Telemetry</h4>
                            <div className="space-y-6">
                                <StatusItem icon={<Cpu size={16} />} label="AI NODES" value={health?.ai_nodes?.openai === "ONLINE" ? "STABLE" : "DEGRADED"} color={health?.ai_nodes?.openai === "ONLINE" ? "text-emerald-400" : "text-red-400"} />
                                <StatusItem icon={<HardDrive size={16} />} label="DB NODES" value={`${health?.database?.records} RX`} />
                                <StatusItem icon={<Activity size={16} />} label="ENGINE UPTIME" value={`${Math.round(health?.uptime || 0)}s`} />
                            </div>
                        </div>

                        {/* Nodes Panel */}
                        <div className="space-y-6 overflow-y-auto pr-6 custom-scrollbar col-span-2">
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6">Authorized Entities</h4>
                            {users.map(u => (
                                <div key={u.id} className="p-8 bg-white/5 rounded-[2.5rem] border border-white/5 flex justify-between items-center">
                                    <div className="flex gap-6 items-center">
                                        <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center font-black text-xs">{u.username[0].toUpperCase()}</div>
                                        <div><p className="font-bold text-lg text-white uppercase mb-1">{u.username}</p><p className="text-[9px] font-black text-indigo-400 tracking-widest uppercase">{u.role} NODE</p></div>
                                    </div>
                                    <button onClick={async () => { if (u.username === 'admin') return alert("Protected Master Node"); if (window.confirm("Terminate Authority?")) { await secureFetch(`/admin/users/${u.id}`, { method: 'DELETE' }); load(); } }} className="p-4 hover:bg-white/5 rounded-2xl text-red-500 transition-all"><LogOut size={20} /></button>
                                </div>
                            ))}
                        </div>
                    </div>
                </Dialog.Panel>
            </div>
        </Dialog>
    );
}

function StatusItem({ icon, label, value, color = "text-white" }) {
    return (
        <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-slate-500">{icon}</div>
            <div><p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">{label}</p><p className={cn("font-black tracking-tight", color)}>{value}</p></div>
        </div>
    );
}

// --- UTILITY VIEWS ---

function MetricCard({ label, value, trend, trendUp, icon }) {
    return (
        <Card className="p-8 hover:border-white/20 transition-all group">
            <div className="flex justify-between items-start mb-10"><div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-indigo-500 transition-colors">{icon}</div><span className={cn("px-3 py-1 rounded-full text-[9px] font-black tracking-widest uppercase", trendUp ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400")}>{trend}</span></div>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mb-3">{label}</p>
            <h4 className="text-4xl font-black text-white tracking-tighter uppercase group-hover:text-indigo-500 transition-colors italic">{value}</h4>
        </Card>
    );
}

function EmailIngestionModal({ isOpen, onClose, onIngest }) {
    return (
        <Dialog open={isOpen} onClose={onClose} className="relative z-[300]">
            <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-3xl" />
            <div className="fixed inset-0 flex items-center justify-center p-6 text-center text-white">
                <Dialog.Panel className="w-full max-w-xl bg-[#020617] p-12 rounded-[4rem] border border-white/10 shadow-3xl">
                    <Dialog.Title className="text-4xl font-black uppercase tracking-tighter mb-4 italic flex items-center justify-center gap-4"><Mail size={32} className="text-indigo-500" /> Authorized Mailbox</Dialog.Title>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mb-12">Simulated SMTP Node Protocol</p>
                    <div className="bg-white/5 p-8 rounded-3xl border border-white/10 mb-10"><p className="text-indigo-400 font-black text-lg tracking-tight select-all">invoices@spendwise.ai</p></div>
                    <label className={cn(buttonVariants({ size: "lg" }), "w-full cursor-pointer")}>Simulate Attachment Drop<input type="file" className="hidden" onChange={(e) => { onIngest(Array.from(e.target.files)); onClose(); }} /></label>
                </Dialog.Panel>
            </div>
        </Dialog>
    );
}

function LoginPage({ form, setForm, onLogin, error }) {
    return (
        <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-600/10 blur-[150px] rounded-full" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-lg bg-white/[0.03] border border-white/10 p-16 rounded-[4rem] backdrop-blur-3xl shadow-2xl relative z-10 text-center">
                <div className="w-24 h-24 bg-gradient-to-tr from-indigo-600 to-indigo-400 rounded-[2rem] flex items-center justify-center mx-auto mb-10"><TrendingDown className="text-white" size={42} /></div>
                <h2 className="text-5xl font-black text-white tracking-tighter mb-4 italic uppercase underline decoration-indigo-500/10 underline-offset-8">SPEND WISE</h2>
                <p className="text-slate-500 font-black uppercase tracking-[0.4em] text-[10px] mb-12 leading-none mt-2">Authorized Terminal Console</p>
                <form onSubmit={onLogin} className="space-y-6">
                    <input type="text" className="w-full bg-white/5 border border-white/10 p-6 rounded-2xl outline-none text-white font-bold text-center placeholder:text-slate-700" placeholder="IDENTITY ID" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} />
                    <input type="password" className="w-full bg-white/5 border border-white/10 p-6 rounded-2xl outline-none text-white font-bold text-center placeholder:text-slate-700" placeholder="ACCESS KEY" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
                    {error && <p className="text-red-400 text-[10px] font-black uppercase tracking-widest">{error}</p>}
                    <button className={cn(buttonVariants({ size: "lg" }), "w-full")}>Authorize</button>
                </form>
            </motion.div>
        </div>
    );
}

export default App;
