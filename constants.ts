
import { Direction, GhostColor, Position } from './types';

export const TILE_SIZE = 24; // Visual scale reference
export const MAP_WIDTH = 21;
export const MAP_HEIGHT = 20;

// Base Speed in Tiles Per Second (Will be multiplied by level difficulty)
export const BASE_PACMAN_SPEED = 8.0;
export const BASE_GHOST_SPEED = 7.5;
export const FRIGHTENED_SPEED = 5.0; // Constant

// 1: Wall, 0: Dot, 2: Power, 3: Empty, 4: Gate
export const RAW_MAP = [
  "111111111111111111111",
  "100000000010000000001",
  "121110111010111011121",
  "101110111010111011101",
  "100000000000000000001",
  "101110101111101011101",
  "100000100010001000001",
  "111110111313111011111",
  "3333101333G3331013333",
  "111110131444131011111",
  "333330331333133033333",
  "111110131111131011111",
  "333310133333331011111",
  "111110101111101011111",
  "100000000010000000001",
  "101110111010111011101",
  "1200100000P0000010021",
  "111010101111101010111",
  "100000100010001000001",
  "111111111111111111111",
];

export const DIRECTIONS: Record<Direction, Position> = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
};

export const AXIS: Record<Direction, 'x' | 'y'> = {
  UP: 'y',
  DOWN: 'y',
  LEFT: 'x',
  RIGHT: 'x',
};

export const OPPOSITE_DIRECTION: Record<Direction, Direction> = {
  UP: 'DOWN',
  DOWN: 'UP',
  LEFT: 'RIGHT',
  RIGHT: 'LEFT',
};

export const GHOST_START_POS: Record<GhostColor, Position> = {
  [GhostColor.RED]: { x: 10, y: 8 },
  [GhostColor.PINK]: { x: 10, y: 9 },
  [GhostColor.CYAN]: { x: 9, y: 9 },
  [GhostColor.ORANGE]: { x: 11, y: 9 },
  [GhostColor.GREEN]: { x: 10, y: 9 }, // 5th Ghost Spawns in center
};

export const PACMAN_START_POS: Position = { x: 10, y: 16 };
