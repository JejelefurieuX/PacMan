
import { DIRECTIONS, RAW_MAP, AXIS, OPPOSITE_DIRECTION, MAP_WIDTH } from '../constants';
import { Direction, Position, TileType, Ghost } from '../types';

// Get tile type at INTEGER coordinates
export const getTileAt = (x: number, y: number): TileType => {
  let tx = Math.floor(x);
  let ty = Math.floor(y);

  if (tx < 0) tx = RAW_MAP[0].length - 1;
  if (tx >= RAW_MAP[0].length) tx = 0;

  const row = RAW_MAP[ty];
  if (!row) return 'WALL'; 
  
  const char = row[tx];
  switch (char) {
    case '1': return 'WALL';
    case '4': return 'GATE';
    default: return 'EMPTY';
  }
};

const isWall = (x: number, y: number, isGhost = false, isInHouse = false) => {
  const tile = getTileAt(x, y);
  if (tile === 'WALL') return true;
  if (tile === 'GATE') {
     if (isGhost && isInHouse) return false; 
     return true;
  }
  return false;
};

/**
 * PRECISION PHYSICS ENGINE
 * Uses a "Center Tolerance" approach.
 */
export const moveEntity = (
  entity: Position & { direction: Direction, nextDirection: Direction }, 
  dt: number, 
  speed: number,
  isGhost: boolean = false
): { x: number, y: number, direction: Direction } => {
  
  let { x, y, direction, nextDirection } = entity;
  const dist = speed * dt;
  
  const moveVec = DIRECTIONS[direction];
  const axis = AXIS[direction];
  
  // Calculate projected position
  let nextX = x + (moveVec.x * dist);
  let nextY = y + (moveVec.y * dist);

  // --- CORNERING / TURNING LOGIC ---
  // We allow turning if we are close to the center of a tile
  if (nextDirection !== direction) {
    const tileX = Math.floor(x);
    const tileY = Math.floor(y);
    const centerX = tileX + 0.5;
    const centerY = tileY + 0.5;

    // Are we near the center? (Tolerance window)
    // Increased tolerance for smoother "pre-turn" feel
    const distToCenter = AXIS[direction] === 'x' ? Math.abs(x - centerX) : Math.abs(y - centerY);
    
    if (distToCenter < 0.15) { 
      // Check if target tile is free
      const turnVec = DIRECTIONS[nextDirection];
      const targetTx = tileX + turnVec.x;
      const targetTy = tileY + turnVec.y;
      const inHouse = isGhost && tileY >= 8 && tileY <= 10 && tileX >= 8 && tileX <= 12;

      if (!isWall(targetTx, targetTy, isGhost, inHouse)) {
        // SNAP to center and change direction
        return {
          x: centerX + (turnVec.x * dist), // Start moving in new dir immediately
          y: centerY + (turnVec.y * dist),
          direction: nextDirection
        };
      }
    }
  }

  // --- REVERSE LOGIC ---
  if (nextDirection === OPPOSITE_DIRECTION[direction]) {
    return { x, y, direction: nextDirection };
  }

  // --- COLLISION DETECTION AHEAD ---
  // We look ahead to the NEXT tile center to see if we hit a wall
  // If we are moving Right, we check ceil(x). If moving Left, floor(x).
  
  // Current tile coordinates
  const tx = Math.floor(x);
  const ty = Math.floor(y);
  
  // Lookahead logic:
  // If we cross a tile boundary, check if the new tile is a wall
  
  // Simplified: Clamp to center if next tile is wall
  const nextTx = Math.floor(nextX + (moveVec.x * 0.49)); // Look slightly ahead
  const nextTy = Math.floor(nextY + (moveVec.y * 0.49));
  
  const inHouse = isGhost && ty >= 8 && ty <= 10;

  if ((nextTx !== tx || nextTy !== ty) && isWall(nextTx, nextTy, isGhost, inHouse)) {
    // We are about to hit a wall. Clamp to center of current tile.
    return {
      x: axis === 'x' ? tx + 0.5 : x, // Clamp X, keep Y
      y: axis === 'y' ? ty + 0.5 : y, // Clamp Y, keep X
      direction: direction
    };
  }

  // --- WRAPPING ---
  if (nextX < -0.5) nextX = MAP_WIDTH - 0.5;
  if (nextX > MAP_WIDTH - 0.5) nextX = -0.5;

  return { x: nextX, y: nextY, direction };
};

export const getDistance = (p1: Position, p2: Position) => {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
};

export const getNextGhostMove = (
  ghost: Position & { direction: Direction }, 
  target: Position,
  isFrightened: boolean
): Direction => {
  
  const possibleDirs: Direction[] = ['UP', 'LEFT', 'DOWN', 'RIGHT'];
  const validDirs: Direction[] = [];
  
  const gx = Math.round(ghost.x - 0.5); 
  const gy = Math.round(ghost.y - 0.5); 
  
  const inHouse = gy >= 8 && gy <= 10 && gx >= 8 && gx <= 12;

  possibleDirs.forEach(dir => {
    if (dir === OPPOSITE_DIRECTION[ghost.direction]) return;

    const vec = DIRECTIONS[dir];
    const tx = gx + vec.x;
    const ty = gy + vec.y;

    if (!isWall(tx, ty, true, inHouse)) {
      validDirs.push(dir);
    }
  });

  if (validDirs.length === 0) return OPPOSITE_DIRECTION[ghost.direction];
  
  if (isFrightened) {
    return validDirs[Math.floor(Math.random() * validDirs.length)];
  }

  let bestDir = validDirs[0];
  let minDst = Infinity;

  validDirs.forEach(dir => {
    const vec = DIRECTIONS[dir];
    const testX = gx + vec.x;
    const testY = gy + vec.y;
    
    const dx = testX - target.x;
    const dy = testY - target.y;
    const d = (dx*dx + dy*dy);

    if (d < minDst) {
      minDst = d;
      bestDir = dir;
    }
  });

  return bestDir;
};

// Simple AI for Demo Mode Pacman
export const getBotMove = (
    pacman: Position & { direction: Direction },
    ghosts: Ghost[],
    pellets: Set<string>
): Direction => {
    const px = Math.round(pacman.x - 0.5);
    const py = Math.round(pacman.y - 0.5);
    
    const possibleDirs: Direction[] = ['UP', 'LEFT', 'DOWN', 'RIGHT'];
    let bestDir = pacman.direction;
    let maxScore = -Infinity;

    possibleDirs.forEach(dir => {
        if (dir === OPPOSITE_DIRECTION[pacman.direction]) return; // Don't reverse unless stuck

        const vec = DIRECTIONS[dir];
        const tx = px + vec.x;
        const ty = py + vec.y;

        if (isWall(tx, ty)) return;

        let score = 0;

        // Reward: Pellet
        if (pellets.has(`${tx},${ty}`)) score += 10;

        // Reward: Keep moving in same direction (smoothness)
        if (dir === pacman.direction) score += 1;

        // Penalty: Close to ghost
        let safe = true;
        ghosts.forEach(g => {
             const dist = Math.sqrt(Math.pow(tx - g.x, 2) + Math.pow(ty - g.y, 2));
             if (dist < 4) {
                 score -= (100 / (dist + 0.1));
                 if (dist < 1.5) safe = false;
             }
        });

        // If totally unsafe, heavy penalty
        if (!safe) score -= 1000;

        if (score > maxScore) {
            maxScore = score;
            bestDir = dir;
        }
    });

    // If stuck, allow reverse
    if (maxScore === -Infinity) {
        return OPPOSITE_DIRECTION[pacman.direction];
    }

    return bestDir;
};
