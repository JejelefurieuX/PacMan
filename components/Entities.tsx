
import React from 'react';
import { Ghost, GhostColor, GhostMode, Position, Direction, Particle, FloatingText, Fruit } from '../types';
import { MAP_WIDTH, MAP_HEIGHT } from '../constants';

// Helper for optimized CSS transforms
export const getPositionStyle = (x: number, y: number) => ({
  transform: `translate3d(calc(${x * 100}% - 50%), calc(${y * 100}% - 50%), 0)`,
  width: `${100 / MAP_WIDTH}%`,
  height: `${100 / MAP_HEIGHT}%`,
  left: 0,
  top: 0
});

// --- PACMAN ---
interface PacmanProps {
  domRef: React.RefObject<HTMLDivElement | null>;
  direction: Direction;
}

export const PacmanPlayer: React.FC<PacmanProps> = ({ domRef }) => {
  // Rotation is now handled in App.tsx via direct DOM manipulation for 60fps smoothness
  return (
    <div 
      ref={domRef}
      className="absolute will-change-transform z-30"
      style={{
         ...getPositionStyle(10.5, 16.5), // Initial position
         transition: 'none'
      }}
    >
      {/* Inner container for rotation */}
      <div className="w-full h-full flex items-center justify-center scale-[1.3] transition-transform duration-75">
        <div className="w-full h-full">
            <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_5px_#FACC15]">
            <path d="M50,50 L100,20 A50,50 0 1,0 100,80 Z" fill="#FACC15">
                <animateTransform 
                attributeName="transform" 
                type="rotate" 
                from="0 50 50" 
                to="0 50 50" 
                dur="0.2s" 
                repeatCount="indefinite"
                values="0 50 50; -25 50 50; 0 50 50; 25 50 50; 0 50 50" 
                />
            </path>
            </svg>
        </div>
      </div>
    </div>
  );
};

// --- GHOSTS ---
const GHOST_COLORS: Record<GhostColor, string> = {
  [GhostColor.RED]: '#ff0000',
  [GhostColor.PINK]: '#ffb8ff',
  [GhostColor.CYAN]: '#00ffff',
  [GhostColor.ORANGE]: '#ffb852',
  [GhostColor.GREEN]: '#00ff2a' // New 5th Ghost
};

interface GhostProps {
  ghost: Ghost;
  domRef: React.RefObject<HTMLDivElement | null>;
}

export const GhostEnemy: React.FC<GhostProps> = ({ ghost, domRef }) => {
  let color = GHOST_COLORS[ghost.color];
  if (ghost.mode === GhostMode.FRIGHTENED) color = '#0000ff';
  if (ghost.mode === GhostMode.EATEN) color = 'transparent';

  const eyeOffset = {
    UP: { x: 0, y: -6 },
    DOWN: { x: 0, y: 6 },
    LEFT: { x: -6, y: 0 },
    RIGHT: { x: 6, y: 0 },
  }[ghost.direction];

  return (
    <div 
      ref={domRef}
      className="absolute will-change-transform z-20"
      style={{
        ...getPositionStyle(ghost.startPos.x, ghost.startPos.y),
        transition: 'none'
      }}
    >
      <div className="w-full h-full flex items-center justify-center scale-[1.2]">
         <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_5px_currentColor]" style={{ color }}>
           {ghost.mode !== GhostMode.EATEN && (
             <path d="M10,50 A40,40 0 0,1 90,50 L90,90 L70,80 L50,90 L30,80 L10,90 Z" fill="currentColor" />
           )}
           {/* Eyes */}
           <g transform={`translate(${eyeOffset.x}, ${eyeOffset.y})`}>
               <ellipse cx="35" cy="40" rx="12" ry="15" fill="white" />
               <ellipse cx="65" cy="40" rx="12" ry="15" fill="white" />
               <circle cx={35 + eyeOffset.x/2} cy={40 + eyeOffset.y/2} r="6" fill="#000055" />
               <circle cx={65 + eyeOffset.x/2} cy={40 + eyeOffset.y/2} r="6" fill="#000055" />
           </g>
           {ghost.mode === GhostMode.FRIGHTENED && (
              <path d="M20,70 L30,60 L40,70 L50,60 L60,70 L70,60" stroke="white" strokeWidth="3" fill="none" opacity="0.5"/>
           )}
         </svg>
      </div>
    </div>
  );
};

