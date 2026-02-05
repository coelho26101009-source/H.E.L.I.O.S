import React, { useEffect, useRef, useState } from 'react';
import { LogMessage } from '../types';

interface TerminalProps {
  logs: LogMessage[];
}

export const Terminal: React.FC<TerminalProps> = ({ logs }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    setIsAutoScrollEnabled(isAtBottom);
  };

  useEffect(() => {
    if (isAutoScrollEnabled && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [logs, isAutoScrollEnabled]);

  return (
    <div className="h-full w-full font-mono text-[16px] overflow-hidden flex flex-col">
      <div className="bg-amber-950/20 px-4 py-3 border-b border-amber-900/30 flex justify-between items-center shrink-0">
        <div className="flex flex-col">
          <span className="text-amber-500 font-bold uppercase tracking-widest text-[12px]">Interface de Comando H.E.L.I.O.S.</span>
          {!isAutoScrollEnabled && (
            <span className="text-[10px] text-orange-500 animate-pulse uppercase mt-1">Modo de Leitura Ativo</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_#22c55e]"></div>
          <span className="text-amber-700 text-[10px] uppercase tracking-wider font-bold">Encriptação Ativa</span>
        </div>
      </div>
      
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar scroll-smooth"
      >
        {logs.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full opacity-30 italic space-y-2">
            <span className="text-amber-900 text-lg">Aguardando entrada de dados neurais...</span>
          </div>
        )}
        {logs.map((log) => (
          <div key={log.id} className="flex flex-col space-y-1.5 border-l-2 border-amber-900/20 pl-4 group transition-all hover:border-amber-500/50">
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-amber-900 font-bold">[{log.timestamp}]</span>
              <span className={`text-[13px] font-black tracking-wider uppercase ${
                log.source === 'JARVIS' ? 'text-amber-400' : 
                log.source === 'SYSTEM' ? 'text-orange-500' : 'text-slate-400'
              }`}>
                {log.source === 'JARVIS' ? 'HELIOS CORE' : log.source}
              </span>
            </div>
            {/* AQUI ESTÁ O TEXTO DAS MENSAGENS AUMENTADO */}
            <p className="text-amber-50/90 leading-relaxed font-mono text-[17px] tracking-tight break-words group-hover:text-white transition-colors">
              {log.text}
            </p>
          </div>
        ))}
        
        {!isAutoScrollEnabled && logs.length > 0 && (
          <button 
            onClick={() => setIsAutoScrollEnabled(true)}
            className="sticky bottom-2 left-1/2 -translate-x-1/2 bg-amber-600/30 hover:bg-amber-500/50 border border-amber-500/50 text-amber-400 text-[10px] px-4 py-2 rounded-full backdrop-blur-lg transition-all shadow-2xl uppercase tracking-widest font-bold"
          >
            Voltar ao tempo real
          </button>
        )}
      </div>
    </div>
  );
};
