
export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export interface Position {
  x: number; // Now supports floats (e.g. 10.5)
  y: number;
}

export interface Entity extends Position {
  direction: Direction;
  nextDirection: Direction; // Buffered input
  speed: number;
}

export enum GhostMode {
  SCATTER = 'SCATTER',
  CHASE = 'CHASE',
  FRIGHTENED = 'FRIGHTENED',
  EATEN = 'EATEN',
}

export enum GhostColor {
  RED = 'red',
  PINK = 'pink',
  CYAN = 'cyan',
  ORANGE = 'orange',
  GREEN = 'green', // The 5th Ghost
}

export interface Ghost extends Entity {
  color: GhostColor;
  mode: GhostMode;
  id: number;
  startPos: Position;
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  tx: string; // CSS translate variable
  ty: string; // CSS translate variable
}

export interface FloatingText {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
}

export interface Fruit {
  x: number;
  y: number;
  type: 'CHERRY' | 'STRAWBERRY';
  active: boolean;
}

export type TileType = 'WALL' | 'DOT' | 'POWER' | 'EMPTY' | 'GATE';

export interface GameState {
  score: number;
  highScore: number;
  lives: number;
  status: 'INTRO' | 'DEMO' | 'IDLE' | 'PLAYING' | 'PAUSED' | 'GAME_OVER' | 'WON' | 'LEVEL_TRANSITION';
  level: number;
  combo: number; // For score multipliers
  audioInitialized: boolean;
}
