'use client';

import { type GameState, posKey } from '@/lib/game';

interface Props {
  state: GameState;
}

const DIR_ARROW: Record<string, string> = {
  UP: '▲',
  DOWN: '▼',
  LEFT: '◀',
  RIGHT: '▶',
};

export default function MazeBoard({ state }: Props) {
  const { maze, pos: [sr, sc] } = state;
  const visitedSet = new Set(state.visited);

  return (
    <div className="inline-block border border-gray-700 rounded overflow-hidden">
      {maze.map((row, r) => (
        <div key={r} className="flex">
          {row.map((cell, c) => {
            const isSnake = r === sr && c === sc;
            const isVisited = cell === '.' && visitedSet.has(posKey(r, c));
            return (
              <div
                key={c}
                className={[
                  'w-5 h-5 flex items-center justify-center text-xs leading-none select-none',
                  cell === '#' ? 'bg-gray-800' : 'bg-gray-950',
                  isVisited && !isSnake ? 'bg-gray-700' : '',
                  isSnake ? '!bg-green-500 text-white font-bold' : '',
                ].join(' ')}
              >
                {isSnake ? DIR_ARROW[state.direction] : ''}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
