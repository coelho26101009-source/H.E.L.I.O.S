import React from 'react';

interface HeliosCoreProps {
  isActive: boolean;
  isSpeaking: boolean;
  volume: number;
  questionCount?: number;
}

export const HeliosCore: React.FC<HeliosCoreProps> = ({ isActive, isSpeaking, volume, questionCount = 0 }) => {
  const coreOpacity = isActive ? (isSpeaking ? 1 : 0.8) : 0.2;
  const pulseScale = isSpeaking ? 1.05 : 1;

  const MAX_STARS = 50;
  const stars = Array.from({ length: Math.min(questionCount, MAX_STARS) });

  return (
    <div className="relative flex items-center justify-center w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96">
      
      {/* Anéis de Fundo */}
      <div className="absolute inset-0 border border-amber-500/5 rounded-full pointer-events-none" />
      
      {/* ESTRELAS DINÂMICAS CORRIGIDAS */}
      {isActive && stars.map((_, index) => {
        const speed = 4 + (index % 8) * 1.2; 
        const orbitSize = 65 + (index % 7) * 5; 
        const delay = index * -1.2; 
        const animationName = index % 2 === 0 ? 'helios-rotate-cw' : 'helios-rotate-ccw';
        const starSize = index % 10 === 0 ? '4px' : '2px';

        return (
          <div 
            key={`q-star-${index}`}
            // AQUI: Usamos absolute inset-0 e flex center para garantir centro perfeito
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ 
              animation: `${animationName} ${speed}s linear infinite`,
              animationDelay: `${delay}s`,
            }}
          >
            {/* A Estrela posicionada na margem da órbita */}
            <div 
              className="rounded-full"
              style={{
                width: starSize,
                height: starSize,
                background: '#fff',
                boxShadow: `0 0 10px #f59e0b, 0 0 3px #fff`,
                transform: `translateY(-${orbitSize * 1.5}px)` // Aumentei a distância multiplicando por 1.5
              }}
            />
          </div>
        );
      })}
      
      {/* NÚCLEO CENTRAL */}
      <div 
        className="relative flex items-center justify-center w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 bg-black/70 rounded-full transition-all duration-300 z-20 backdrop-blur-2xl border border-amber-500/20"
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

      {/* Órbitas Decorativas */}
      <div className={`absolute w-[85%] h-[85%] border-[0.5px] border-amber-500/10 rounded-full ${isActive ? 'animate-[spin_60s_linear_infinite]' : 'opacity-0'}`} style={{ borderStyle: 'dashed' }} />
      <div className={`absolute w-[65%] h-[65%] border-[0.5px] border-amber-600/5 rounded-full ${isActive ? 'animate-[spin_45s_linear_infinite_reverse]' : 'opacity-0'}`} />

      {/* The Guardian (Corrigido para centro perfeito) */}
      {isActive && (
        <div className="absolute inset-0 flex items-center justify-center animate-[spin_8s_linear_infinite] z-10">
             <div className="bg-white rounded-full shadow-[0_0_12px_#f59e0b]" 
                  style={{ width: '6px', height: '6px', transform: 'translateY(-140px)' }}></div>
        </div>
      )}
    </div>
  );
};