
import React, { useEffect, useState, useRef, useCallback } from 'react';
import Board from './components/Board';
import { PacmanPlayer, GhostEnemy, WorldLayer, FloatingScore, FruitItem } from './components/Entities';
import { IntroScreen } from './components/Intro';
import { 
  RAW_MAP, 
  PACMAN_START_POS, 
  GHOST_START_POS, 
  BASE_PACMAN_SPEED,
  BASE_GHOST_SPEED,
  FRIGHTENED_SPEED,
  MAP_WIDTH,
  MAP_HEIGHT,
  DIRECTIONS
} from './constants';
import { 
  Direction, 
  Entity, 
  GameState, 
  Ghost, 
  GhostColor, 
  GhostMode, 
  Particle,
  FloatingText,
  Fruit
} from './types';
import { moveEntity, getNextGhostMove, getDistance, getBotMove } from './utils/gameHelpers';
import { initAudio, playSound, startWaka, stopWaka } from './utils/audio';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Zap, Trophy } from 'lucide-react';

const TIME_STEP = 1 / 120; // Physics runs at 120hz for precision

// Board Colors by "World" (every 50 levels)
const BOARD_COLORS = [
    '#00f3ff', // Cyan (Standard)
    '#ff0000', // Red (Hardcore)
    '#00ff00', // Green (Matrix)
    '#ff00de', // Purple (Synthwave)
    '#ffff00', // Yellow (Warning)
];

