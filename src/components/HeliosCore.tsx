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
      
      {/* Anel Exterior (Órbita Larga) */}
      <div className={`absolute w-full h-full rounded-full border border-slate-700/60 ${isActive ? 'animate-[spin_15s_linear_infinite]' : ''}`}>
        {isActive && <div className="absolute top-[14%] left-[14%] w-2 h-2 bg-white rounded-full shadow-[0_0_8px_#fff]"></div>}
      </div>

      {/* Anel Intermédio (Órbita Média) */}
      <div className={`absolute w-[75%] h-[75%] rounded-full border border-slate-700/60 ${isActive ? 'animate-[spin_10s_linear_infinite_reverse]' : ''}`}>
         {isActive && <div className="absolute bottom-[10%] right-[20%] w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_8px_#fff]"></div>}
      </div>

      {/* Anel Interior (Órbita Curta) */}
      <div className={`absolute w-[50%] h-[50%] rounded-full border border-slate-700/60 ${isActive ? 'animate-[spin_6s_linear_infinite]' : ''}`}>
        {isActive && <div className="absolute top-[15%] right-[15%] w-2 h-2 bg-white rounded-full shadow-[0_0_8px_#fff]"></div>}
      </div>

      {/* O NÚCLEO ORIGINAL (Liso e Elegante) */}
      <div className={`relative w-24 h-24 md:w-28 md:h-28 rounded-full z-10 transition-all duration-700 ${
          isActive 
            ? 'bg-gradient-to-br from-amber-400 to-orange-600 shadow-[0_0_40px_rgba(245,158,11,0.4)]' 
            : 'bg-slate-800 border-2 border-slate-700'
        }`}>
        
        {/* Efeito de Voz (Ondas que pulsam subtilmente) */}
        {isSpeaking && (
          <div className="absolute inset-0 rounded-full bg-amber-400/40 animate-ping"></div>
        )}
      </div>

    </div>
  );
};