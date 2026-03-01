import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Send, Calendar, Clock, ShieldCheck, Power, VolumeX, Volume2, Paperclip, X, Cpu, Menu, LogOut, MessageSquare, Plus } from 'lucide-react';
import { HeliosCore } from './components/HeliosCore'; 
import { Terminal } from './components/Terminal';     

// IMPORTAÇÕES DO FIREBASE (NOVO)
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { auth, googleProvider } from './firebase';

interface LogMessage {
  id: string;
  source: 'USER' | 'JARVIS' | 'SYSTEM' | 'ERROR';
  text: string;
  timestamp: string;
}

const TEXT_MODEL = 'llama-3.3-70b-versatile'; 
const VISION_MODEL = 'llama-3.2-11b-vision-preview'; 

type Attachment = { file: File; base64: string; };

const App: React.FC = () => {
  // --- ESTADOS DO SISTEMA DE LOGIN ---
  const [user, setUser] = useState<User | null>(null); // Guarda a info da tua conta Google
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const isAuthenticated = !!user; // Se houver user, estás autenticado!

  const [isConnected, setIsConnected] = useState(false);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [textInput, setTextInput] = useState('');
  const [currentTime, setCurrentTime] = useState('--:--:--');
  const [currentDate, setCurrentDate] = useState('--/--');
  const [pendingAttachment, setPendingAttachment] = useState<Attachment | null>(null);

  const isMutedRef = useRef(isMuted);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  const questionCount = logs.filter(l => l.source === 'USER').length;

  const mockChats = [
    { id: 1, title: "Apoio em React e Tailwind" },
    { id: 2, title: "Configuração do H.E.L.I.O.S." },
    { id: 3, title: "Motor do Groq Llama 3" },
  ];

  const addLog = useCallback((source: 'USER' | 'JARVIS' | 'SYSTEM' | 'ERROR', text: string) => {
    setLogs(prev => [...prev, {
      id: Math.random().toString(36).substring(7),
      source, text, timestamp: new Date().toLocaleTimeString('pt-PT', { hour12: false })
    }].slice(-50));
  }, []);

  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);

  useEffect(() => {
    const interval = setInterval(() => {
        const now = new Date();
        setCurrentTime(now.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        setCurrentDate(now.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
    };
  }, []);

  // VIGIA SE ESTÁS LOGADO OU NÃO (Impede que tenhas de fazer login sempre que atualizas a página)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = 'pt-PT';
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setTextInput(prev => prev + (prev ? ' ' : '') + transcript);
      };
      recognition.onerror = (event: any) => {
        console.error('Erro no microfone:', event.error);
        setIsListening(false);
      };
      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
        const startHelios = () => {
            setIsConnecting(true);
            addLog('SYSTEM', 'A iniciar Projecto IA Helios com Motor Groq...');
            setTimeout(() => {
                addLog('SYSTEM', `Sistema Online. Bem-vindo, ${user?.displayName?.split(' ')[0] || 'Comandante'}.`);
                setIsConnected(true);
                setIsConnecting(false);
            }, 1500);
        };
        startHelios();
    } else {
        setIsConnected(false);
        setLogs([]);
    }
  }, [isAuthenticated, addLog, user]);

  // FUNÇÕES REAIS DE LOGIN E LOGOUT
  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Erro ao fazer login:", error);
      alert("Falha no login. Verifica a consola.");
    }
  };

  const handleLogout = async () => {
      try {
        await signOut(auth);
        setIsSidebarOpen(false);
      } catch (error) {
        console.error("Erro ao terminar sessão:", error);
      }
  };

  const disconnectHelios = () => {
    setIsConnected(false);
    addLog('SYSTEM', 'Sessão terminada.');
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    if (isListening) recognitionRef.current?.stop(); 
    
    setTimeout(() => {
        setIsConnecting(true);
        addLog('SYSTEM', 'A restabelecer ligação...');
        setTimeout(() => {
            addLog('SYSTEM', 'Sistema Online.');
            setIsConnected(true);
            setIsConnecting(false);
        }, 1500);
    }, 2000);
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64Content = (e.target?.result as string).split(',')[1];
      setPendingAttachment({ file: file, base64: base64Content });
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsDataURL(file);
  };

  const speakText = (text: string) => {
      if (isMutedRef.current) {
          setIsSpeaking(false);
          return;
      }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text.replace(/[*#_]/g, ''));
      utterance.lang = 'pt-PT';
      const voices = window.speechSynthesis.getVoices();
      const ptVoice = voices.find(v => v.lang.includes('pt-PT') && (v.name.includes('Google') || v.name.includes('Microsoft'))) || voices.find(v => v.lang.includes('pt'));
      if (ptVoice) utterance.voice = ptVoice;
      utterance.pitch = 1.0; 
      utterance.rate = 1.05;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
  };

  const toggleMicrophone = () => {
    if (isListening) recognitionRef.current?.stop();
    else recognitionRef.current?.start();
  };

  const handleSendMessage = async () => {
    if ((!textInput.trim() && !pendingAttachment) || isConnecting) return;
    
    const msg = textInput.trim();
    const attachment = pendingAttachment;
    setTextInput('');
    setPendingAttachment(null);

    if (msg.toLowerCase() === '> limpar' || msg.toLowerCase() === 'clear') {
        setLogs([]);
        addLog('SYSTEM', 'Terminal limpo com sucesso.');
        return;
    }
    
    addLog('USER', msg || `[Ficheiro anexado: ${attachment?.file.name}]`);
    
    if (!isConnected) { 
        addLog('ERROR', 'Sem resposta do servidor.');
        return; 
    }

    try {
        setIsSpeaking(true); 
        const messages: any[] = [
            {
                role: "system",
                content: `Tu és o H.E.L.I.O.S., uma Inteligência Artificial avançada desenvolvida pelo Simão. Estás a falar com o utilizador ${user?.displayName || 'Desconhecido'}. Fala sempre num tom educado e em Português de Portugal (PT-PT).`
            }
        ];

        if (attachment) {
            messages.push({
                role: "user",
                content: [
                    { type: "text", text: msg || "Analisa esta imagem/ficheiro detalhadamente." },
                    { type: "image_url", image_url: { url: `data:${attachment.file.type};base64,${attachment.base64}` } }
                ]
            });
        } else {
            messages.push({ role: "user", content: msg });
        }

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${(import.meta as any).env.VITE_GROQ_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: attachment ? VISION_MODEL : TEXT_MODEL,
                messages: messages,
                temperature: 0.7,
            })
        });

        if (!response.ok) throw new Error(`Erro Groq: ${response.statusText}`);

        const data = await response.json();
        const replyText = data.choices[0]?.message?.content || "Sem resposta.";
        
        addLog('JARVIS', replyText);
        speakText(replyText);

    } catch (e: any) { 
        console.error(e);
        addLog('ERROR', 'Falha na comunicação.');
        setIsSpeaking(false);
    }
  };

  // ==========================================
  // ECRÃ DE LOGIN (VERDADEIRO)
  // ==========================================
  if (!isAuthenticated) {
      return (
        <div className="flex flex-col h-screen w-full bg-[#020617] items-center justify-center relative font-sans overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-600/10 rounded-full blur-[100px] pointer-events-none animate-pulse"></div>
            
            <div className="z-10 flex flex-col items-center bg-slate-950/80 p-8 md:p-12 rounded-2xl border border-amber-500/20 backdrop-blur-xl shadow-[0_0_50px_rgba(245,158,11,0.1)] max-w-md w-[90%]">
                <Cpu size={56} className="text-amber-500 mb-6 drop-shadow-[0_0_15px_rgba(245,158,11,0.8)]" />
                <h1 className="text-4xl md:text-5xl font-black tracking-widest text-amber-500 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)] uppercase font-['Orbitron'] mb-2">H.E.L.I.O.S.</h1>
                <p className="text-amber-600/70 text-[10px] md:text-xs uppercase tracking-[0.3em] mb-10 text-center font-bold">Acesso Restrito ao Sistema</p>

                <button 
                  onClick={handleLogin}
                  className="w-full py-4 px-6 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/50 rounded-lg text-amber-400 font-bold tracking-widest uppercase transition-all flex items-center justify-center gap-3 hover:shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:scale-105"
                >
                   Autenticar com o Google
                </button>
            </div>
            <div className="absolute bottom-6 text-amber-900/40 text-[10px] uppercase tracking-widest font-mono">
                Projecto IA Helios | Simão
            </div>
        </div>
      );
  }

  // ==========================================
  // APLICAÇÃO PRINCIPAL
  // ==========================================
  return (
    <div className="flex flex-col h-screen w-full bg-[#020617] text-amber-500 p-4 md:p-8 lg:p-10 overflow-hidden relative font-sans">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] md:w-[800px] h-[300px] md:h-[800px] bg-amber-600/5 rounded-full blur-[80px] md:blur-[150px] pointer-events-none opacity-40"></div>
      
      {isSidebarOpen && (
          <div className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* BARRA LATERAL COM A TUA FOTO E NOME */}
      <div className={`fixed top-0 left-0 h-full w-72 bg-[#0a0d1a] border-r border-amber-500/20 z-50 transform transition-transform duration-300 shadow-[20px_0_50px_rgba(0,0,0,0.5)] flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="p-5 flex justify-between items-center border-b border-amber-500/10 mb-4">
               <div className="flex items-center gap-2">
                   <Cpu size={18} className="text-amber-500" />
                   <span className="font-bold tracking-widest text-amber-500 font-['Orbitron']">H.E.L.I.O.S.</span>
               </div>
               <button onClick={() => setIsSidebarOpen(false)} className="text-amber-500/60 hover:text-amber-500 bg-amber-500/5 p-1 rounded"><X size={18}/></button>
          </div>

          <div className="px-4">
              {/* CARTÃO DE UTILIZADOR */}
              <div className="flex items-center gap-3 mb-6 bg-slate-900/50 p-3 rounded-xl border border-amber-500/20">
                  {user?.photoURL ? (
                      <img src={user.photoURL} alt="Perfil" className="w-10 h-10 rounded-full border border-amber-500/50" />
                  ) : (
                      <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center border border-amber-500/50 text-amber-500 font-bold">
                          {user?.displayName?.charAt(0) || 'U'}
                      </div>
                  )}
                  <div className="flex flex-col overflow-hidden">
                      <span className="text-sm font-bold text-amber-400 truncate">{user?.displayName || 'Utilizador'}</span>
                      <span className="text-[10px] text-amber-500/50 truncate">{user?.email}</span>
                  </div>
              </div>

              <button className="w-full py-3 px-4 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg text-amber-400 font-bold text-sm flex items-center justify-center gap-2 transition-all">
                  <Plus size={16} /> NOVO CHAT
              </button>
          </div>
          
          <div className="flex-1 overflow-y-auto px-3 space-y-1 py-4">
              <div className="text-[10px] uppercase tracking-widest text-amber-900 font-bold mb-3 px-2">Histórico (Em Breve)</div>
              {mockChats.map(chat => (
                  <button key={chat.id} className="w-full text-left p-3 rounded-lg hover:bg-amber-500/5 text-amber-100/70 text-sm flex items-center gap-3 transition-colors border border-transparent hover:border-amber-500/10">
                      <MessageSquare size={14} className="opacity-50 shrink-0" />
                      <span className="truncate">{chat.title}</span>
                  </button>
              ))}
          </div>

          <div className="p-4 border-t border-amber-500/10 bg-slate-950/50">
               <button onClick={handleLogout} className="w-full py-2.5 px-4 hover:bg-red-500/10 text-red-500/80 hover:text-red-400 rounded-lg text-sm font-bold tracking-wider uppercase flex items-center justify-center gap-2 transition-all border border-transparent hover:border-red-500/20">
                  <LogOut size={16} /> Terminar Sessão
               </button>
          </div>
      </div>

      <header className="relative z-10 flex flex-col md:flex-row justify-between items-center md:items-start mb-6 shrink-0 gap-4">
        <div className="flex items-start gap-4">
          <button onClick={() => setIsSidebarOpen(true)} className="mt-1 p-2 bg-slate-900/60 border border-amber-500/20 rounded-lg text-amber-500 hover:bg-amber-500/20 hover:scale-105 transition-all">
              <Menu size={24} />
          </button>
          <div className="flex flex-col items-start">
            <h1 className="text-3xl md:text-5xl font-black tracking-widest text-amber-500 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)] uppercase font-['Orbitron']">H.E.L.I.O.S.</h1>
            <div className="flex items-center gap-2 text-[10px] md:text-[11px] uppercase tracking-[0.2em] md:tracking-[0.5em] text-amber-600/70 mt-1 text-left">
              <Cpu size={12} className="text-amber-500" /> 
              <span>Projecto IA Helios | V4.0 STD</span>
            </div>
          </div>
        </div>
        
        <div className="flex gap-2 md:gap-3">
            <div className="hud-border bg-slate-900/40 px-3 py-1.5 md:w-24 md:h-24 rounded-lg flex flex-row md:flex-col items-center justify-center backdrop-blur-md border border-amber-500/30 gap-2 md:gap-0">
                <Clock size={14} className="text-amber-600 md:mb-1" />
                <span className="text-[11px] md:text-sm font-mono font-bold text-amber-400">{currentTime}</span>
            </div>
            <div className="hud-border bg-slate-900/40 px-3 py-1.5 md:w-24 md:h-24 rounded-lg flex flex-row md:flex-col items-center justify-center backdrop-blur-md border border-amber-500/30 gap-2 md:gap-0">
                <Calendar size={14} className="text-amber-600 md:mb-1" />
                <span className="text-[11px] md:text-sm font-mono font-bold text-amber-400">{currentDate}</span>
            </div>
            <div className="hud-border bg-slate-900/40 px-3 py-1.5 md:w-24 md:h-24 rounded-lg flex flex-row md:flex-col items-center justify-center backdrop-blur-md border border-amber-500/30 gap-2 md:gap-0">
                <ShieldCheck size={14} className={`${isConnected ? 'text-green-500' : 'text-amber-800'} md:mb-1`} />
                <span className={`text-[9px] md:text-xs font-bold uppercase ${isConnected ? 'text-green-400' : 'text-amber-900'}`}>
                    {isConnected ? "ON" : "OFF"}
                </span>
            </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row items-center justify-center gap-6 min-h-0 relative z-20 overflow-hidden">
        <div className="flex-1 flex flex-col items-center justify-center w-full min-h-0 space-y-4 md:space-y-8">
          <div className="relative transform scale-[0.65] sm:scale-75 md:scale-90 lg:scale-100 transition-transform">
            <HeliosCore isActive={isConnected} isSpeaking={isSpeaking} volume={0} questionCount={questionCount} />
          </div>
          
          <div className="w-full max-w-2xl flex flex-col items-center space-y-4 md:space-y-6">
            <button onClick={disconnectHelios} className="p-2 md:p-3 rounded-full border border-amber-900/30 bg-slate-950/40 text-amber-900/60 hover:text-red-500 transition-all flex items-center gap-2 px-4">
                <Power size={18}/> <span className="text-xs font-bold">REINICIAR</span>
            </button>

            <div className="w-full relative px-2 md:px-0">
                <div className="relative flex flex-col bg-slate-950/90 border-2 border-amber-600/40 rounded-xl md:rounded-2xl shadow-xl overflow-hidden transition-all focus-within:border-amber-400">
                    {pendingAttachment && (
                        <div className="flex items-center gap-2 px-4 py-2 bg-amber-900/20 border-b border-amber-500/10">
                            <span className="text-xs text-amber-300 truncate max-w-[200px]">📎 {pendingAttachment.file.name}</span>
                            <button onClick={() => setPendingAttachment(null)} className="text-amber-500 hover:text-red-400"><X size={14} /></button>
                        </div>
                    )}
                    <div className="relative flex items-center">
                        <Paperclip onClick={() => fileInputRef.current?.click()} className={`absolute left-3 md:left-4 cursor-pointer z-10 transition-colors ${pendingAttachment ? 'text-amber-400 fill-amber-900/50' : 'text-amber-500/40 hover:text-amber-500'}`} size={20} />
                        <input type="text" value={textInput} onChange={(e) => setTextInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} placeholder={isConnected ? (pendingAttachment ? "Analisa este ficheiro..." : "Pergunta ou pede código...") : "A iniciar..."} disabled={!isConnected} className="w-full bg-transparent p-4 md:p-6 pl-10 md:pl-14 pr-32 md:pr-40 text-amber-50 placeholder:text-amber-900/40 focus:outline-none font-mono text-base md:text-lg disabled:opacity-50" />
                        <div className="absolute right-2 flex items-center gap-1 md:gap-2">
                            <button onClick={() => setIsMuted(!isMuted)} className={`p-2 md:p-3 rounded-lg transition-all ${isMuted ? 'text-red-500 bg-red-950/20' : 'text-amber-500 hover:bg-amber-900/20'}`}>
                                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                            </button>
                            <button onClick={toggleMicrophone} className={`p-2 md:p-3 rounded-lg transition-all ${isListening ? 'text-red-500 bg-red-950/20 animate-pulse' : 'text-amber-500 hover:bg-amber-900/20'}`}>
                                {isListening ? <Mic size={20} /> : <MicOff size={20} />}
                            </button>
                            <button onClick={handleSendMessage} disabled={(!textInput.trim() && !pendingAttachment) || !isConnected} className={`p-2 md:p-3 rounded-lg ${textInput.trim() || pendingAttachment ? 'text-amber-400' : 'text-amber-900/30'}`}>
                                <Send size={22} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
          </div>
        </div>

        <div className="w-full lg:w-[600px] xl:w-[800px] h-[35vh] md:h-[50vh] lg:h-[80%] shrink-0 px-2 md:px-0 mb-4 md:mb-0">
          <div className="h-full bg-slate-950/60 rounded-xl overflow-hidden backdrop-blur-2xl border border-amber-500/20 shadow-2xl">
            <Terminal logs={logs} />
          </div>
        </div>
      </main>

      <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*,application/pdf" />
    </div>
  );
};

export default App;