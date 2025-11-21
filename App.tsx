
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
  DIRE