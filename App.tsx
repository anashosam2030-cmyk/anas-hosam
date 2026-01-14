
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Coins, Plus, Rocket, Zap, History, Sparkles, Loader2, CreditCard, 
  Camera, X, CheckCircle2, AlertCircle, Settings, User as UserIcon, Languages, 
  Moon, Sun, Volume2, VolumeX, Edit3, PartyPopper, ShieldCheck, Mail, LogOut, Users, UsersRound, Send,
  Timer, Trophy
} from 'lucide-react';
import { Task, UserStats, TaskCost, TRANSLATIONS, User, Role, TeamTask, TeamMember, GameDuration } from './types';
import { generateTask, verifyTaskProof } from './services/geminiService';

const App: React.FC = () => {
  const [stats, setStats] = useState<UserStats>(() => {
    const saved = localStorage.getItem('neural-stats');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (!parsed.appName) parsed.appName = "NEURAL QUEST";
      return parsed;
    }
    return {
      coins: 20,
      tasksCompleted: 0,
      playerName: "Hero",
      appName: "NEURAL QUEST",
      language: "EN",
      theme: "Dark",
      soundEnabled: true,
      currentUser: null
    };
  });

  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('neural-tasks');
    return saved ? JSON.parse(saved) : [];
  });

  const [teamTasks, setTeamTasks] = useState<TeamTask[]>(() => {
    const saved = localStorage.getItem('neural-team-tasks');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [emailInput, setEmailInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [activeMission, setActiveMission] = useState<Partial<Task> | null>(null);
  const [activeTeamMission, setActiveTeamMission] = useState<TeamTask | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'celebration' } | null>(null);

  // New Team Task Creation State
  const [newTeamTaskTitle, setNewTeamTaskTitle] = useState("");
  const [newTeamTaskDuration, setNewTeamTaskDuration] = useState<GameDuration>("short");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [tempMembers, setTempMembers] = useState<string[]>([]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const t = TRANSLATIONS[stats.language];
  const isDark = stats.theme === "Dark";
  const isRTL = stats.language === "AR";

  useEffect(() => {
    localStorage.setItem('neural-stats', JSON.stringify(stats));
  }, [stats]);

  useEffect(() => {
    localStorage.setItem('neural-tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('neural-team-tasks', JSON.stringify(teamTasks));
  }, [teamTasks]);

  const playSound = useCallback((type: 'success' | 'error' | 'click' | 'celebrate') => {
    if (!stats.soundEnabled) return;
    try {
      const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      if (type === 'success') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.2);
      } else if (type === 'celebrate') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime);
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1);
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2);
      } else if (type === 'error') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.3);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.05);
      }
      
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {
      console.warn("Audio Context failed", e);
    }
  }, [stats.soundEnabled]);

  const notify = (message: string, type: 'success' | 'error' | 'celebration' = 'success') => {
    setNotification({ message, type });
    if (type === 'celebration') playSound('celebrate');
    else playSound(type === 'success' ? 'success' : 'error');
    setTimeout(() => setNotification(null), 4000);
  };

  const handleLogin = (method: 'EMAIL' | 'GOOGLE') => {
    const email = method === 'EMAIL' ? emailInput : "google.user@domain.com";
    if (method === 'EMAIL' && !email.includes('@')) {
      notify("Invalid Neural ID", "error");
      return;
    }
    const role: Role = email === "anashosam2030@gmail.com" ? "ADMIN" : "USER";
    const newUser: User = { email, loginMethod: method, role };
    setStats(prev => ({ ...prev, currentUser: newUser, playerName: email.split('@')[0] }));
    notify(`Welcome back, ${role === 'ADMIN' ? 'Commander' : 'Hero'}`);
  };

  const handleLogout = () => {
    setStats(prev => ({ ...prev, currentUser: null }));
    playSound('click');
  };

  const startMission = async () => {
    if (stats.coins < TaskCost.STANDARD) {
      notify(t.insufficient, "error");
      setShowShop(true);
      return;
    }
    setLoading(true);
    playSound('click');
    try {
      const taskData = await generateTask(stats.language);
      setActiveMission(taskData);
    } catch (err) {
      notify("Mission generation failed.", "error");
    } finally {
      setLoading(false);
    }
  };

  const openCamera = (forTeam?: TeamTask) => {
    if (forTeam) setActiveTeamMission(forTeam);
    setIsCameraOpen(true);
    playSound('click');
    const constraints = { video: { facingMode: 'environment' }, audio: false };
    navigator.mediaDevices.getUserMedia(constraints)
      .then(stream => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(err => {
        notify("Camera access denied.", "error");
        setIsCameraOpen(false);
      });
  };

  const closeCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setIsCameraOpen(false);
  };

  const captureAndVerify = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || (!activeMission && !activeTeamMission)) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const base64Image = canvas.toDataURL('image/jpeg', 0.8);
    setVerifying(true);
    closeCamera();

    const currentMissionDesc = activeTeamMission ? activeTeamMission.description : activeMission?.description || '';

    try {
      const result = await verifyTaskProof(currentMissionDesc, base64Image, stats.language);
      if (result.success) {
        if (activeTeamMission) {
          // Handle Team Submission
          const updatedTeamTasks = teamTasks.map(tt => {
            if (tt.id === activeTeamMission.id) {
              return {
                ...tt,
                members: tt.members.map(m => 
                  m.email === stats.currentUser?.email ? { ...m, hasSubmitted: true, proofImage: base64Image } : m
                )
              };
            }
            return tt;
          });
          setTeamTasks(updatedTeamTasks);
          setActiveTeamMission(null);
          notify(result.feedback || "Proof synced to squad network!", 'success');
        } else {
          // Handle Solo Submission
          const newTask: Task = {
            id: Math.random().toString(36).substr(2, 9),
            title: activeMission?.title || "Mission Log",
            description: activeMission?.description || "Mission details verified.",
            image: base64Image,
            timestamp: Date.now()
          };
          setTasks(prev => [newTask, ...prev]);
          setStats(prev => ({
            ...prev,
            coins: prev.coins - TaskCost.STANDARD,
            tasksCompleted: prev.tasksCompleted + 1
          }));
          setActiveMission(null);
          const motivations = t.motivations;
          notify(motivations[Math.floor(Math.random() * motivations.length)], 'celebration');
        }
      } else {
        notify(result.feedback || "Verification failed. Try again!", "error");
      }
    } catch (err) {
      notify("Neural analysis failed.", "error");
    } finally {
      setVerifying(false);
    }
  };

  const createTeamTask = () => {
    if (!newTeamTaskTitle) return;
    const reward = newTeamTaskDuration === 'short' ? 5 : 50;
    const members: TeamMember[] = [
      { email: stats.currentUser?.email || 'me@domain.com', hasSubmitted: false },
      ...tempMembers.map(email => ({ email, hasSubmitted: false }))
    ];
    const newTT: TeamTask = {
      id: Math.random().toString(36).substr(2, 9),
      title: newTeamTaskTitle,
      description: `Collective squad game mission: ${newTeamTaskTitle}. Sync proof for the ${newTeamTaskDuration} reward.`,
      totalReward: reward, // For games, this is per person
      members,
      creatorEmail: stats.currentUser?.email || '',
      isDistributed: false,
      duration: newTeamTaskDuration
    };
    setTeamTasks(prev => [newTT, ...prev]);
    setShowTeamModal(false);
    setNewTeamTaskTitle("");
    setTempMembers([]);
    notify(`${newTeamTaskDuration.toUpperCase()} Game initialized!`, "success");
    playSound('success');
  };

  const addMemberToTemp = () => {
    if (!newMemberEmail.includes('@')) return;
    if (tempMembers.includes(newMemberEmail)) return;
    setTempMembers(prev => [...prev, newMemberEmail]);
    setNewMemberEmail("");
  };

  const distributeRewards = (ttId: string) => {
    const tt = teamTasks.find(t => t.id === ttId);
    if (!tt || tt.isDistributed) return;
    
    const allSubmitted = tt.members.every(m => m.hasSubmitted);
    if (!allSubmitted) {
      notify("Incomplete data: All heroes must sync proof first.", "error");
      return;
    }

    setStats(prev => ({
      ...prev,
      coins: prev.coins + tt.totalReward,
      tasksCompleted: prev.tasksCompleted + 1
    }));

    setTeamTasks(prev => prev.map(t => t.id === ttId ? { ...t, isDistributed: true } : t));
    notify(`Quest complete! Reward received: +${tt.totalReward} Credits`, "celebration");
  };

  const injectCredits = (amount: number) => {
    setStats(prev => ({ ...prev, coins: prev.coins + amount }));
    notify(`System override: +${amount} Credits`);
    playSound('success');
  };

  // Added missing handleBuyCoins function to fix the reported error
  const handleBuyCoins = (amount: number) => {
    setStats(prev => ({ ...prev, coins: prev.coins + amount }));
    notify(`Neural credits recharged: +${amount}`, 'success');
    playSound('success');
    setShowShop(false);
  };

  const updatePlayerName = (name: string) => setStats(prev => ({ ...prev, playerName: name }));
  const updateAppName = (name: string) => setStats(prev => ({ ...prev, appName: name }));
  const toggleLanguage = () => { setStats(prev => ({ ...prev, language: prev.language === 'EN' ? 'AR' : 'EN' })); playSound('click'); };
  const toggleTheme = () => { setStats(prev => ({ ...prev, theme: prev.theme === 'Light' ? 'Dark' : 'Light' })); playSound('click'); };
  const toggleSound = () => { setStats(prev => ({ ...prev, soundEnabled: !prev.soundEnabled })); playSound('click'); };

  if (!stats.currentUser) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-6 ${isDark ? 'bg-slate-950 text-slate-50' : 'bg-slate-50 text-slate-900'}`} dir={isRTL ? "rtl" : "ltr"}>
        <div className="max-w-md w-full space-y-8 animate-in fade-in zoom-in duration-500">
          <div className="text-center space-y-4">
            <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center mx-auto shadow-2xl shadow-indigo-600/40 animate-pulse">
              <Zap className="w-12 h-12 text-white fill-white" />
            </div>
            <h1 className="text-4xl font-display font-black tracking-tighter uppercase text-cyan-400">{stats.appName}</h1>
            <p className="text-slate-500 font-medium">{t.loginDesc}</p>
          </div>
          <div className={`p-8 rounded-[2rem] border ${isDark ? 'bg-slate-900/50 border-slate-800 shadow-2xl shadow-indigo-500/5' : 'bg-white border-slate-200 shadow-xl'}`}>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-500 px-1">{t.emailLabel}</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 transition-colors group-focus-within:text-cyan-400 rtl:right-4 rtl:left-auto" />
                  <input type="email" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} placeholder="name@domain.com" className={`w-full py-4 px-12 rounded-2xl border outline-none transition-all ${isDark ? 'bg-slate-800/50 border-slate-700 focus:border-cyan-400' : 'bg-slate-50 border-slate-300 focus:border-cyan-400'}`} />
                </div>
              </div>
              <button onClick={() => handleLogin('EMAIL')} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-lg shadow-xl shadow-indigo-600/20 transition-all active:scale-95 flex items-center justify-center gap-3"><Zap className="w-5 h-5" /> {t.emailLogin}</button>
              <div className="relative py-2 flex items-center"><div className="flex-grow border-t border-slate-800"></div><span className="flex-shrink mx-4 text-slate-500 text-xs font-bold uppercase">OR</span><div className="flex-grow border-t border-slate-800"></div></div>
              <button onClick={() => handleLogin('GOOGLE')} className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-3 border transition-all active:scale-95 ${isDark ? 'bg-slate-800 border-slate-700 hover:bg-slate-700' : 'bg-slate-100 border-slate-300 hover:bg-slate-200'}`}><img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" /> {t.googleLogin}</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 font-sans selection:bg-indigo-500/30 ${isDark ? 'bg-slate-950 text-slate-50' : 'bg-slate-50 text-slate-900'}`} dir={isRTL ? "rtl" : "ltr"}>
      <nav className={`sticky top-0 z-50 border-b px-6 py-4 backdrop-blur-xl ${isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-white/80 border-slate-200'}`}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 group cursor-pointer" onClick={() => window.location.reload()}>
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-110 transition-transform">
              <Zap className="w-6 h-6 text-white fill-white" />
            </div>
            <h1 className="text-xl font-display font-bold tracking-tight uppercase text-cyan-400">{stats.appName}</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className={`hidden md:flex items-center gap-4 text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              <div className="flex items-center gap-2 border-r border-slate-700 pr-4 rtl:border-r-0 rtl:border-l rtl:pl-4 rtl:pr-0">
                <UserIcon className="w-4 h-4 text-cyan-400" />
                <span className="font-bold">{stats.playerName}</span>
                {stats.currentUser.role === 'ADMIN' && <span className="px-1.5 py-0.5 bg-red-500/10 text-red-500 text-[10px] font-black rounded border border-red-500/20 animate-pulse">ADMIN</span>}
              </div>
              <span className="flex items-center gap-1.5"><History className="w-4 h-4 text-yellow-400" /> {stats.tasksCompleted} {t.verified}</span>
            </div>
            <div className={`flex items-center gap-3 border rounded-full pl-4 pr-1.5 py-1.5 shadow-inner transition-colors ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-300'}`}>
              <div className="flex items-center gap-2 pr-2 rtl:pr-0 rtl:pl-2">
                <Coins className="w-5 h-5 text-yellow-500 fill-yellow-500/20" />
                <span className="text-lg font-bold font-display tabular-nums text-yellow-400">{stats.coins}</span>
              </div>
              <button onClick={() => setShowShop(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white p-2 rounded-full transition-all active:scale-90"><Plus className="w-4 h-4" /></button>
            </div>
            <button onClick={() => setShowTeamModal(true)} className={`p-2 rounded-full transition-all hover:bg-cyan-500/10 text-cyan-400`}><Users className="w-6 h-6" /></button>
            {stats.currentUser.role === 'ADMIN' && <button onClick={() => setShowAdmin(true)} className={`p-2 rounded-full transition-all hover:bg-red-500/10 text-red-400`}><ShieldCheck className="w-6 h-6" /></button>}
            <button onClick={() => setShowSettings(true)} className={`p-2 rounded-full transition-all hover:bg-slate-500/10 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}><Settings className="w-6 h-6" /></button>
            <button onClick={handleLogout} className={`p-2 rounded-full transition-all hover:bg-red-500/10 text-red-500`}><LogOut className="w-6 h-6" /></button>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-12 space-y-20">
        <section className="text-center space-y-6">
          {!activeMission && !verifying && (
            <div className="space-y-6 animate-in fade-in slide-in-from-top-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-500/10 text-cyan-400 rounded-full text-xs font-bold uppercase tracking-wider border border-cyan-500/20">
                <Sparkles className="w-3 h-3" /> Solo expeditions
              </div>
              <h2 className="text-4xl md:text-5xl font-display font-bold leading-tight text-white">{isRTL ? 'أثبت مهاراتك في' : 'Prove your skills in'} <br /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-400">{isRTL ? 'الفضاء المادي المحيط بك.' : 'physical space.'}</span></h2>
              <button onClick={startMission} disabled={loading} className="group relative flex items-center gap-3 px-10 py-5 mx-auto rounded-2xl font-bold text-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-600/30 hover:shadow-indigo-600/50 transition-all hover:-translate-y-1 disabled:opacity-50">{loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Rocket className="w-6 h-6" />} {t.getMission}</button>
            </div>
          )}

          {activeMission && !verifying && (
            <div className={`max-w-md mx-auto p-8 border rounded-[2.5rem] shadow-2xl transition-all animate-in zoom-in-95 duration-300 ${isDark ? 'bg-slate-900 border-cyan-500/50 shadow-cyan-500/10' : 'bg-white border-cyan-200 shadow-cyan-500/5'}`}>
              <div className="flex justify-between items-start mb-6"><div className="px-3 py-1 bg-cyan-500/10 text-cyan-400 text-[10px] font-bold rounded-lg border border-cyan-500/20 uppercase">{isRTL ? 'مهمة نشطة' : 'Active Task'}</div><button onClick={() => setActiveMission(null)} className="text-slate-500 hover:text-red-500 transition-colors"><X className="w-5 h-5" /></button></div>
              <h3 className="text-2xl font-display font-bold mb-2 text-cyan-400">{activeMission.title}</h3>
              <p className={`mb-8 leading-relaxed italic ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>"{activeMission.description}"</p>
              <div className="space-y-4"><button onClick={() => openCamera()} className={`w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-bold transition-all shadow-lg active:scale-95 ${isDark ? 'bg-white text-slate-950 hover:bg-cyan-50' : 'bg-cyan-600 text-white hover:bg-cyan-700'}`}><Camera className="w-5 h-5" /> {t.proof}</button><p className="text-xs text-slate-500">{t.cost}: <span className="text-yellow-500 font-bold">5 {t.credits}</span></p></div>
            </div>
          )}

          {verifying && (
            <div className="py-20 flex flex-col items-center gap-6 animate-pulse">
               <div className="relative"><div className="absolute inset-0 bg-cyan-500/20 blur-3xl rounded-full" /><Loader2 className="w-20 h-20 text-cyan-500 animate-spin relative" /></div>
               <div className="space-y-2"><h3 className="text-2xl font-display font-bold text-cyan-400">{t.analysis}</h3><p className="text-slate-500">{t.analysisDesc}</p></div>
            </div>
          )}
        </section>

        {/* Team Game Missions Section */}
        <section className="space-y-8">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <Trophy className="w-6 h-6 text-cyan-400" />
              <h3 className="text-2xl font-display font-bold text-white">{t.teamMissions}</h3>
            </div>
            <button onClick={() => setShowTeamModal(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs transition-all active:scale-95 shadow-lg shadow-indigo-600/20"><Plus className="w-4 h-4" /> {t.createTeamMission}</button>
          </div>

          <div className="grid gap-6">
            {teamTasks.map(tt => (
              <div key={tt.id} className={`p-6 border rounded-[2rem] transition-all group hover:scale-[1.01] ${isDark ? 'bg-slate-900/50 border-slate-800 hover:border-cyan-500/40' : 'bg-white border-slate-200 shadow-sm'}`}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter ${tt.duration === 'long' ? 'bg-purple-500 text-white' : 'bg-cyan-500 text-white'}`}>
                        {tt.duration === 'long' ? t.longGame : t.shortGame}
                      </span>
                      <h4 className="text-xl font-bold text-cyan-400 uppercase tracking-tight">{tt.title}</h4>
                    </div>
                    <p className="text-[10px] text-slate-500 font-mono">ENCRYPTED ID: {tt.id}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-2 bg-yellow-500/10 px-3 py-1 rounded-full border border-yellow-500/20">
                      <Coins className="w-3 h-3 text-yellow-500" />
                      <span className="text-xs font-black text-yellow-500">+{tt.totalReward} CR</span>
                    </div>
                    <span className="text-[8px] text-slate-500 uppercase font-bold">{t.teamReward}</span>
                  </div>
                </div>
                <p className="text-sm text-slate-400 italic mb-6 leading-relaxed">"{tt.description}"</p>
                
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-4">
                    {tt.members.map(m => (
                      <div key={m.email} className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${m.hasSubmitted ? 'border-green-500/30 bg-green-500/10' : 'border-slate-800 bg-slate-800/20'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${m.hasSubmitted ? 'bg-green-500 text-white ring-4 ring-green-500/20' : 'bg-slate-700 text-slate-400'}`}>{m.email[0].toUpperCase()}</div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-300">{m.email === stats.currentUser?.email ? "YOU" : m.email.split('@')[0]}</p>
                          <p className={`text-[8px] font-black uppercase ${m.hasSubmitted ? 'text-green-500' : 'text-slate-500'}`}>{m.hasSubmitted ? t.submitted : t.waitingProof}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {!tt.isDistributed && (
                    <div className="flex gap-4">
                      {tt.members.find(m => m.email === stats.currentUser?.email && !m.hasSubmitted) && (
                        <button onClick={() => openCamera(tt)} className="flex-1 py-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-2xl font-black text-sm transition-all active:scale-95 flex items-center justify-center gap-3 shadow-lg shadow-cyan-600/20"><Camera className="w-5 h-5" /> {t.proof}</button>
                      )}
                      {tt.members.every(m => m.hasSubmitted) && (
                        <button onClick={() => distributeRewards(tt.id)} className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-sm transition-all animate-pulse flex items-center justify-center gap-3 shadow-lg shadow-indigo-600/20"><Trophy className="w-5 h-5" /> {t.distribute}</button>
                      )}
                    </div>
                  )}
                  {tt.isDistributed && <div className="py-4 bg-green-500/10 text-green-500 rounded-2xl font-black text-xs text-center border border-green-500/20 uppercase tracking-widest">Neural Link Closed - Rewards Synced</div>}
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="space-y-8">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <h3 className="text-xl font-display font-bold text-cyan-100">{t.verifiedLogs}</h3>
            <span className="text-xs text-slate-500 font-mono uppercase tracking-widest">Neural Chain</span>
          </div>
          <div className="grid gap-6">
            {tasks.map((task) => (
              <article key={task.id} className={`group border rounded-3xl overflow-hidden transition-all hover:border-cyan-500/30 ${isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                <div className="flex flex-col md:flex-row">
                  <div className="md:w-1/3 h-56 md:h-auto overflow-hidden"><img src={task.image} className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-700" alt="Proof" /></div>
                  <div className="p-6 md:w-2/3 space-y-4">
                    <div className="flex items-center justify-between"><h4 className={`text-xl font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{task.title}</h4><CheckCircle2 className="w-5 h-5 text-green-500" /></div>
                    <p className={`text-sm italic ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>"{task.description}"</p>
                    <div className={`flex items-center gap-3 pt-4 border-t ${isDark ? 'border-slate-800/50' : 'border-slate-100'}`}><div className="text-[10px] font-mono text-slate-500">{new Date(task.timestamp).toLocaleString(stats.language === "AR" ? "ar-EG" : "en-US")}</div><div className={`ml-auto rtl:ml-0 rtl:mr-auto px-2 py-0.5 text-[10px] rounded uppercase font-bold tracking-tighter ${isDark ? 'bg-cyan-500/10 text-cyan-400' : 'bg-cyan-100 text-cyan-600'}`}>{t.completed}</div></div>
                  </div>
                </div>
              </article>
            ))}
            {tasks.length === 0 && !loading && !verifying && <div className={`py-20 text-center border-2 border-dashed rounded-3xl ${isDark ? 'border-slate-800' : 'border-slate-200'}`}><p className="text-slate-600 font-display uppercase tracking-widest">{t.noLogs}</p></div>}
          </div>
        </div>
      </main>

      {/* Assemble Squad Modal - Updated for Games */}
      {showTeamModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" onClick={() => setShowTeamModal(false)} />
          <div className={`relative w-full max-w-lg rounded-[2.5rem] border overflow-hidden animate-in zoom-in duration-300 shadow-2xl ${isDark ? 'bg-slate-900 border-cyan-500/30' : 'bg-white border-cyan-200'}`}>
            <div className="p-8 space-y-8">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3"><UsersRound className="w-6 h-6 text-cyan-400" /><h3 className="text-2xl font-display font-bold text-cyan-400 uppercase tracking-tighter">{t.createTeamMission}</h3></div>
                <button onClick={() => setShowTeamModal(false)} className="p-2 hover:bg-slate-500/10 rounded-full transition-colors"><X className="w-6 h-6" /></button>
              </div>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-slate-500 tracking-widest px-1">Game Objective</label>
                  <input type="text" value={newTeamTaskTitle} onChange={(e) => setNewTeamTaskTitle(e.target.value)} placeholder="Enter challenge name..." className={`w-full py-4 px-6 rounded-2xl border outline-none font-bold ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-300'}`} />
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-slate-500 tracking-widest px-1">{t.gameDuration}</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => setNewTeamTaskDuration('short')}
                      className={`py-4 rounded-2xl border font-black text-xs transition-all flex flex-col items-center gap-1 ${newTeamTaskDuration === 'short' ? 'bg-cyan-600 text-white border-cyan-500 shadow-lg shadow-cyan-600/20' : 'bg-slate-800/50 border-slate-700 text-slate-500'}`}
                    >
                      <Timer className="w-4 h-4" />
                      {t.shortGame} (5 CR)
                    </button>
                    <button 
                      onClick={() => setNewTeamTaskDuration('long')}
                      className={`py-4 rounded-2xl border font-black text-xs transition-all flex flex-col items-center gap-1 ${newTeamTaskDuration === 'long' ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-600/20' : 'bg-slate-800/50 border-slate-700 text-slate-500'}`}
                    >
                      <Rocket className="w-4 h-4" />
                      {t.longGame} (50 CR)
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-xs font-black uppercase text-slate-500 tracking-widest px-1">{t.addMember}</label>
                  <div className="flex gap-2">
                    <input type="email" value={newMemberEmail} onChange={(e) => setNewMemberEmail(e.target.value)} placeholder="hero.email@network.com" className={`flex-1 py-4 px-6 rounded-2xl border outline-none font-bold ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-300'}`} />
                    <button onClick={addMemberToTemp} className="px-6 bg-cyan-600 hover:bg-cyan-500 text-white rounded-2xl transition-all active:scale-90 shadow-lg shadow-cyan-600/20"><Send className="w-5 h-5" /></button>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <div className="px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 rounded-xl text-[10px] font-black uppercase tracking-tight">YOU ({stats.currentUser?.email.split('@')[0]})</div>
                    {tempMembers.map(email => (
                      <div key={email} className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 border border-slate-700 text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-tight">
                        {email.split('@')[0]}
                        <button onClick={() => setTempMembers(prev => prev.filter(e => e !== email))}><X className="w-3 h-3 text-red-500" /></button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <button onClick={createTeamTask} className="w-full py-5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-2xl font-black text-xl shadow-xl shadow-cyan-600/20 transition-all active:scale-95 uppercase tracking-tighter">Spawn Epic Game</button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Panel Modal */}
      {showAdmin && stats.currentUser.role === 'ADMIN' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm" onClick={() => setShowAdmin(false)} />
          <div className={`relative w-full max-w-lg rounded-[2.5rem] border overflow-hidden animate-in zoom-in duration-300 shadow-2xl shadow-red-500/10 ${isDark ? 'bg-slate-900 border-red-500/30' : 'bg-white border-red-200'}`}>
            <div className="p-8 space-y-8">
              <div className="flex justify-between items-center"><div className="flex items-center gap-3"><div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center border border-red-500/20"><ShieldCheck className="w-6 h-6 text-red-500" /></div><div><h3 className="text-2xl font-display font-bold text-red-500">{t.adminPanel}</h3><p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t.roleBadge}: COMMANDER</p></div></div><button onClick={() => setShowAdmin(false)} className="p-2 hover:bg-slate-500/10 rounded-full transition-colors"><X className="w-6 h-6" /></button></div>
              <div className="space-y-6">
                <div className="p-6 rounded-2xl bg-slate-800/50 border border-slate-700/50 space-y-4">
                  <div className="flex items-center gap-3"><Coins className="w-5 h-5 text-yellow-500" /><h4 className="font-bold">{t.addCredits}</h4></div>
                  <p className="text-xs text-slate-500">{t.injectDesc}</p>
                  <div className="grid grid-cols-3 gap-3">{[100, 500, 1000].map(amt => <button key={amt} onClick={() => injectCredits(amt)} className="py-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl font-bold text-sm hover:bg-red-500/20 transition-all active:scale-95">+{amt}</button>)}</div>
                </div>
              </div>
              <button onClick={() => setShowAdmin(false)} className="w-full py-4 bg-slate-800 text-white rounded-2xl font-bold hover:bg-slate-700 transition-all active:scale-[0.98]">Close Panel</button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm" onClick={() => setShowSettings(false)} />
          <div className={`relative w-full max-w-lg rounded-[2.5rem] border overflow-hidden animate-in fade-in zoom-in duration-200 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="p-8 space-y-6">
              <div className="flex justify-between items-center mb-4"><h3 className="text-2xl font-display font-bold">{t.settings}</h3><button onClick={() => setShowSettings(false)} className="p-2 hover:bg-slate-500/10 rounded-full transition-colors"><X className="w-6 h-6" /></button></div>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2"><label className="text-xs font-bold uppercase tracking-wider text-slate-500">{t.playerName}</label><div className="relative"><UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 rtl:right-4 rtl:left-auto" /><input type="text" value={stats.playerName} onChange={(e) => updatePlayerName(e.target.value)} className={`w-full py-3 px-10 rounded-xl border focus:ring-2 focus:ring-indigo-500 outline-none transition-all ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-300'}`} /></div></div>
                  <div className="space-y-2"><label className="text-xs font-bold uppercase tracking-wider text-slate-500">{t.appName}</label><div className="relative"><Edit3 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 rtl:right-4 rtl:left-auto" /><input type="text" value={stats.appName} onChange={(e) => updateAppName(e.target.value)} className={`w-full py-3 px-10 rounded-xl border focus:ring-2 focus:ring-indigo-500 outline-none transition-all ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-300'}`} /></div></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <button onClick={toggleLanguage} className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all hover:scale-[1.02] active:scale-95 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-300'}`}><Languages className="w-5 h-5 text-cyan-400" /><span className="text-xs font-bold">{t.language}: {stats.language}</span></button>
                  <button onClick={toggleTheme} className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all hover:scale-[1.02] active:scale-95 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-300'}`}>{isDark ? <Moon className="w-5 h-5 text-cyan-400" /> : <Sun className="w-5 h-5 text-orange-400" />}<span className="text-xs font-bold">{t.theme}: {isDark ? 'Dark' : 'Light'}</span></button>
                  <button onClick={toggleSound} className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all hover:scale-[1.02] active:scale-95 col-span-2 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-300'}`}>{stats.soundEnabled ? <Volume2 className="w-5 h-5 text-green-400" /> : <VolumeX className="w-5 h-5 text-red-400" />}<span className="text-xs font-bold">{t.sound}: {stats.soundEnabled ? 'ON' : 'OFF'}</span></button>
                </div>
              </div>
              <button onClick={() => setShowSettings(false)} className="w-full py-4 bg-cyan-600 text-white rounded-2xl font-bold hover:bg-cyan-500 transition-all shadow-lg shadow-cyan-500/20 active:scale-[0.98]">{t.save}</button>
            </div>
          </div>
        </div>
      )}

      {/* Camera UI Overlay */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col" dir="ltr">
          <div className="p-6 flex justify-between items-center text-white"><h3 className="font-display font-bold uppercase text-cyan-400">{activeTeamMission ? "SQUAD UPLINK" : `${stats.appName} QUEST`}</h3><button onClick={closeCamera} className="p-2 hover:bg-white/10 rounded-full"><X /></button></div>
          <div className="flex-1 relative overflow-hidden bg-slate-900">
            <video ref={videoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none"><div className="w-full h-full border-2 border-cyan-500/50 relative"><div className="absolute top-0 left-0 w-full h-0.5 bg-cyan-400/50 shadow-[0_0_15px_rgba(34,211,238,0.8)] animate-scan-line" /></div></div>
            <div className="absolute bottom-12 left-0 w-full flex flex-col items-center gap-4 px-6">
               <p className="text-white/80 text-sm text-center bg-black/40 backdrop-blur px-4 py-2 rounded-full border border-white/10">{activeTeamMission ? activeTeamMission.title : activeMission?.description}</p>
               <button onClick={captureAndVerify} className="w-20 h-20 rounded-full border-4 border-white bg-transparent p-1 transition-transform active:scale-90 shadow-2xl shadow-white/10"><div className="w-full h-full rounded-full bg-white/20 hover:bg-white/40 transition-colors" /></button>
            </div>
          </div>
        </div>
      )}

      {/* Shop Modal */}
      {showShop && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm" onClick={() => setShowShop(false)} />
          <div className={`relative border w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="p-8 space-y-6">
              <div className="text-center space-y-2"><div className="w-16 h-16 bg-yellow-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4"><CreditCard className="w-8 h-8 text-yellow-500" /></div><h3 className="text-2xl font-display font-bold">{t.recharge}</h3><p className="text-slate-400">{t.rechargeDesc}</p></div>
              <div className="grid grid-cols-2 gap-4">{[{ amount: 20, price: "$0.99", icon: Zap }, { amount: 50, price: "$2.99", icon: Rocket, popular: true }].map((tier) => (<button key={tier.amount} onClick={() => handleBuyCoins(tier.amount)} className={`relative p-6 rounded-2xl border flex flex-col items-center gap-2 transition-all hover:border-cyan-500 active:scale-95 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-300'}`}>{tier.popular && <span className="absolute -top-3 bg-cyan-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase">{t.bestValue}</span>}<tier.icon className="w-5 h-5 text-cyan-400" /><span className="text-xl font-bold">{tier.amount} <span className="text-[10px] font-normal opacity-50">CR</span></span><span className="text-xs text-slate-400 font-bold">{tier.price}</span></button>))}</div>
              <button onClick={() => setShowShop(false)} className="w-full py-4 text-slate-500 text-sm hover:text-cyan-400 transition-colors">Maybe later</button>
            </div>
          </div>
        </div>
      )}

      {notification && (
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] px-8 py-4 rounded-[1.5rem] shadow-2xl border flex items-center gap-4 animate-in slide-in-from-bottom-8 duration-500 ${notification.type === 'celebration' ? 'bg-cyan-600 border-cyan-400 text-white scale-110' : notification.type === 'success' ? 'bg-green-600 border-green-500 text-white' : 'bg-red-600 border-red-500 text-white'}`}>
          {notification.type === 'celebration' ? <PartyPopper className="w-6 h-6 animate-bounce" /> : notification.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <div className="flex flex-col"><span className="font-black text-base tracking-tight">{notification.message}</span>{notification.type === 'celebration' && <span className="text-[10px] font-bold uppercase opacity-80">{isRTL ? 'إنجاز أسطوري!' : 'Legendary Achievement!'}</span>}</div>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
      <style>{`
        @keyframes scan-line { 0% { transform: translateY(0); opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { transform: translateY(calc(100vh - 120px)); opacity: 0; } }
        .animate-scan-line { animation: scan-line 4s linear infinite; }
      `}</style>
    </div>
  );
};

export default App;
