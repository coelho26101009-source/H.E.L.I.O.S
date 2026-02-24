import React from 'react';

interface HeliosCoreProps {
  isActive: boolean;
  isSpeaking: boolean;
  volume: number;
  questionCount: number;
}

export const HeliosCore: React.FC<HeliosCoreProps> = ({ isActive, isSpeaking, questionCount = 0 }) => {
  const coreOpacity = isActive ? (isSpeaking ? 1 : 0.8) : 0.2;
  
  // Cria as estrelas (limite de 50 para não bloquear o pc)
  const MAX_STARS = 50;
  const stars = Array.from({ length: Math.min(questionCount, MAX_STARS) });

  return (
    <div className="relative flex items-center justify-center w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96">
      
      {/* Anel Decorativo Fundo */}
      <div className="absolute inset-0 border border-amber-500/5 rounded-full pointer-events-none" />
      
      {/* ESTRELAS DINÂMICAS (Do teu código antigo) */}
      {isActive && stars.map((_, index) => {
        const speed = 4 + (index % 8) * 1.2; 
        const orbitSize = 65 + (index % 7) * 5; 
        const delay = index * -1.2; 
        const animationName = index % 2 === 0 ? 'helios-rotate-cw' : 'helios-rotate-ccw';
        const starBrightness = 1;

        return (
          <div
            key={index}
            className="absolute top-1/2 left-1/2 w-0.5 h-0.5 bg-amber-400 rounded-full"
            style={{
              opacity: starBrightness,
              boxShadow: `0 0 ${starBrightness * 4}px rgba(245, 158, 11, 0.8)`,
              animation: `${animationName} ${speed}s linear infinite`,
              animationDelay: `${delay}s`,
              transformOrigin: `${orbitSize}px 0px`
            }}
          />
        );
      })}

      {/* Container Principal */}
      <div className="relative w-32 h-32 md:w-40 md:h-40 flex items-center justify-center">
        
        {/* Brilho Interno */}
        <div 
            className={`absolute inset-0 bg-amber-500/20 blur-2xl rounded-full transition-all duration-300`}
            style={{ opacity: coreOpacity, transform: isSpeaking ? 'scale(1.5)' : 'scale(1)' }}
        />

        {/* Esfera Central */}
        <div 
            className="relative w-full h-full rounded-full border border-amber-500/30 bg-black/80 overflow-hidden backdrop-blur-sm transition-all duration-300 shadow-[0_0_50px_rgba(245,158,11,0.15)]"
            style={{ opacity: coreOpacity }}
        >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)] animate-pulse" />
        </div>
        
        {/* SVG TÉCNICO (O desenho dentro da bola) */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-4 md:p-6">
            <svg viewBox="0 0 100 100" className={`w-full h-full ${isActive ? 'animate-[spin_20s_linear_infinite]' : 'opacity-20'}`}>
                <circle cx="50" cy="50" r="48" fill="none" stroke="rgba(245,158,11,0.2)" strokeWidth="0.5" strokeDasharray="3 5" />
                <path d="M50 5 L50 12 M95 50 L88 50 M50 95 L50 88 M5 50 L12 50" stroke="rgba(245,158,11,0.6)" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
        </div>
      </div>

      {/* Órbitas Tracejadas Exteriores */}
      <div className={`absolute w-[85%] h-[85%] border-[0.5px] border-amber-500/10 rounded-full ${isActive ? 'animate-[spin_60s_linear_infinite]' : 'opacity-0'}`} style={{ borderStyle: 'dashed' }} />
      <div className={`absolute w-[120%] h-[120%] border-[0.5px] border-amber-500/5 rounded-full ${isActive ? 'animate-[spin_80s_linear_infinite_reverse]' : 'opacity-0'}`} style={{ borderStyle: 'dashed' }} />
    </div>
  );
};