// --- FRUIT ---
export const FruitItem: React.FC<{ fruit: Fruit }> = ({ fruit }) => {
  if (!fruit.active) return null;

  const color = fruit.type === 'CHERRY' ? '#ff0044' : '#ff4444';
  
  return (
    <div 
      className="absolute z-10 flex items-center justify-center animate-bounce"
      style={getPositionStyle(fruit.x, fruit.y)}
    >
       <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_8px_#ff0044]">
         {fruit.type === 'CHERRY' ? (
            <g>
               <path d="M50,20 Q70,5 80,30" stroke="#0f0" strokeWidth="4" fill="none" />
               <circle cx="35" cy="70" r="20" fill="#ff0044" />
               <circle cx="75" cy="60" r="20" fill="#ff0044" />
            </g>
         ) : (
            <path d="M50,85 C20,80 10,50 20,30 Q50,10 80,30 C90,50 80,80 50,85" fill="#ff2244" stroke="#0f0" strokeWidth="2"/>
         )}
       </svg>
    </div>
  );
};

// --- FLOATING TEXT ---
export const FloatingScore: React.FC<{ texts: FloatingText[] }> = ({ texts }) => {
  return (
    <>
      {texts.map(t => (
        <div 
          key={t.id}
          className="absolute z-50 font-bold neon-text"
          style={{
            left: `${t.x * 100 / MAP_WIDTH}%`,
            top: `${t.y * 100 / MAP_HEIGHT}%`,
            color: t.color,
            transform: 'translate(-50%, -50%)',
            animation: 'floatUp 1s ease-out forwards',
            fontSize: 'clamp(12px, 2vw, 20px)'
          }}
        >
          {t.text}
          <style>{`
            @keyframes floatUp {
              0% { opacity: 1; transform: translate(-50%, -50%) scale(0.5); }
              50% { transform: translate(-50%, -150%) scale(1.2); }
              100% { opacity: 0; transform: translate(-50%, -250%) scale(1); }
            }
          `}</style>
        </div>
      ))}
    </>
  );
}


// --- PELLETS & PARTICLES ---
export const WorldLayer: React.FC<{ 
  pellets: Set<string>, 
  powerPellets: Set<string>,
  particles: Particle[]
}> = React.memo(({ pellets, powerPellets, particles }) => {
    const elements: React.ReactElement[] = [];

    // Render Pellets
    pellets.forEach(key => {
        const [x, y] = key.split(',').map(Number);
        elements.push(
            <div key={`p-${key}`} className="absolute flex items-center justify-center" style={getPositionStyle(x + 0.5, y + 0.5)}>
                <div className="w-[20%] h-[20%] bg-pink-200/60 rounded-sm shadow-[0_0_2px_#fbcfe8]"></div>
            </div>
        );
    });

    // Render Power Pellets
    powerPellets.forEach(key => {
        const [x, y] = key.split(',').map(Number);
        elements.push(
            <div key={`pp-${key}`} className="absolute flex items-center justify-center z-10" style={getPositionStyle(x + 0.5, y + 0.5)}>
                <div className="w-[50%] h-[50%] bg-yellow-100 rounded-full animate-pulse shadow-[0_0_10px_#fef9c3]"></div>
            </div>
        );
    });

    // Render Particles
    particles.forEach(p => {
      elements.push(
        <div 
          key={`part-${p.id}`} 
          className="particle w-1 h-1 rounded-full z-40"
          style={{
            left: `${p.x * 100 / MAP_WIDTH}%`,
            top: `${p.y * 100 / MAP_HEIGHT}%`,
            backgroundColor: p.color,
            boxShadow: `0 0 4px ${p.color}`,
            '--tx': p.tx,
            '--ty': p.ty,
          } as React.CSSProperties}
        />
      );
    });

    return <div className="absolute inset-0 pointer-events-none">{elements}</div>;
});
