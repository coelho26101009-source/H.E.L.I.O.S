import React from 'react';

interface HeliosCoreProps {
  isActive: boolean;
  isSpeaking: boolean;
  volume: number; // 0 to 100
  questionCount?: number; // Contagem de perguntas para gerar as estrelas
}

export const HeliosCore: React.FC<HeliosCoreProps> = ({ isActive, isSpeaking, volume, questionCount = 0 }) => {
  const coreOpacity = isActive ? (isSpeaking ? 1 : 0.8) : 0.2;
  const pulseScale = isSpeaking ? 1.05 : 1;

  const MAX_STARS = 50;
  const stars = Array.from({ length: Math.min(questionCount, MAX_STARS) });

  return (
    <div className="relative flex items-center justify-center w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96">
      
      {/* Background Rings Decoration */}
      <div className="absolute inset-0 border border-amber-500/5 rounded-full pointer-events-none" />
      
      {/* Dynamic Question Stars */}
      {isActive && stars.map((_, index) => {
        const speed = 4 + (index % 8) * 1.2; 
        const orbitSize = 65 + (index % 7) * 5; 
        const delay = index * -1.2; 
        const animationName = index % 2 === 0 ? 'helios-rotate-cw' : 'helios-rotate-ccw';
        const starBrightness = 1.1 + (index % 4) * 0.15;
        const starSize = index % 10 === 0 ? '3.5px' : '2px';

        return (
          <div 
            key={`q-star-${index}`}
            className="absolute top-1/2 left-1/2 pointer-events-none"
            style={{ 
              width: `${orbitSize}%`,
              height: `${orbitSize}%`,
              animation: `${animationName} ${speed}s linear infinite`,
              animationDelay: `${delay}s`,
              zIndex: 15
            }}
          >
            <div 
              className="absolute top-0 left-1/2 -translate-x-1/2 rounded-full"
              style={{
                width: starSize,
                height: starSize,
                background: '#fff',
                boxShadow: `0 0 10px #f59e0b, 0 0 3px #fff`,
                animation: `star-pulse ${2 + (index % 3)}s ease-in-out infinite`,
                animationDelay: `${index * 0.1}s`,
                filter: `brightness(${starBrightness})`
              }}
            />
          </div>
        );
      })}
      
      {/* Central Core (The Sun) */}
      <div 
        className="relative flex items-center justify-center w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 bg-black/70 rounded-full transition-all duration-300 ease-out z-20 backdrop-blur-2xl border border-amber-500/20"
        style={{
          boxShadow: isActive ? `0 0 50px rgba(245, 158, 11, ${isSpeaking ? 0.4 : 0.1})` : 'none',
          transform: `scale(${pulseScale + (volume / 400)})`
        }}
      >
        <div 
            className="w-[90%] h-[90%] bg-gradient-to-tr from-amber-600 via-orange-500 to-yellow-400 rounded-full transition-all duration-700 overflow-hidden relative"
            style={{ opacity: coreOpacity }}
        >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)] animate-pulse" />
        </div>
        
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-4 md:p-6">
            <svg viewBox="0 0 100 100" className={`w-full h-full ${isActive ? 'animate-[spin_20s_linear_infinite]' : 'opacity-20'}`}>
                <circle cx="50" cy="50" r="48" fill="none" stroke="rgba(245,158,11,0.2)" strokeWidth="0.5" strokeDasharray="3 5" />
                <path d="M50 5 L50 12 M95 50 L88 50 M50 95 L50 88 M5 50 L12 50" stroke="rgba(245,158,11,0.6)" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
        </div>
      </div>

      {/* Orbits */}
      <div className={`absolute w-[85%] h-[85%] border-[0.5px] border-amber-500/10 rounded-full ${isActive ? 'animate-[spin_60s_linear_infinite]' : 'opacity-0'}`} style={{ borderStyle: 'dashed' }} />
      <div className={`absolute w-[65%] h-[65%] border-[0.5px] border-amber-600/5 rounded-full ${isActive ? 'animate-[spin_45s_linear_infinite_reverse]' : 'opacity-0'}`} />

      {/* The Guardian */}
      {isActive && (
        <div className="absolute w-[88%] h-[88%] animate-[spin_8s_linear_infinite] z-10">
             <div className="absolute top-0 left-1/2 w-1.5 h-1.5 bg-white rounded-full -translate-x-1/2 shadow-[0_0_12px_#f59e0b]"></div>
        </div>
      )}
    </div>
  );
};