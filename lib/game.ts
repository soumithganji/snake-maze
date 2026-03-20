import type { Grid } from './maze';

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export interface GameState {
  maze: Grid;
  pos: [number, number];
  exit: [number, number];
  direction: Direction;
  alive: boolean;
  won: boolean;
  steps: number;
  history: Direction[];   // last N moves
  visited: string[];      // "r,c" keys of all cells stepped on
}

export const DELTAS: Record<Direction, [number, number]> = {
  UP: [-1, 0],
  DOWN: [1, 0],
  LEFT: [0, -1],
  RIGHT: [0, 1],
};

export const OPPOSITE: Record<Direction, Direction> = {
  UP: 'DOWN',
  DOWN: 'UP',
  LEFT: 'RIGHT',
  RIGHT: 'LEFT',
};

export function posKey(r: number, c: number) {
  return `${r},${c}`;
}

export function getValidMoves(state: GameState): Direction[] {
  const { maze, pos: [r, c], direction } = state;

  const isOpen = (dir: Direction) => {
    const [dr, dc] = DELTAS[dir];
    const nr = r + dr;
    const nc = c + dc;
    return nr >= 0 && nr < maze.length && nc >= 0 && nc < maze[0].length && maze[nr][nc] === '.';
  };

  // Prefer forward/turns — exclude reverse unless it's the only escape
  const nonReverse = (Object.keys(DELTAS) as Direction[]).filter(
    (dir) => dir !== OPPOSITE[direction] && isOpen(dir)
  );
  if (nonReverse.length > 0) return nonReverse;

  // Dead end — allow reversing so the snake can backtrack
  return isOpen(OPPOSITE[direction]) ? [OPPOSITE[direction]] : [];
}

export function applyMove(state: GameState, direction: Direction): GameState {
  const [dr, dc] = DELTAS[direction];
  const [r, c] = state.pos;
  const nr = r + dr;
  const nc = c + dc;

  const rows = state.maze.length;
  const cols = state.maze[0].length;

  if (nr < 0 || nr >= rows || nc < 0 || nc >= cols || state.maze[nr][nc] === '#') {
    return { ...state, alive: false };
  }

  const history = [...state.history, direction].slice(-10);
  const visitedSet = new Set(state.visited);
  visitedSet.add(posKey(nr, nc));
  const won = nr === state.exit[0] && nc === state.exit[1];

  return {
    ...state,
    pos: [nr, nc],
    direction,
    steps: state.steps + 1,
    history,
    visited: Array.from(visitedSet),
    won,
  };
}

export function mazeToAscii(state: GameState): string {
  const visitedSet = new Set(state.visited);
  const [er, ec] = state.exit;
  return state.maze
    .map((row, r) =>
      row.map((cell, c) => {
        if (r === state.pos[0] && c === state.pos[1]) return 'S';
        if (r === er && c === ec) return 'E';
        if (cell === '.' && visitedSet.has(posKey(r, c))) return 'v';
        return cell;
      }).join('')
    )
    .join('\n');
}
