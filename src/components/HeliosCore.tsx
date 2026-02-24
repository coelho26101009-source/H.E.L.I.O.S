import React from 'react';

interface HeliosCoreProps {
  isActive: boolean;
  isSpeaking: boolean;
  volume?: number;
  questionCount?: number;
}

export const HeliosCore: React.FC<HeliosCoreProps> = ({ isActive, isSpeaking, questionCount = 0 }) => {
  return (
    <div className="relative flex items-center justify-center w-64 h-64 md:w-80 md:h-80">
      
      {/* Anel Exterior Giratório (Roda devagar para a direita) */}
      <div className={`absolute inset-0 rounded-full border-4 border-dashed transition-all duration-1000 ${isActive ? 'border-amber-500/40 animate-[spin_12s_linear_infinite]' : 'border-slate-800/50'}`}></div>
      
      {/* Anel Intermédio Giratório (Roda para a esquerda) */}
      <div className={`absolute inset-4 rounded-full border-2 transition-all duration-700 ${isActive ? 'border-amber-400/30 animate-[spin_8s_linear_infinite_reverse]' : 'border-slate-800/30'}`}></div>

      {/* Efeito de Voz (Ondas que pulsam quando ele fala) */}
      <div className={`absolute inset-10 rounded-full transition-all duration-300 ${isSpeaking ? 'bg-amber-500/30 blur-2xl animate-ping' : 'bg-transparent'}`}></div>

      {/* O NÚCLEO BRILHANTE (A Esfera Central) */}
      <div className={`relative w-32 h-32 md:w-44 md:h-44 rounded-full flex items-center justify-center transition-all duration-700 z-10 ${
          isActive 
            ? 'bg-gradient-to-br from-amber-200 via-amber-500 to-orange-600 shadow-[0_0_80px_rgba(245,158,11,0.8),inset_0_0_30px_rgba(255,255,255,0.6)]' 
            : 'bg-gradient-to-br from-slate-800 to-slate-950 shadow-[0_0_20px_rgba(0,0,0,0.8)]'
        }`}>
        
        {/* Efeito de vidro/reflexo de luz na parte de cima da esfera */}
        <div className={`absolute top-3 left-6 w-12 h-6 rounded-full blur-[2px] transform -rotate-45 transition-opacity ${isActive ? 'bg-white/40' : 'bg-white/5'}`}></div>

        {/* Círculo interno mais escuro (O "Olho") */}
        <div className={`w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center transition-all duration-500 ${isActive ? 'bg-amber-900/40 shadow-[inset_0_0_15px_rgba(0,0,0,0.8)]' : 'bg-slate-900/80'}`}>
            
            {/* O contador de perguntas lá dentro, ao estilo Sci-Fi */}
            {isActive && (
              <span className="text-amber-100 font-black text-xl md:text-2xl drop-shadow-[0_0_5px_rgba(255,255,255,0.8)] font-mono">
                {questionCount}
              </span>
            )}
        </div>
      </div>
    </div>
  );
};