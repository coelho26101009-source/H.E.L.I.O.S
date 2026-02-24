import React from 'react';

interface HeliosCoreProps {
  isActive: boolean;
  isSpeaking: boolean;
  volume?: number;
  questionCount?: number;
}

export const HeliosCore: React.FC<HeliosCoreProps> = ({ isActive, isSpeaking }) => {
  return (
    <div className="relative flex items-center justify-center w-64 h-64 md:w-80 md:h-80">

      {/* Anel Exterior - Linha super subtil e planeta pequenino */}
      <div className={`absolute w-[95%] h-[95%] rounded-full border-[0.5px] border-slate-500/20 ${isActive ? 'animate-[spin_20s_linear_infinite]' : ''}`}>
        {isActive && (
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white/80 rounded-full shadow-[0_0_3px_rgba(255,255,255,0.4)]"></div>
        )}
      </div>

      {/* Anel Intermédio */}
      <div className={`absolute w-[70%] h-[70%] rounded-full border-[0.5px] border-slate-500/20 ${isActive ? 'animate-[spin_12s_linear_infinite_reverse]' : ''}`}>
         {isActive && (
           <div className="absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-white/80 rounded-full shadow-[0_0_3px_rgba(255,255,255,0.4)]"></div>
         )}
      </div>

      {/* Anel Interior */}
      <div className={`absolute w-[45%] h-[45%] rounded-full border-[0.5px] border-slate-500/20 ${isActive ? 'animate-[spin_7s_linear_infinite]' : ''}`}>
        {isActive && (
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-1 h-1 bg-white/80 rounded-full shadow-[0_0_3px_rgba(255,255,255,0.4)]"></div>
        )}
      </div>

      {/* O NÚCLEO DISCRETO - Laranja escuro, sem brilho exagerado */}
      <div className={`relative w-24 h-24 md:w-28 md:h-28 rounded-full z-10 transition-all duration-700 ${
          isActive
            ? 'bg-gradient-to-br from-amber-500 to-amber-700 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
            : 'bg-slate-800 border border-slate-700'
        }`}>

        {/* Efeito de Voz suave */}
        {isSpeaking && (
          <div className="absolute inset-0 rounded-full bg-amber-500/20 blur-sm animate-ping"></div>
        )}
      </div>

    </div>
  );
};