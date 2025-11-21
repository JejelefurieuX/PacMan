
import React, { useMemo } from 'react';
import { RAW_MAP, MAP_WIDTH, MAP_HEIGHT, TILE_SIZE } from '../constants';

interface BoardProps {
    levelColor: string;
}

const Board: React.FC<BoardProps> = ({ levelColor }) => {
  // Precompute the maze paths for SVG
  const { walls, gate } = useMemo(() => {
    const walls: React.ReactElement[] = [];
    const gate: React.ReactElement[] = [];

    RAW_MAP.forEach((row, y) => {
      row.split('').forEach((char, x) => {
        const cx = x * TILE_SIZE;
        const cy = y * TILE_SIZE;
        
        if (char === '1') {
          // Inner Square
          walls.push(
            <rect 
              key={`w-${x}-${y}`} 
              x={cx} y={cy} 
              width={TILE_SIZE} height={TILE_SIZE} 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="1.5"
              className="neon-wall"
            />
          );
          // Fill slightly
          walls.push(
            <rect 
              key={`wf-${x}-${y}`} 
              x={cx + 4} y={cy + 4} 
              width={TILE_SIZE - 8} height={TILE_SIZE - 8} 
              fill="currentColor" 
              fillOpacity="0.1"
              rx="2"
            />
          );
        } else if (char === '4') {
          gate.push(
             <line 
              key={`g-${x}-${y}`}
              x1={cx} y1={cy + TILE_SIZE/2}
              x2={cx + TILE_SIZE} y2={cy + TILE_SIZE/2}
              stroke="#ff00de"
              strokeWidth="2"
             />
          );
        }
      });
    });
    return { walls, gate };
  }, []);

  return (
    <svg 
      className="absolute top-0 left-0 w-full h-full transition-colors duration-1000 ease-in-out" 
      viewBox={`0 0 ${MAP_WIDTH * TILE_SIZE} ${MAP_HEIGHT * TILE_SIZE}`}
      style={{ color: levelColor }}
    >
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <rect width="100%" height="100%" fill="#050505" />
      <g filter="url(#glow)">
        {walls}
        {gate}
      </g>
    </svg>
  );
};

export default Board;
