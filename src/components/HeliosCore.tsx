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

      {/* Anel Exterior (A Órbita Maior) */}
      <div className={`absolute w-full h-full rounded-full border border-slate-700/60 ${isActive ? 'animate-[spin_15s_linear_infinite]' : ''}`}>
        {/* Planeta Branco na linha */}
        {isActive && (
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full shadow-[0_0_12px_#fff]"></div>
        )}
      </div>

      {/* Anel Intermédio (A Órbita do Meio) */}
      <div className={`absolute w-[75%] h-[75%] rounded-full border border-slate-700/60 ${isActive ? 'animate-[spin_10s_linear_infinite_reverse]' : ''}`}>
         {/* Planeta Branco na linha */}
         {isActive && (
           <div className="absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white rounded-full shadow-[0_0_12px_#fff]"></div>
         )}
      </div>

      {/* Anel Interior (A Órbita Pequena) */}
      <div className={`absolute w-[50%] h-[50%] rounded-full border border-slate-700/60 ${isActive ? 'animate-[spin_6s_linear_infinite]' : ''}`}>
        {/* Planeta Branco na linha */}
        {isActive && (
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_12px_#fff]"></div>
        )}
      </div>

      {/* O NÚCLEO BRILHANTE E LISO (O Sol) */}
      <div className={`relative w-24 h-24 md:w-28 md:h-28 rounded-full z-10 transition-all duration-700 ${
          isActive
            ? 'bg-gradient-to-br from-amber-200 via-amber-500 to-orange-600 shadow-[0_0_80px_rgba(245,158,11,1)]'
            : 'bg-slate-800 border-2 border-slate-700'
        }`}>

        {/* Efeito de Voz (A bola pulsa quando ele fala) */}
        {isSpeaking && (
          <div className="absolute inset-0 rounded-full bg-amber-200/50 blur-md animate-ping"></div>
        )}
      </div>

    </div>
  );
};