import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage } from '@google/genai';
import { Mic, MicOff, Send, Calendar, Clock, ShieldCheck, Power, VolumeX, Volume2, Paperclip, X, Cpu } from 'lucide-react';
import { HeliosCore } from './components/HeliosCore';
import { Terminal } from './components/Terminal';
import { decodeAudioData, PCM_SAMPLE_RATE, base64ToUint8Array, floatTo16BitPcmBase64 } from './utils/audioUtils';

interface LogMessage {
  id: string;
  source: 'USER' | 'JARVIS' | 'SYSTEM' | 'ERROR';
  text: string;
  timestamp: string;
}

// CORREÇÃO 1: Adicionado o prefixo "models/" exigido pela API Live
const MODEL_NAME = 'models/gemini-2.0-flash-exp';

type Attachment = { file: File; base64: string; };

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
  const responseTimeoutRef = useRef<any>(null);

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

  const ensureAudioContext = async () => {
    if (!audioContextRef.current) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        audioContextRef.current = new AudioContextClass({ sampleRate: 24000 });
    }
    if (audioContextRef.current.state === 'suspended') await audioContextRef.current.resume();
  };

  const playAudioChunk = useCallback(async (base64Data: string) => {
    if (!audioContextRef.current || isMutedRef.current) return;
    const ctx = audioContextRef.current;
    if (ctx.state === 'suspended') await ctx.resume();

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

  const disconnectHelios = useCallback(() => {
    setIsConnected(false);
    setIsConnecting(false);
    addLog('SYSTEM', 'Sessão terminada.');
    if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
    }
    audioQueueRef.current.forEach(s => { try { s.stop(); } catch(e){} });
    audioQueueRef.current = [];
    if (sessionRef.current) {
        sessionRef.current.then((s: any) => { try { s.close(); } catch(e) {} });
        sessionRef.current = null;
    }
    if (responseTimeoutRef.current) clearTimeout(responseTimeoutRef.current);
  }, [addLog]);

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

  const connectToHelios = async (initialMessage?: string, initialAttachment?: Attachment) => {
    if (isConnecting || isConnected) return;
    setIsConnecting(true);
    try {
        addLog('SYSTEM', 'A iniciar Projecto IA Helios...');
        await ensureAudioContext();

        let stream = null;
        try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
        } catch (micError) {
            addLog('SYSTEM', 'Modo Texto Ativo (Mic off).');
            setIsMicOn(false);
            isMicOnRef.current = false;
        }

        clientRef.current = new GoogleGenAI({ apiKey: import.meta.env.VITE_GOOGLE_API_KEY });
        
        console.log("A iniciar ligação com o servidor da Google...");
        
        const sessionPromise = clientRef.current.live.connect({
            model: MODEL_NAME,
            config: {
                // CORREÇÃO 2: Removido o googleSearch para não bloquear a sessão e simplificar o Setup
                systemInstruction: {
                    parts: [{ text: `Tu és o H.E.L.I.O.S., uma IA avançada. Responde sempre em Português de Portugal. Foste criado pelo Simão.` }]
                },
                generationConfig: {
                    responseModalities: ["AUDIO"],
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Charon' } } }
                }
            },
            callbacks: {
                onopen: () => {
                    console.log("✅ WebSocket aberto. A aguardar Setup Complete...");
                    addLog('SYSTEM', 'Sistema Online.');
                    setIsConnected(true);
                    setIsConnecting(false);
                    
                    if (streamRef.current) {
                        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                        const inputCtx = new AudioContextClass({ sampleRate: PCM_SAMPLE_RATE });
                        const source = inputCtx.createMediaStreamSource(streamRef.current);
                        const processor = inputCtx.createScriptProcessor(4096, 1, 1);
                        processor.onaudioprocess = (e) => {
                            if (!isMicOnRef.current || !isConnected) return; 
                            const inputData = e.inputBuffer.getChannelData(0);
                            const base64Audio = floatTo16BitPcmBase64(inputData);
                            
                            sessionPromise.then(s => {
                                s.send({ realtimeInput: { mediaChunks: [{ mimeType: "audio/pcm;rate=24000", data: base64Audio }] } });
                            }).catch(() => {});
                        };
                        source.connect(processor);
                        processor.connect(inputCtx.destination);
                    }
                    if (initialAttachment || initialMessage) {
                        sessionPromise.then(async (s: any) => {
                            const parts: any[] = [];
                            if (initialAttachment) parts.push({ inlineData: { mimeType: initialAttachment.file.type, data: initialAttachment.base64 } });
                            if (initialMessage) parts.push({ text: initialMessage });
                            if (parts.length > 0) {
                                console.log("A enviar payload inicial:", parts);
                                s.send({ clientContent: { turns: [{ role: "user", parts: parts }], turnComplete: true } });
                            }
                        });
                    }
                },
                onmessage: (msg: LiveServerMessage) => {
                    if (responseTimeoutRef.current) clearTimeout(responseTimeoutRef.current);
                    
                    // ISTO VAI MOSTRAR-NOS EXATAMENTE O QUE O SERVIDOR ESTÁ A FAZER
                    console.log("📩 MENSAGEM DO SERVIDOR:", msg);
                    
                    if (msg.setupComplete) {
                        console.log("🔥 A GOOGLE ACEITOU A SESSÃO: H.E.L.I.O.S. ACORDOU!");
                    }

                    const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                    if (audioData) playAudioChunk(audioData);
                    
                    const textData = msg.serverContent?.modelTurn?.parts?.[0]?.text || '';
                    if (textData) currentTranscription.current += textData;

                    if (msg.serverContent?.turnComplete) {
                        if (currentTranscription.current) {
                            addLog('JARVIS', currentTranscription.current);
                            currentTranscription.current = '';
                        }
                    }
                },
                onclose: () => {
                    console.log("❌ WebSocket fechado.");
                    disconnectHelios();
                },
                onerror: (e) => {
                    console.error("❌ ERRO NO WEBSOCKET:", e);
                    addLog('ERROR', 'Erro de Ligação.');
                    setIsConnecting(false);
                    setIsConnected(false);
                }
            }
        });
        sessionRef.current = sessionPromise;
    } catch (e: any) { 
        addLog('ERROR', 'Sem acesso à rede.');
        setIsConnecting(false);
    }
  };

  const handleSendMessage = async () => {
    if ((!textInput.trim() && !pendingAttachment) || isConnecting) return;
    await ensureAudioContext();
    const msg = textInput;
    const attachment = pendingAttachment;
    setTextInput('');
    setPendingAttachment(null);
    if (msg) addLog('USER', msg);
    
    if (responseTimeoutRef.current) clearTimeout(responseTimeoutRef.current);
    responseTimeoutRef.current = setTimeout(() => {
        if (isConnected) addLog('ERROR', 'Sem resposta do servidor.');
    }, 20000);

    if (!isConnected) { 
        await connectToHelios(msg, attachment || undefined); 
    } else { 
        sessionRef.current.then(async (s: any) => {
            const parts: any[] = [];
            if (attachment) {
                 addLog('USER', `[A carregar anexo: ${attachment.file.name}...]`);
                 parts.push({ inlineData: { mimeType: attachment.file.type, data: attachment.base64 } });
            }
            if (msg) parts.push({ text: msg });
            else if (attachment) parts.push({ text: "Analisa este ficheiro/imagem." });

            console.log("A enviar nova mensagem:", parts);
            s.send({ clientContent: { turns: [{ role: "user", parts: parts }], turnComplete: true } });
        }).catch((e) => {
             console.error("Falha no envio local:", e);
             addLog('ERROR', 'Falha no envio.');
        }); 
    }
  };

  const toggleMic = async () => {
    await ensureAudioContext();
    const newState = !isMicOn;
    setIsMicOn(newState);
    isMicOnRef.current = newState;
    addLog('SYSTEM', `Mic ${newState ? 'ON' : 'OFF'}`);
  };

  return (
    <div onClick={ensureAudioContext} className="flex flex-col h-screen w-full bg-[#020617] text-amber-500 p-4 md:p-8 lg:p-10 overflow-hidden relative font-sans">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] md:w-[800px] h-[300px] md:h-[800px] bg-amber-600/5 rounded-full blur-[80px] md:blur-[150px] pointer-events-none opacity-40"></div>
      
      <header className="relative z-10 flex flex-col md:flex-row justify-between items-center md:items-start mb-6 shrink-0 gap-4">
        <div className="flex flex-col items-center md:items-start">
          <h1 className="text-3xl md:text-5xl font-black tracking-widest text-amber-500 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)] uppercase font-['Orbitron']">H.E.L.I.O.S.</h1>
          <div className="flex items-center gap-2 text-[10px] md:text-[11px] uppercase tracking-[0.2em] md:tracking-[0.5em] text-amber-600/70 mt-1 text-center md:text-left">
            <Cpu size={12} className="text-amber-500" /> 
            <span>Projecto IA Helios | V3.5 UlTM</span>
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
            <HeliosCore isActive={isConnected || isConnecting} isSpeaking={isSpeaking} volume={volume} questionCount={questionCount} />
          </div>
          
          <div className="w-full max-w-2xl flex flex-col items-center space-y-4 md:space-y-6">
            {isConnected && (
                <button onClick={disconnectHelios} className="p-2 md:p-3 rounded-full border border-amber-900/30 bg-slate-950/40 text-amber-900/60 hover:text-red-500 transition-all flex items-center gap-2 px-4">
                    <Power size={18}/> <span className="text-xs font-bold">REINICIAR</span>
                </button>
            )}

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
                        <input type="text" value={textInput} onChange={(e) => setTextInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} placeholder={isConnected ? (pendingAttachment ? "Analisa este ficheiro..." : "Pergunta ou pede código...") : "Clica para iniciar..."} className="w-full bg-transparent p-4 md:p-6 pl-10 md:pl-14 pr-32 md:pr-40 text-amber-50 placeholder:text-amber-900/40 focus:outline-none font-mono text-base md:text-lg" />
                        <div className="absolute right-2 flex items-center gap-1 md:gap-2">
                            <button onClick={() => setIsMuted(!isMuted)} className={`p-2 md:p-3 rounded-lg transition-all ${isMuted ? 'text-red-500 bg-red-950/20' : 'text-amber-500 hover:bg-amber-900/20'}`}>
                                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                            </button>
                            <button onClick={toggleMic} className={`p-2 md:p-3 rounded-lg transition-all ${isMicOn ? 'text-amber-500' : 'text-red-500 bg-red-950/20'}`}>
                                {isMicOn ? <Mic size={20} /> : <MicOff size={20} />}
                            </button>
                            <button onClick={handleSendMessage} disabled={(!textInput.trim() && !pendingAttachment) || isConnecting} className={`p-2 md:p-3 rounded-lg ${textInput.trim() || pendingAttachment ? 'text-amber-400' : 'text-amber-900/30'}`}>
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