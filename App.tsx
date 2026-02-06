import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage } from '@google/genai';
import { Mic, MicOff, Send, Calendar, Clock, ShieldCheck, Zap, Power, VolumeX, Volume2, Paperclip } from 'lucide-react';
import { HeliosCore } from './components/HeliosCore';
import { Terminal } from './components/Terminal';
import { createPcmBlob, decodeAudioData, PCM_SAMPLE_RATE, base64ToUint8Array } from './utils/audioUtils';
import { LogMessage } from './types';

const MODEL_NAME = 'gemini-2.0-flash-exp';

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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !isConnected) return;
    addLog('SYSTEM', `A analisar: ${file.name}...`);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64Content = (e.target?.result as string).split(',')[1];
      sessionRef.current.then((s: any) => {
        s.sendRealtimeInput([
          { text: `Simão enviou este ficheiro: ${file.name}. Analisa o conteúdo.` },
          { inlineData: { mimeType: file.type, data: base64Content } }
        ]);
      });
      addLog('USER', `[Ficheiro: ${file.name}]`);
    };
    reader.readAsDataURL(file);
  };

  const connectToHelios = async (initialMessage?: string) => {
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
                    if (initialMessage) sessionPromise.then((s: any) => s.sendRealtimeInput({ text: initialMessage }));
                },
                onmessage: (msg: LiveServerMessage) => {
                    const audio = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                    if (audio) playAudioChunk(audio);
                    if (msg.serverContent?.outputTranscription) currentTranscription.current += msg.serverContent.outputTranscription.text;
                    if (msg.serverContent?.turnComplete && currentTranscription.current) {
                        addLog('JARVIS', currentTranscription.current);
                        currentTranscription.current = '';
                    }
                },
                onclose: () => setIsConnected(false),
            }
        });
        sessionRef.current = sessionPromise;
    } catch (e) { setIsConnecting(false); }
  };

  const handleSendMessage = async () => {
    if (!textInput.trim() || isConnecting) return;
    const msg = textInput; 
    setTextInput(''); 
    addLog('USER', msg);
    
    if (!isConnected) {
      await connectToHelios(msg);
    } else {
      // TIMEOUT DE 60 SEGUNDOS ADICIONADO AQUI
      const timeoutId = setTimeout(() => {
        addLog('SYSTEM', 'ERRO: Sem resposta dos servidores após 60s. Verifica a conexão.');
      }, 60000);

      sessionRef.current.then((s: any) => {
        s.sendRealtimeInput({ text: msg });
        // O timeout será ignorado assim que chegar uma mensagem no onmessage do session
      });
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#020617] text-amber-500 overflow-hidden p-2 md:p-4 font-mono">
      <header className="flex justify-between items-center mb-2 shrink-0 border-b border-amber-500/10 pb-2">
        <div>
          <h1 className="text-xl md:text-3xl font-black text-amber-500">H.E.L.I.O.S.</h1>
          <p className="text-[8px] tracking-[0.3em] opacity-40">NUCLEUS V3.5 / OPERATOR: SIMÃO</p>
        </div>
        <div className="flex gap-2">
            <div className="bg-slate-900/40 p-1.5 rounded border border-amber-500/20 text-center min-w-[60px]">
                <Clock size={10} className="mx-auto opacity-50"/>
                <span className="text-[10px]">{currentTime}</span>
            </div>
            <div className={`bg-slate-900/40 p-1.5 rounded border border-amber-500/20 text-center min-w-[60px] ${isConnected ? 'border-green-500/50' : ''}`}>
                <ShieldCheck size={10} className={`mx-auto ${isConnected ? 'text-green-500' : 'text-amber-900'}`}/>
                <span className="text-[10px]">{isConnected ? 'LIVE' : 'OFF'}</span>
            </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0 overflow-hidden">
        <div className="flex-[1.3] flex flex-col items-center justify-center bg-slate-950/20 rounded-2xl border border-white/5 relative p-4">
            <div className="flex-1 flex items-center justify-center transform scale-90">
                <HeliosCore isActive={isConnected} isSpeaking={isSpeaking} volume={volume} questionCount={0} />
            </div>
            <div className="w-full max-w-lg space-y-4">
                <div className="flex justify-center gap-3">
                    <button onClick={() => setIsMuted(!isMuted)} className={`p-3 rounded-full border transition-all ${isMuted ? 'bg-red-500/20 border-red-500 text-red-500' : 'bg-amber-500/10 border-amber-500/40 text-amber-500'}`}>
                        {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                    </button>
                    <button onClick={() => setIsMicOn(!isMicOn)} className={`p-3 rounded-full border transition-all ${!isMicOn ? 'bg-red-500/20 border-red-500 text-red-500' : 'bg-amber-500/10 border-amber-500/40 text-amber-500'}`}>
                        {isMicOn ? <Mic size={18} /> : <MicOff size={18} />}
                    </button>
                </div>
                <div className="relative">
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*,application/pdf,text/*"/>
                    <input 
                        type="text" value={textInput} onChange={(e) => setTextInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder="Comando..."
                        className="w-full bg-slate-900/90 border border-amber-500/30 rounded-xl p-4 pl-12 pr-12 text-sm outline-none focus:border-amber-500"
                    />
                    <Paperclip onClick={() => fileInputRef.current?.click()} className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-500/40 hover:text-amber-500 cursor-pointer" size={18} />
                    <Send onClick={handleSendMessage} className="absolute right-4 top-1/2 -translate-y-1/2 text-amber-500/40 hover:text-amber-500 cursor-pointer" size={18} />
                </div>
            </div>
        </div>
        <div className="flex-1 bg-black/20 rounded-2xl border border-amber-500/5 overflow-hidden flex flex-col">
            <Terminal logs={logs} />
        </div>
      </main>
    </div>
  );
};

export default App;
