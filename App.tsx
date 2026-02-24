import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Mic, MicOff, Send, Calendar, Clock, ShieldCheck, Power, VolumeX, Volume2, Paperclip, X, Cpu } from 'lucide-react';
import { HeliosCore } from './components/HeliosCore';
import { Terminal } from './components/Terminal';

interface LogMessage {
  id: string;
  source: 'USER' | 'JARVIS' | 'SYSTEM' | 'ERROR';
  text: string;
  timestamp: string;
}

const MODEL_NAME = 'gemini-2.5-flash';

type Attachment = { file: File; base64: string; };

const App: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [textInput, setTextInput] = useState('');
  const [currentTime, setCurrentTime] = useState('--:--:--');
  const [currentDate, setCurrentDate] = useState('--/--');
  const [pendingAttachment, setPendingAttachment] = useState<Attachment | null>(null);

  const isMutedRef = useRef(isMuted);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const questionCount = logs.filter(l => l.source === 'USER').length;

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

  useEffect(() => {
    const startHelios = () => {
        setIsConnecting(true);
        addLog('SYSTEM', 'A iniciar Projecto IA Helios...');
        setTimeout(() => {
            addLog('SYSTEM', 'Sistema Online.');
            setIsConnected(true);
            setIsConnecting(false);
        }, 1500);
    };
    startHelios();
  }, [addLog]);

  const disconnectHelios = () => {
    setIsConnected(false);
    addLog('SYSTEM', 'Sessão terminada.');
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    
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
      if (isMutedRef.current) return;
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

  const handleSendMessage = async () => {
    if ((!textInput.trim() && !pendingAttachment) || isConnecting) return;
    
    const msg = textInput;
    const attachment = pendingAttachment;
    setTextInput('');
    setPendingAttachment(null);
    
    addLog('USER', msg || `[Ficheiro anexado: ${attachment?.file.name}]`);
    
    if (!isConnected) { 
        addLog('ERROR', 'Sem resposta do servidor.');
        return; 
    }

    try {
        setIsSpeaking(true); 
        const genAI = new GoogleGenAI({ apiKey: import.meta.env.VITE_GOOGLE_API_KEY });
        
        const parts: any[] = [];
        if (msg) parts.push({ text: msg });
        if (attachment) {
            parts.push({ inlineData: { data: attachment.base64, mimeType: attachment.file.type } });
        }

        const response = await genAI.models.generateContent({
            model: MODEL_NAME,
            contents: parts,
            config: {
                systemInstruction: "Tu és o H.E.L.I.O.S., uma IA avançada desenvolvida pelo Simão. O teu foco é Informática e Sistemas. Fala de forma muito natural, coloquial e amigável em Português de Portugal. Dá respostas diretas e úteis, como se fosses um parceiro de trabalho ao lado dele."
            }
        });

        const replyText = response.text || "Sem resposta.";
        addLog('JARVIS', replyText);
        speakText(replyText);

    } catch (e: any) { 
        console.error(e);
        addLog('ERROR', 'Falha na comunicação.');
        setIsSpeaking(false);
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-[#020617] text-amber-500 p-4 md:p-8 lg:p-10 overflow-hidden relative font-sans">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] md:w-[800px] h-[300px] md:h-[800px] bg-amber-600/5 rounded-full blur-[80px] md:blur-[150px] pointer-events-none opacity-40"></div>
      
      <header className="relative z-10 flex flex-col md:flex-row justify-between items-center md:items-start mb-6 shrink-0 gap-4">
        <div className="flex flex-col items-center md:items-start">
          <h1 className="text-3xl md:text-5xl font-black tracking-widest text-amber-500 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)] uppercase font-['Orbitron']">H.E.L.I.O.S.</h1>
          <div className="flex items-center gap-2 text-[10px] md:text-[11px] uppercase tracking-[0.2em] md:tracking-[0.5em] text-amber-600/70 mt-1 text-center md:text-left">
            <Cpu size={12} className="text-amber-500" /> 
            <span>Projecto IA Helios | V4.0 STD</span>
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
                            <button onClick={() => setIsMicOn(!isMicOn)} className={`p-2 md:p-3 rounded-lg transition-all ${isMicOn ? 'text-amber-500' : 'text-amber-900/30'}`}>
                                {isMicOn ? <Mic size={20} /> : <MicOff size={20} />}
                            </button>
                            <button onClick={handleSendMessage} disabled={(!textInput.trim() && !pendingAttachment) || !isConnected || isSpeaking} className={`p-2 md:p-3 rounded-lg ${textInput.trim() || pendingAttachment ? 'text-amber-400' : 'text-amber-900/30'}`}>
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
