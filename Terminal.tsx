import React, { useEffect, useRef, useState } from 'react';
import { LogMessage } from '../types';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check, Terminal as TerminalIcon } from 'lucide-react';

interface TerminalProps {
  logs: LogMessage[];
}

const CopyButton = ({ text }: { text: string }) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <button 
      onClick={handleCopy} 
      className="absolute top-2 right-2 p-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white/70 transition-all flex items-center gap-1.5 text-xs z-10"
      title="Copiar código"
    >
      {isCopied ? (
        <>
          <Check size={14} className="text-green-400" />
          <span className="text-green-400 font-bold">Copiado!</span>
        </>
      ) : (
        <>
          <Copy size={14} />
          <span>Copiar</span>
        </>
      )}
    </button>
  );
};

export const Terminal: React.FC<TerminalProps> = ({ logs }) => {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="w-full h-full flex flex-col bg-[#0f111a] font-mono text-sm relative overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-[#1a1d2d] border-b border-white/5 shrink-0">
        <div className="flex items-center gap-2 text-amber-500/80">
          <TerminalIcon size={16} />
          <span className="font-bold tracking-wider text-xs uppercase">Helios Output Log</span>
        </div>
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500/20 border border-amber-500/50"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500/50"></div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-amber-900/20 scrollbar-track-transparent">
        {logs.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-white/10 select-none">
            <TerminalIcon size={48} className="mb-4 opacity-20" />
            <p className="uppercase tracking-[0.2em] text-xs">A aguardar input...</p>
          </div>
        )}

        {logs.map((log) => (
          <div key={log.id} className={`group flex gap-3 ${log.source === 'USER' ? 'flex-row-reverse' : ''} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
            <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center border text-[10px] font-bold shadow-lg mt-1
              ${log.source === 'USER' ? 'bg-amber-500/10 border-amber-500/30 text-amber-500' : 
                log.source === 'ERROR' ? 'bg-red-500/10 border-red-500/30 text-red-500' : 
                'bg-cyan-500/10 border-cyan-500/30 text-cyan-500'}`}
            >
              {log.source === 'USER' ? 'EU' : log.source === 'ERROR' ? 'ERR' : 'IA'}
            </div>

            <div className={`flex flex-col max-w-[85%] ${log.source === 'USER' ? 'items-end' : 'items-start'}`}>
              <span className="text-[10px] text-white/30 mb-1 px-1 flex items-center gap-1">
                {log.timestamp} {log.source !== 'USER' && '• H.E.L.I.O.S.'}
              </span>
              
              <div className={`relative px-4 py-3 rounded-2xl border backdrop-blur-sm overflow-hidden w-full
                ${log.source === 'USER' ? 'bg-amber-500/10 border-amber-500/20 text-amber-100 rounded-tr-sm' : 
                  log.source === 'ERROR' ? 'bg-red-900/10 border-red-500/20 text-red-200 rounded-tl-sm' : 
                  'bg-[#1e2235] border-white/10 text-gray-100 rounded-tl-sm'}`}
              >
                <ReactMarkdown
                  components={{
                    code({ node, inline, className, children, ...props }: any) {
                      const match = /language-(\w+)/.exec(className || '');
                      return !inline && match ? (
                        <div className="relative my-4 rounded-lg overflow-hidden border border-white/10 shadow-2xl bg-[#0d0d0d]">
                          <div className="flex items-center justify-between px-4 py-2 bg-[#1a1a1a] border-b border-white/5">
                            <span className="text-xs text-amber-500 font-bold uppercase tracking-wider">{match[1]}</span>
                            <CopyButton text={String(children).replace(/\n$/, '')} />
                          </div>
                          <SyntaxHighlighter style={vscDarkPlus} language={match[1]} PreTag="div" className="!bg-[#0d0d0d] !p-4 !m-0 !overflow-x-auto text-sm" {...props}>
                            {String(children).replace(/\n$/, '')}
                          </SyntaxHighlighter>
                        </div>
                      ) : (
                        <code className="bg-black/30 px-1.5 py-0.5 rounded text-amber-300 font-mono text-xs border border-amber-500/10" {...props}>{children}</code>
                      );
                    }
                  }}
                >
                  {log.text}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
};
