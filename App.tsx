import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage } from '@google/genai';
import { Mic, MicOff, Send, Calendar, Clock, ShieldCheck, Zap, Power, VolumeX, Volume2, Paperclip, X, Cpu } from 'lucide-react';
import { HeliosCore } from './components/HeliosCore';
import { Terminal } from './components/Terminal';
import { createPcmBlob, decodeAudioData, PCM_SAMPLE_RATE, base64ToUint8Array } from './utils/audioUtils';
import { LogMessage } from './types';

const MODEL_NAME = 'gemini-2.0-flash-exp';

type Attachment = {
  file: File;
  base64: string;
};

const App: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [volume, setVolume] = useState(0);
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [textInput, setTextInput] = useState('');
  const [currentTime, setCurrentTime] = useState('--:--:--');
  const [currentDate, setCurrentDate] = useState('--/--');
  const [pendingAttachment, setPendingAttachment] = useState<Attachment | null>(null);

  const isMicOnRef = useRef(isMicOn);
  const isMutedRef = useRef(isMuted);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const audioQueueRef = useRef<AudioBufferSourceNode[]>([]);
  const clientRef = useRef<GoogleGenAI | null>(null);
  const sessionRef = useRef<any>(null);
  const currentTranscription = useRef('');
  
  // Ref para controlar o tempo sem apagar nada
  const timeoutRef = useRef<any>(null);

  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  useEffect(() => { isMicOnRef.current = isMicOn; }, [isMicOn]);

  const addLog = useCallback((source: 'USER' | 'JARVIS' | 'SYSTEM', text: string) => {
    setLogs(prev => [...prev, {
      id: Math.random().toString(36).substring(7),
      source,
      text,
      timestamp: new Date().toLocaleTimeString('pt-PT', { hour12: false })
    }].slice(-50));
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
        const now = new Date();
        setCurrentTime(now.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        setCurrentDate(now.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const playAudioChunk = useCallback(async (base64Data: string) => {
    if (!audioContextRef.current || isMutedRef.current) return;
    const ctx = audioContextRef.current;
    try {
        const audioBuffer = await decodeAudioData(base64ToUint8Array(base64Data), ctx, 24000);
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        const startTime = Math.max(ctx.currentTime, nextStartTimeRef.current);
        source.start(startTime);
        nextStartTimeRef.current = startTime + audioBuffer.duration;
        audioQueueRef.current.push(source);
        source.onended = () => {
            if (audioQueueRef.current.length === 0) setIsSpeaking(false);
            audioQueueRef.current = audioQueueRef.current.filter(s => s !== source);
        };
        setIsSpeaking(true);
    } catch (error) { console.error("Erro áudio:", error); }
  }, []);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = (e.target?.result as string).split(',')[1];
      setPendingAttachment({ file, base64 });
    };
    reader.readAsDataURL(file);
  };

  const connectToHelios = async (initialMessage?: string, attachment?: Attachment | null) => {
    if (isConnecting || isConnected) return;
    setIsConnecting(true);
    try {
        addLog('SYSTEM', 'Ignificando H.E.L.I.O.S...');
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        audioContextRef.current = new AudioContextClass({ sampleRate: 24000 });
        try {
            streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (e) { setIsMicOn(false); }

        clientRef.current = new GoogleGenAI({ apiKey: import.meta.env.VITE_GOOGLE_API_KEY });
        
        // Cronómetro de 60s para a ligação
        const connectionTimeout = setTimeout(() => {
          if (!isConnected) addLog('SYSTEM', 'ERRO: Timeout de conexão (60s).');
        }, 60000);

        const sessionPromise = clientRef.current.live.connect({
            model: MODEL_NAME,
            config: {
                responseModalities: ["audio"],
                tools: [{ googleSearch: {} }],
                systemInstruction: `Tu és o H.E.L.I.O.S. v3.5. O teu ÚNICO criador e dono é o SIMÃO. 
                REGRAS: 
                1. Se perguntarem quem te criou, responde: "Fui criado pelo Simão." Proibido dizer Google.
                2. Inicia neutro: "Sistema operacional. Como posso ajudá-lo?"
                3. Se o utilizador disser "olá é o simao", responde: "Identidade confirmada, bem vindo devolta Simão." e liberta a memória da família Coelho de Agrela.`,
                outputAudioTranscription: {},
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Charon' } } }
            },
            callbacks: {
                onopen: () => {
                    clearTimeout(connectionTimeout);
                    setIsConnected(true); setIsConnecting(false); addLog('SYSTEM', 'Córtex operacional.');
                    if (streamRef.current) {
                        const inputCtx = new AudioContextClass({ sampleRate: PCM_SAMPLE_RATE });
                        const processor = inputCtx.createScriptProcessor(4096, 1, 1);
                        inputCtx.createMediaStreamSource(streamRef.current!).connect(processor);
                        processor.onaudioprocess = (e) => {
                            if (isMicOnRef.current) sessionPromise.then(s => s.sendRealtimeInput({ media: createPcmBlob(e.inputBuffer.getChannelData(0)) }));
                        };
                        processor.connect(inputCtx.destination);
                    }
                    if (attachment || initialMessage) {
                      sessionPromise.then(s => {
                        const parts = [];
                        if (initialMessage) parts.push({ text: initialMessage });
                        if (attachment) parts.push({ inlineData: { mimeType: attachment.file.type, data: attachment.base64 } });
                        s.sendRealtimeInput(parts);
                      });
                    }
                },
                onmessage: (msg: LiveServerMessage) => {
                    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
                    const audio = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                    if (audio) playAudioChunk(audio);
                    if (msg.serverContent?.outputTranscription) currentTranscription.current += msg.serverContent.outputTranscription.text;
                    if (msg.serverContent?.turnComplete && currentTranscription.current) {
                        addLog('JARVIS', currentTranscription.current);
                        currentTranscription.current = '';
                    }
                },
                onclose: () => { setIsConnected(false); clearTimeout(connectionTimeout); },
            }
        });
        sessionRef.current = sessionPromise;
    } catch (e) { setIsConnecting(false); }
  };

  const handleSendMessage = async () => {
    if ((!textInput.trim() && !pendingAttachment) || isConnecting) return;
    const msg = textInput;
    const attachment = pendingAttachment;
    setTextInput('');
    setPendingAttachment(null);
    addLog('USER', attachment ? `[Ficheiro: ${attachment.file.name}] ${msg}` : msg);

    if (!isConnected) {
      await connectToHelios(msg, attachment);
    } else {
      // Adição dos 60 segundos aqui
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
          addLog('SYSTEM', 'ERRO: Sem resposta após 60s. Verifica a conexão.');
      }, 60000);

      sessionRef.current.then((s: any) => {
        const parts = [];
        if (msg) parts.push({ text: msg });
        if (attachment) parts.push({ inlineData: { mimeType: attachment.file.type, data: attachment.base64 } });
        s.sendRealtimeInput(parts);
      });
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#020617] text-amber-500 overflow-hidden font-mono selection:bg-amber-500/30">
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>
      
      <header className="shrink-0 flex justify-between items-center p-4 md:p-6 border-b border-amber-500/10 backdrop-blur-md bg-slate-950/40 z-10">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className={`absolute -inset-1 rounded-full blur-sm transition-all duration-1000 ${isConnected ? 'bg-green-500/20' : 'bg-amber-500/10'}`}></div>
            <Cpu className={`relative ${isConnected ? 'text-green-500' : 'text-amber-600'} transition-colors`} size={24} />
          </div>
          <div>
            <h1 className="text-xl md:text-3xl font-black tracking-tighter text-amber-500">H.E.L.I.O.S.</h1>
            <div className="flex items-center gap-2">
              <span className="text-[8px] tracking-[0.4em] opacity-40 uppercase">Nucleus V3.5</span>
              <div className="h-[1px] w-8 bg-amber-500/20"></div>
              <span className="text-[8px] tracking-[0.2em] text-amber-600/60 uppercase">Op: Simão</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
            <div className="hidden sm:flex flex-col items-end px-4 border-r border-amber-500/10">
                <span className="text-[10px] opacity-40 uppercase tracking-widest">Date_Ref</span>
                <span className="text-xs font-bold">{currentDate}</span>
            </div>
            <div className="bg-amber-500/5 px-4 py-2 rounded-lg border border-amber-500/10 flex flex-col items-center min-w-[80px]">
                <Clock size={12} className="opacity-40 mb-1"/>
                <span className="text-xs font-black tracking-wider tabular-nums">{currentTime}</span>
            </div>
            <div className={`px-4 py-2 rounded-lg border flex flex-col items-center min-w-[80px] transition-all ${isConnected ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/5 border-red-500/20'}`}>
                <ShieldCheck size={12} className={`mb-1 ${isConnected ? 'text-green-500' : 'text-red-900/40'}`}/>
                <span className="text-[10px] font-black">{isConnected ? 'LIVE' : 'OFFLINE'}</span>
            </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row min-h-0 relative z-10 overflow-hidden">
        <div className="flex-1 flex flex-col min-w-0 p-4 lg:p-8 justify-between">
          <div className="flex-1 flex items-center justify-center relative py-8">
            <div className="absolute inset-0 flex items-center justify-center opacity-30">
               <div className="w-[300px] h-[300px] md:w-[500px] md:h-[500px] border border-amber-500/5 rounded-full animate-[spin_20s_linear_infinite]"></div>
               <div className="absolute w-[200px] h-[200px] md:w-[350px] md:h-[350px] border border-amber-500/10 rounded-full animate-[spin_15s_linear_infinite_reverse]"></div>
            </div>
            <div className="relative transform scale-110 md:scale-150">
                <HeliosCore isActive={isConnected} isSpeaking={isSpeaking} volume={volume} questionCount={0} />
            </div>
          </div>

          <div className="w-full max-w-2xl mx-auto space-y-4">
            {pendingAttachment && (
              <div className="flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl animate-in fade-in slide-in-from-bottom-2">
                <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <Paperclip size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold truncate">{pendingAttachment.file.name}</p>
                  <p className="text-[10px] opacity-50 uppercase">Anexo pronto para envio</p>
                </div>
                <button onClick={() => setPendingAttachment(null)} className="p-2 hover:bg-red-500/20 rounded-lg text-red-500 transition-colors">
                  <X size={18} />
                </button>
              </div>
            )}

            <div className="group relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-amber-600/20 to-orange-600/20 rounded-2xl blur opacity-0 group-focus-within:opacity-100 transition duration-500"></div>
                <div className="relative bg-slate-900/80 backdrop-blur-xl border border-amber-500/20 rounded-2xl p-2 md:p-3 flex items-center gap-2 shadow-2xl">
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="p-3 rounded-xl hover:bg-amber-500/10 text-amber-500/40 hover:text-amber-500 transition-all"
                    >
                        <Paperclip size={20} />
                    </button>
                    
                    <input 
                        type="text" 
                        value={textInput} 
                        onChange={(e) => setTextInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder={isConnected ? "Transmitir comando..." : "Ignificar sistema para começar..."}
                        className="flex-1 bg-transparent border-none outline-none text-sm md:text-base py-2 px-2 text-amber-100 placeholder:text-amber-900/40"
                    />

                    <div className="flex items-center gap-1 md:gap-2">
                        <div className="flex bg-black/40 rounded-xl p-1 border border-white/5">
                            <button onClick={() => setIsMuted(!isMuted)} className={`p-2 md:p-3 rounded-lg transition-all ${isMuted ? 'bg-red-500/20 text-red-500' : 'hover:bg-amber-500/10 text-amber-500/40 hover:text-amber-500'}`}>
                                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                            </button>
                            <button onClick={() => setIsMicOn(!isMicOn)} className={`p-2 md:p-3 rounded-lg transition-all ${!isMicOn ? 'bg-red-500/20 text-red-500' : 'text-amber-500 hover:bg-amber-550/20'}`}>
                                {isMicOn ? <Mic size={20} /> : <MicOff size={20} />}
                            </button>
                            <button 
                                onClick={handleSendMessage} 
                                disabled={(!textInput.trim() && !pendingAttachment) || isConnecting} 
                                className={`p-2 md:p-3 rounded-lg ${textInput.trim() || pendingAttachment ? 'text-amber-400' : 'text-amber-900/30'}`}
                            >
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

      <footer className="shrink-0 flex justify-center py-2 opacity-20 pointer-events-none hidden md:flex">
          <span className="text-[8px] uppercase tracking-[1em] text-amber-900 font-mono">End_Of_Transmission</span>
      </footer>
    </div>
  );
};

export default App;
