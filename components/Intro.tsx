
import React from 'react';
import { GameState } from '../types';
import { Trophy } from 'lucide-react';

interface IntroProps {
  gameState: GameState;
  startGame: () => void;
}

const DEFAULT_SCORES = [
  { rank: 1, score: 30000, name: 'JEJ' },
  { rank: 2, score: 25000, name: 'PAC' },
  { rank: 3, score: 20000, name: 'MAN' },
  { rank: 4, score: 15000, name: 'CPU' },
  { rank: 5, score: 10000, name: 'BOT' },
];

export const IntroScreen: React.FC<IntroProps> = ({ gameState, startGame }) => {
  if (gameState.status !== 'INTRO' && gameState.status !== 'DEMO') return null;

  // Merge current high score into the list if it beats the default #1
  const scores = [...DEFAULT_SCORES];
  if (gameState.highScore > scores[0].score) {
      scores[0] = { ...scores[0], score: gameState.highScore, name: 'YOU' };
  }

  return (
    <div 
      onClick={startGame}
      className="absolute inset-0 z-[60] flex flex-col items-center justify-center cursor-pointer"
    >
      {/* 
         Background: 
         - Opaque black for INTRO (Focus on Title)
         - Transparent black for DEMO (Focus on Gameplay) 
      */}
      <div className={`absolute inset-0 transition-colors duration-1000 ${gameState.status === 'INTRO' ? 'bg-black/95' : 'bg-black/30'}`} />

      {/* INTRO TITLE SCREEN */}
      {gameState.status === 'INTRO' && (
        <div className="relative z-10 flex flex-col items-center animate-in fade-in duration-1000 px-4">
            <h1 className="text-5xl md:text-7xl text-center text-yellow-400 neon-text mb-2 tracking-tighter animate-pulse">
                PAC-MAN
            </h1>
            <h2 className="text-xl md:text-2xl text-cyan-400 tracking-widest mb-6 neon-text text-center">
                CHAMPIONSHIP ED.
            </h2>
            
            <div className="text-pink-500 text-sm md:text-base mt-8 mb-12 font-bold tracking-widest border-t border-b border-pink-500/50 py-3 px-8 text-center">
                Réalisé par JejelefurieuX
            </div>
        </div>
      )}

      {/* DEMO MODE OVERLAY */}
      {gameState.status === 'DEMO' && (
        <div className="relative z-10 flex flex-col items-center mt-[-5vh]">
             {/* Transparent glass panel to see the game behind */}
             <div className="bg-black/60 p-6 rounded-xl backdrop-blur-sm border border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                 <div className="text-center text-red-500 text-lg mb-4 animate-pulse tracking-[0.2em] font-bold drop-shadow-md">
                    DEMO PLAY
                 </div>
                 
                 <div className="flex items-center justify-center gap-2 text-yellow-400 mb-3 text-xs border-b border-white/20 pb-2">
                    <Trophy size={14} /> HIGH SCORES
                 </div>
                 
                 <div className="space-y-2 font-mono text-xs md:text-sm min-w-[240px]">
                    {scores.map((s, i) => (
                        <div key={i} className={`flex justify-between items-center ${i === 0 ? 'text-pink-400 font-bold scale-105 origin-left' : 'text-white/80'}`}>
                            <span className="w-8">{s.rank}ST</span>
                            <span className="tracking-widest flex-1 text-right mr-6">{s.score}</span>
                            <span className="text-orange-400 w-10 text-right">{s.name}</span>
                        </div>
                    ))}
                 </div>
             </div>
        </div>
      )}
    
      {/* BOTTOM FLASHING TEXT */}
      <div className="absolute bottom-20 w-full text-center z-20 pointer-events-none">
        <div className="text-white text-xl md:text-2xl animate-[blink_1s_steps(2)_infinite] neon-text font-bold tracking-wider drop-shadow-lg">
            TAP TO START
        </div>
        <div className="text-gray-500 text-xs mt-2 tracking-[0.3em]">FREE PLAY • 1 CREDIT</div>
      </div>

      <style>{`
        @keyframes blink {
            0% { opacity: 1; }
            50% { opacity: 0; }
            100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};