const App: React.FC = () => {
  // --- STATE ---
  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    highScore: parseInt(localStorage.getItem('pacman_ce_highscore') || '30000'),
    lives: 3,
    status: 'INTRO', // Start in Intro
    level: 1,
    combo: 0,
    audioInitialized: false
  });

  const [pellets, setPellets] = useState<Set<string>>(new Set());
  const [powerPellets, setPowerPellets] = useState<Set<string>>(new Set());
  const [particles, setParticles] = useState<Particle[]>([]);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [fruit, setFruit] = useState<Fruit | null>(null);
  
  // --- REFS FOR HIGH FREQUENCY STATE (NO RE-RENDER) ---
  const pacmanRef = useRef<Entity>({
    x: PACMAN_START_POS.x + 0.5,
    y: PACMAN_START_POS.y + 0.5,
    direction: 'RIGHT',
    nextDirection: 'RIGHT',
    speed: BASE_PACMAN_SPEED
  });

  const ghostsRef = useRef<Ghost[]>([]);
  
  // Track physics difficulty separate from game level (for Demo mode)
  const difficultyLevelRef = useRef<number>(1);

  // DOM Refs for direct manipulation
  const pacmanDomRef = useRef<HTMLDivElement>(null);
  const ghostDomRefs = useRef<(HTMLDivElement | null)[]>([]);

  const requestRef = useRef<number | undefined>(undefined);
  const previousTimeRef = useRef<number | undefined>(undefined);
  const accumulatorRef = useRef<number>(0);
  const fruitTimerRef = useRef<number>(0);
  const fruitDurationRef = useRef<number>(0);
  const isMovingRef = useRef<boolean>(false);
  
  // Intro/Demo Timers
  const demoTimerRef = useRef<number>(0);
  const introTimerRef = useRef<number>(0);

  // Used to sync React State pellets with Mutable Ref Logic without closure staleness
  const itemsRef = useRef<{ pellets: Set<string>; powerPellets: Set<string> }>({ pellets: new Set(), powerPellets: new Set() });
  const fruitRef = useRef<Fruit | null>(null); // Sync ref for physics loop

  // --- DIFFICULTY CALCULATOR ---
  const getDifficultyMultiplier = (level: number) => {
      // Scale linearly: Level 1 = 0.5x (50%), Level 50 = 1.0x (100%) speed
      const cap = Math.min(level, 50);
      return 0.5 + ((cap - 1) / 49) * 0.5; 
  };

  const getLevelColor = (level: number) => {
      const worldIndex = Math.floor((level - 1) / 50) % BOARD_COLORS.length;
      return BOARD_COLORS[worldIndex];
  };

  // --- INIT ---
  const getCenteredPos = (pos: {x: number, y: number}) => ({ x: pos.x + 0.5, y: pos.y + 0.5 });

  const initMapItems = useCallback(() => {
    const newPellets = new Set<string>();
    const newPower = new Set<string>();
    RAW_MAP.forEach((row, y) => {
      row.split('').forEach((char, x) => {
        if (char === '0') newPellets.add(`${x},${y}`);
        if (char === '2') newPower.add(`${x},${y}`);
      });
    });
    setPellets(newPellets);
    setPowerPellets(newPower);
    itemsRef.current = { pellets: newPellets, powerPellets: newPower };
    setFruit(null);
    fruitRef.current = null;
    fruitTimerRef.current = Math.random() * 10 + 10;
  }, []);

  const resetPositions = (level: number) => {
    difficultyLevelRef.current = level;
    const difficultyMult = getDifficultyMultiplier(level);
    const pSpeed = BASE_PACMAN_SPEED * difficultyMult;
    const gSpeed = BASE_GHOST_SPEED * difficultyMult;

    pacmanRef.current = { 
        ...getCenteredPos(PACMAN_START_POS), 
        direction: 'RIGHT', 
        nextDirection: 'RIGHT', 
        speed: pSpeed 
    };
    
    const configs = [
        { color: GhostColor.RED, pos: GHOST_START_POS.red, dir: 'LEFT' },
        { color: GhostColor.PINK, pos: GHOST_START_POS.pink, dir: 'UP' },
        { color: GhostColor.CYAN, pos: GHOST_START_POS.cyan, dir: 'UP' },
        { color: GhostColor.ORANGE, pos: GHOST_START_POS.orange, dir: 'UP' },
    ];

    // Add 5th Ghost if Level > 50
    if (level > 50) {
        configs.push({ color: GhostColor.GREEN, pos: GHOST_START_POS.green, dir: 'DOWN' });
    }

    ghostsRef.current = configs.map((c, i) => ({
      id: i + 1,
      color: c.color,
      ...getCenteredPos(c.pos),
      direction: c.dir as Direction,
      nextDirection: c.dir as Direction,
      startPos: getCenteredPos(c.pos),
      mode: GhostMode.SCATTER,
      speed: gSpeed
    }));
    
    isMovingRef.current = false;
    stopWaka();
    updateDOM();
  };

  // Triggered when App Mounts for background visuals
  useEffect(() => {
      initMapItems();
      resetPositions(1);
  }, [initMapItems]);

  const startGame = () => {
    if (!gameState.audioInitialized) {
        initAudio();
    }
    playSound('intro');
    initMapItems();
    resetPositions(1);
    setGameState(prev => ({ ...prev, score: 0, lives: 3, status: 'PLAYING', combo: 0, level: 1, audioInitialized: true }));
  };

  const startDemo = () => {
      initMapItems();
      resetPositions(50); // Demo at 100% speed
      setGameState(prev => ({ ...prev, status: 'DEMO', score: 0 }));
      demoTimerRef.current = 30;
  };

  const nextLevel = () => {
      const nextLvl = gameState.level + 1;
      stopWaka();
      playSound('intro');
      setGameState(prev => ({ ...prev, status: 'LEVEL_TRANSITION' }));
      
      setTimeout(() => {
          setGameState(prev => ({ ...prev, level: nextLvl, status: 'PLAYING' }));
          initMapItems();
          resetPositions(nextLvl);
      }, 3000);
  };

  const spawnParticles = (x: number, y: number, color: string, count: number) => {
    const newParts: Particle[] = [];
    for(let i=0; i<count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 20 + Math.random() * 30;
      newParts.push({
        id: Math.random(),
        x: x,
        y: y,
        color,
        tx: `${Math.cos(angle) * dist}px`,
        ty: `${Math.sin(angle) * dist}px`
      });
    }
    setParticles(prev => [...prev, ...newParts]);
    if (particles.length > 50) setParticles(prev => prev.slice(20));
  };

  const spawnFloatingText = (x: number, y: number, text: string, color: string) => {
    const id = Math.random();
    setFloatingTexts(prev => [...prev, { id, x, y, text, color }]);
    setTimeout(() => {
        setFloatingTexts(prev => prev.filter(t => t.id !== id));
    }, 1000);
  };

  // --- SPAWN FRUIT LOGIC ---
  const trySpawnFruit = () => {
      const keys = Array.from(itemsRef.current.pellets);
      if (keys.length === 0) return;
      const randomKey = keys[Math.floor(Math.random() * keys.length)] as string;
      const [x, y] = randomKey.split(',').map(Number);
      
      const type = Math.random() > 0.5 ? 'CHERRY' : 'STRAWBERRY';
      const newFruit: Fruit = { x: x + 0.5, y: y + 0.5, type, active: true };
      
      setFruit(newFruit);
      fruitRef.current = newFruit;
      fruitDurationRef.current = 10; // 10 seconds to eat
  };

  // --- DIRECT DOM UPDATE (High Perf) ---
  const updateDOM = () => {
    // PACMAN
    if (pacmanDomRef.current) {
        const p = pacmanRef.current;
        // Translation
        pacmanDomRef.current.style.transform = `translate3d(calc(${p.x * 100}% - 50%), calc(${p.y * 100}% - 50%), 0)`;
        
        // Rotation - target the inner container
        const inner = pacmanDomRef.current.firstElementChild as HTMLElement;
        if (inner) {
            const rot = { UP: -90, DOWN: 90, LEFT: 180, RIGHT: 0 }[p.direction];
            inner.style.transform = `rotate(${rot}deg)`;
        }
    }
    
    // GHOSTS
    ghostsRef.current.forEach((g, i) => {
        const el = ghostDomRefs.current[i];
        if (el) {
            el.style.transform = `translate3d(calc(${g.x * 100}% - 50%), calc(${g.y * 100}% - 50%), 0)`;
            el.style.opacity = g.mode === GhostMode.EATEN ? '0.5' : '1';
        }
    });
  };

  // --- PHYSICS STEP ---
  const physicsStep = (dt: number) => {
    const isDemo = gameState.status === 'DEMO';
    
    // 1. PACMAN
    const prevX = pacmanRef.current.x;
    const prevY = pacmanRef.current.y;

    // AI Control in Demo Mode
    if (isDemo) {
        const botDir = getBotMove(pacmanRef.current, ghostsRef.current, itemsRef.current.pellets);
        pacmanRef.current.nextDirection = botDir;
    }

    const pMove = moveEntity(pacmanRef.current, dt, pacmanRef.current.speed);
    pacmanRef.current.x = pMove.x;
    pacmanRef.current.y = pMove.y;
    pacmanRef.current.direction = pMove.direction;

    // Detect Movement for Audio
    const moved = Math.abs(pacmanRef.current.x - prevX) > 0.001 || Math.abs(pacmanRef.current.y - prevY) > 0.001;
    if (moved && !isMovingRef.current && !isDemo) { // No Waka Sound in Demo
        isMovingRef.current = true;
        startWaka();
    } else if ((!moved && isMovingRef.current) || isDemo) {
        isMovingRef.current = false;
        stopWaka();
    }

    // 2. EAT PELLETS
    const px = Math.floor(pacmanRef.current.x);
    const py = Math.floor(pacmanRef.current.y);
    const key = `${px},${py}`;
    const distToTileCenter = Math.sqrt(Math.pow(pacmanRef.current.x - (px + 0.5), 2) + Math.pow(pacmanRef.current.y - (py + 0.5), 2));

    if (distToTileCenter < 0.4) {
        if (itemsRef.current.pellets.has(key)) {
            itemsRef.current.pellets.delete(key);
            setPellets(new Set(itemsRef.current.pellets));
            setGameState(prev => ({ ...prev, score: prev.score + 10 }));
            if (!isDemo) playSound('eat_dot');
        } else if (itemsRef.current.powerPellets.has(key)) {
            itemsRef.current.powerPellets.delete(key);
            setPowerPellets(new Set(itemsRef.current.powerPellets));
            setGameState(prev => ({ ...prev, score: prev.score + 50 }));
            spawnParticles(pacmanRef.current.x, pacmanRef.current.y, '#fef9c3', 10);
            if (!isDemo) playSound('eat_fruit'); // Similar sound for power
            
            // Scare Ghosts
            ghostsRef.current.forEach(g => {
                if (g.mode !== GhostMode.EATEN) {
                    g.mode = GhostMode.FRIGHTENED;
                    // Apply current level scaling to frightened speed so it's relative to game speed
                    g.speed = FRIGHTENED_SPEED * getDifficultyMultiplier(difficultyLevelRef.current);
                }
            });
            setTimeout(() => {
                ghostsRef.current.forEach(g => {
                    if (g.mode === GhostMode.FRIGHTENED) {
                        g.mode = GhostMode.CHASE;
                        // Restore speed based on current level ref
                        g.speed = BASE_GHOST_SPEED * getDifficultyMultiplier(difficultyLevelRef.current);
                    }
                });
            }, 7000);
        }
    }

    // 3. EAT FRUIT
    if (fruitRef.current && fruitRef.current.active) {
         const df = Math.sqrt(Math.pow(pacmanRef.current.x - fruitRef.current.x, 2) + Math.pow(pacmanRef.current.y - fruitRef.current.y, 2));
         if (df < 0.5) {
             const points = fruitRef.current.type === 'CHERRY' ? 100 : 300;
             setGameState(prev => ({ ...prev, score: prev.score + points }));
             spawnFloatingText(fruitRef.current.x, fruitRef.current.y, `+${points}`, '#ff00de');
             spawnParticles(fruitRef.current.x, fruitRef.current.y, '#ff00de', 15);
             if (!isDemo) playSound('eat_fruit');
             setFruit(null);
             fruitRef.current = null;
             fruitDurationRef.current = Math.random() * 15 + 10; // Reset timer
         }
    }

    // 4. GHOSTS
    ghostsRef.current.forEach(ghost => {
        let target = { x: pacmanRef.current.x, y: pacmanRef.current.y };
        
        const inHouse = ghost.y > 8 && ghost.y < 11 && ghost.x > 8 && ghost.x < 13;
        if (inHouse && ghost.mode !== GhostMode.EATEN) target = { x: 10, y: 7 };
        else if (ghost.mode === GhostMode.SCATTER) target = { x: 0, y: 0 };
        else if (ghost.mode === GhostMode.EATEN) target = ghost.startPos;
        
        // 5th Ghost (Green) Aggressive Logic: Always targets strictly, no Scatter
        if (ghost.color === GhostColor.GREEN && ghost.mode !== GhostMode.FRIGHTENED && ghost.mode !== GhostMode.EATEN) {
            target = { x: pacmanRef.current.x, y: pacmanRef.current.y };
        }

        const nextDir = getNextGhostMove(ghost, target, ghost.mode === GhostMode.FRIGHTENED && !inHouse);
        
        const gMove = moveEntity({ ...ghost, nextDirection: nextDir }, dt, ghost.speed, true);
        
        ghost.x = gMove.x;
        ghost.y = gMove.y;
        ghost.direction = gMove.direction;
        
        if (ghost.mode === GhostMode.EATEN && getDistance(ghost, ghost.startPos) < 1.0) {
            ghost.mode = GhostMode.CHASE;
            ghost.speed = BASE_GHOST_SPEED * getDifficultyMultiplier(difficultyLevelRef.current);
        }

        // Collision
        const dist = getDistance(pacmanRef.current, ghost);
        if (dist < 0.6) { 
            if (ghost.mode === GhostMode.FRIGHTENED) {
                ghost.mode = GhostMode.EATEN;
                ghost.speed = 12; 
                setGameState(prev => ({ ...prev, score: prev.score + 200 }));
                spawnFloatingText(ghost.x, ghost.y, `+200`, '#00ffff');
                spawnParticles(ghost.x, ghost.y, '#fff', 10);
                if (!isDemo) playSound('eat_ghost');
            } else if (ghost.mode === GhostMode.CHASE || ghost.mode === GhostMode.SCATTER) {
                if (!isDemo) {
                    handleDeath();
                } else {
                    resetPositions(difficultyLevelRef.current);
                }
            }
        }
    });
    
    // Demo reset on level clear
    if (isDemo && itemsRef.current.pellets.size === 0) {
         resetPositions(50);
         initMapItems();
    }
    
    // LEVEL COMPLETE
    if (!isDemo && itemsRef.current.pellets.size === 0 && itemsRef.current.powerPellets.size === 0) {
        nextLevel();
    }
  };

  const handleDeath = () => {
      if (gameState.status !== 'PLAYING') return;
      
      stopWaka();
      playSound('die');
      
      if (gameState.lives > 1) {
        setGameState(prev => ({ ...prev, lives: prev.lives - 1, status: 'PAUSED' }));
        setParticles([]);
        setFruit(null);
        fruitRef.current = null;
        setTimeout(() => {
            resetPositions(gameState.level);
            setGameState(prev => ({ ...prev, status: 'PLAYING' }));
            accumulatorRef.current = 0;
            previousTimeRef.current = undefined;
        }, 2000);
      } else {
        // Game Over
        const hScore = Math.max(gameState.score, gameState.highScore);
        localStorage.setItem('pacman_ce_highscore', hScore.toString());
        setGameState(prev => ({ ...prev, lives: 0, status: 'GAME_OVER', highScore: hScore }));
      }
  };

  // --- MAIN LOOP ---
  const updateGame = (time: number) => {
    if (previousTimeRef.current === undefined) previousTimeRef.current = time;
    const deltaTime = (time - previousTimeRef.current) / 1000;
    previousTimeRef.current = time;

    if (gameState.status === 'INTRO') {
        introTimerRef.current += deltaTime;
        if (introTimerRef.current > 5) {
            introTimerRef.current = 0;
            startDemo();
        }
    } else if (gameState.status === 'DEMO') {
        demoTimerRef.current -= deltaTime;
        if (demoTimerRef.current <= 0) {
             setGameState(prev => ({ ...prev, status: 'INTRO' }));
        }
        accumulatorRef.current += Math.min(deltaTime, 0.1);
        while (accumulatorRef.current >= TIME_STEP) {
            physicsStep(TIME_STEP);
            accumulatorRef.current -= TIME_STEP;
        }
        updateDOM();
    } else if (gameState.status === 'PLAYING') {
        accumulatorRef.current += Math.min(deltaTime, 0.1);
        
        while (accumulatorRef.current >= TIME_STEP) {
            physicsStep(TIME_STEP);
            accumulatorRef.current -= TIME_STEP;
        }

        if (!fruitRef.current) {
            fruitTimerRef.current -= deltaTime;
            if (fruitTimerRef.current <= 0) trySpawnFruit();
        } else {
            fruitDurationRef.current -= deltaTime;
            if (fruitDurationRef.current <= 0) {
                setFruit(null);
                fruitRef.current = null;
                fruitTimerRef.current = Math.random() * 15 + 10;
            }
        }
        updateDOM();
    }
    requestRef.current = requestAnimationFrame(updateGame);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(updateGame);
    return () => {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
        stopWaka();
    };
  }, [gameState.status]); 

  // --- INPUT ---
  const handleInput = (dir: Direction) => {
     if (gameState.status === 'INTRO' || gameState.status === 'DEMO') {
         startGame();
         return;
     }
     if (gameState.status === 'PLAYING') {
       pacmanRef.current.nextDirection = dir;
     }
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (['ArrowUp','w'].includes(e.key)) handleInput('UP');
      if (['ArrowDown','s'].includes(e.key)) handleInput('DOWN');
      if (['ArrowLeft','a'].includes(e.key)) handleInput('LEFT');
      if (['ArrowRight','d'].includes(e.key)) handleInput('RIGHT');
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [gameState.status]);

  const currentColor = getLevelColor(gameState.level);

  return (
    <div className="fixed inset-0 bg-[#050505] text-white font-arcade flex flex-col items-center overflow-hidden select-none">
      
      <IntroScreen gameState={gameState} startGame={startGame} />

      <div className="absolute inset-0 pointer-events-none z-50 opacity-10 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))]" style={{ backgroundSize: '100% 2px, 3px 100%' }}></div>

      <div className="w-full max-w-[600px] flex justify-between items-end px-6 py-4 z-40 pointer-events-none">
         <div className="flex flex-col">
           <div className="text-xs mb-1 flex items-center gap-1" style={{ color: currentColor }}><Zap size={12}/> SCORE</div>
           <div className="text-2xl neon-text">{gameState.score}</div>
         </div>
         <div className="flex flex-col items-center">
            <div className="text-xs text-gray-400">LEVEL</div>
            <div className="text-2xl font-bold text-white">{gameState.level}</div>
         </div>
         <div className="flex flex-col items-end">
           <div className="text-pink-500 text-xs mb-1 flex items-center gap-1">HIGH SCORE <Trophy size={12}/></div>
           <div className="text-2xl">{gameState.highScore}</div>
         </div>
         {gameState.status !== 'INTRO' && gameState.status !== 'DEMO' && (
             <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-2 translate-y-12 opacity-50">
                {Array.from({length: Math.max(0, gameState.lives)}).map((_, i) => (
                    <div key={i} className="w-4 h-4 bg-yellow-400 rounded-full" style={{
                        clipPath: 'polygon(100% 0%, 100% 100%, 50% 50%, 0% 100%, 0% 0%)',
                        transform: 'rotate(-90deg)'
                    }}></div>
                ))}
             </div>
         )}
      </div>

      <div className="relative flex-grow w-full max-w-[600px] flex items-center justify-center p-4">
        <div className="relative w-full aspect-[21/20] max-h-[80vh]">
            <Board levelColor={currentColor} />
            <WorldLayer pellets={pellets} powerPellets={powerPellets} particles={particles} />
            {fruit && <FruitItem fruit={fruit} />}
            <FloatingScore texts={floatingTexts} />
            
            <PacmanPlayer 
                domRef={pacmanDomRef} 
                direction={pacmanRef.current.direction} 
            />
            {ghostsRef.current.map((g, i) => (
                <GhostEnemy 
                    key={g.id} 
                    ghost={g} 
                    domRef={(el) => { ghostDomRefs.current[i] = el; }} 
                />
            ))}

            {/* GAME OVER SCREEN */}
            {gameState.status === 'GAME_OVER' && (
              <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-50 animate-in fade-in duration-500">
                <h2 className="text-4xl text-red-600 neon-text mb-8">GAME OVER</h2>
                <div className="text-white mb-8">LEVEL REACHED: {gameState.level}</div>
                <div className="text-white mb-8">SCORE: {gameState.score}</div>
                <button onClick={startGame} className="text-white border border-red-600 px-6 py-3 hover:bg-red-600 transition-colors pointer-events-auto animate-pulse">
                  RETRY
                </button>
              </div>
            )}

             {/* LEVEL TRANSITION */}
             {gameState.status === 'LEVEL_TRANSITION' && (
              <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-50 animate-in zoom-in duration-300">
                <h2 className="text-3xl text-yellow-400 neon-text mb-2 tracking-widest animate-bounce">LEVEL CLEARED!</h2>
                <div className="text-white/80 text-sm mt-4">PREPARE FOR LEVEL {gameState.level + 1}</div>
                <div className="text-red-500 text-xs mt-2">SPEED {Math.round(getDifficultyMultiplier(gameState.level + 1) * 100)}%</div>
              </div>
            )}
            
            {gameState.status === 'PAUSED' && (
                <div className="absolute inset-0 flex items-center justify-center z-50">
                    <div className="text-yellow-400 text-2xl animate-pulse">READY!</div>
                </div>
            )}
        </div>
      </div>

      {/* CONTROLS */}
      {gameState.status === 'PLAYING' && (
        <div className="w-full h-[25vh] grid grid-cols-3 grid-rows-2 gap-2 p-4 z-50 md:max-w-[400px]">
             <div className="col-start-2 row-start-1 bg-gray-800/30 rounded-xl border border-white/10 flex items-center justify-center active:bg-white/20 transition-colors"
                  onTouchStart={(e) => { e.preventDefault(); handleInput('UP') }}
                  onMouseDown={(e) => { e.preventDefault(); handleInput('UP') }} >
                <ChevronUp size={32} />
             </div>
             <div className="col-start-1 row-start-2 bg-gray-800/30 rounded-xl border border-white/10 flex items-center justify-center active:bg-white/20 transition-colors"
                  onTouchStart={(e) => { e.preventDefault(); handleInput('LEFT') }}
                  onMouseDown={(e) => { e.preventDefault(); handleInput('LEFT') }}>
                 <ChevronLeft size={32} />
             </div>
             <div className="col-start-2 row-start-2 bg-gray-800/30 rounded-xl border border-white/10 flex items-center justify-center active:bg-white/20 transition-colors"
                  onTouchStart={(e) => { e.preventDefault(); handleInput('DOWN') }}
                  onMouseDown={(e) => { e.preventDefault(); handleInput('DOWN') }}>
                 <ChevronDown size={32} />
             </div>
             <div className="col-start-3 row-start-2 bg-gray-800/30 rounded-xl border border-white/10 flex items-center justify-center active:bg-white/20 transition-colors"
                  onTouchStart={(e) => { e.preventDefault(); handleInput('RIGHT') }}
                  onMouseDown={(e) => { e.preventDefault(); handleInput('RIGHT') }}>
                 <ChevronRight size={32} />
             </div>
        </div>
      )}

    </div>
  );
};

export default App;
