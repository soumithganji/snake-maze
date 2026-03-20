'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import MazeBoard from '@/components/MazeBoard';
import ReasoningPanel from '@/components/ReasoningPanel';
import { generateMaze, findStart, findExit } from '@/lib/maze';
import { type Direction, type GameState, applyMove, getValidMoves, posKey } from '@/lib/game';

function newGame(): GameState {
  const maze = generateMaze(21, 21);
  const pos = findStart(maze);
  const exit = findExit(maze);
  return { maze, pos, exit, direction: 'RIGHT', alive: true, won: false, steps: 0, history: [], visited: [posKey(...pos)] };
}

export default function Home() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [running, setRunning] = useState(false);
  const [tickMs, setTickMs] = useState(1000);
  const [reasoning, setReasoning] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [status, setStatus] = useState<'idle' | 'running' | 'dead' | 'trapped' | 'error' | 'won'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  // Initialize maze on client only (Math.random() causes hydration mismatch if run on server)
  useEffect(() => {
    setGameState(newGame());
  }, []);

  const gameStateRef = useRef(gameState);
  const runningRef = useRef(running);
  const isTickingRef = useRef(false);
  gameStateRef.current = gameState;
  runningRef.current = running;

  const tick = useCallback(async () => {
    if (isTickingRef.current) return; // prevent concurrent ticks
    const state = gameStateRef.current;
    if (!state || !state.alive || state.won) return;
    isTickingRef.current = true;

    // Handle trivial cases client-side — no need to call the LLM
    const validMoves = getValidMoves(state);
    if (validMoves.length === 0) {
      setStatus('trapped');
      setRunning(false);
      isTickingRef.current = false;
      return;
    }
    if (validMoves.length === 1) {
      setGameState((prev) => prev ? applyMove(prev, validMoves[0]) : prev);
      isTickingRef.current = false;
      return;
    }

    setStreaming(true);
    setReasoning('');

    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`API error ${res.status}: ${text}`);
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let move: Direction | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        for (const line of text.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          const payload = JSON.parse(line.slice(6));

          if (payload.delta) {
            setReasoning((prev) => prev + payload.delta);
          }
          if (payload.done) {
            move = payload.move as Direction | null;
          }
        }
      }

      setStreaming(false);

      if (!move) {
        throw new Error('LLM returned no valid move');
      }

      setGameState((prev) => {
        if (!prev) return prev;
        const next = applyMove(prev, move!);
        if (next.won) {
          setStatus('won');
          setRunning(false);
        } else if (!next.alive) {
          setStatus('dead');
          setRunning(false);
        }
        return next;
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('Agent error:', msg);
      setErrorMsg(msg);
      setStatus('error');
      setRunning(false);
      setStreaming(false);
    } finally {
      isTickingRef.current = false;
    }
  }, []);

  // Game loop
  useEffect(() => {
    if (!running) return;
    const id = setInterval(tick, tickMs);
    return () => clearInterval(id);
  }, [running, tickMs, tick]);

  // Stop loop when game ends
  useEffect(() => {
    if (gameState && !gameState.alive && running) {
      setRunning(false);
      setStatus('dead');
    }
  }, [gameState?.alive, running]);

  function handleReset() {
    setRunning(false);
    setGameState(newGame());
    setReasoning('');
    setStatus('idle');
    setErrorMsg('');
  }

  if (!gameState) {
    return (
      <main className="min-h-screen bg-gray-950 text-white p-8 flex items-center justify-center">
        <p className="text-gray-400">Generating maze...</p>
      </main>
    );
  }

  const validMoves = getValidMoves(gameState);

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-2 text-green-400">Snake Maze Agent</h1>
        <p className="text-gray-400 mb-6 text-sm">
          LLaMA 3.3 70B navigates the snake through the maze in real time.
        </p>

        <div className="flex gap-8 flex-wrap">
          {/* Left: maze + controls */}
          <div className="flex flex-col gap-4">
            <MazeBoard state={gameState} />

            {/* Stats */}
            <div className="flex gap-6 text-sm text-gray-400">
              <span>Steps: <span className="text-white font-mono">{gameState.steps}</span></span>
              <span>Dir: <span className="text-white font-mono">{gameState.direction}</span></span>
              <span>Valid: <span className="text-white font-mono">{validMoves.join(', ') || 'none'}</span></span>
            </div>

            {/* Status badge */}
            {status === 'won' && (
              <div className="bg-green-900 border border-green-500 rounded px-3 py-2 text-green-300 text-sm font-bold">
                Maze solved in {gameState.steps} steps!
              </div>
            )}
            {status === 'dead' && (
              <div className="bg-red-900 border border-red-600 rounded px-3 py-2 text-red-300 text-sm">
                Snake hit a wall after {gameState.steps} steps.
              </div>
            )}
            {status === 'trapped' && (
              <div className="bg-yellow-900 border border-yellow-600 rounded px-3 py-2 text-yellow-300 text-sm">
                Snake is trapped — no valid moves.
              </div>
            )}
            {status === 'error' && (
              <div className="bg-red-950 border border-red-700 rounded px-3 py-2 text-red-300 text-sm font-mono break-all">
                <span className="font-bold text-red-400">API Error: </span>{errorMsg}
              </div>
            )}

            {/* Controls */}
            <div className="flex gap-3 flex-wrap items-center">
              <button
                onClick={() => { setRunning((r) => !r); setStatus('running'); }}
                disabled={!gameState.alive}
                className="px-4 py-2 rounded font-semibold bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                {running ? 'Pause' : 'Start'}
              </button>
              <button
                onClick={handleReset}
                className="px-4 py-2 rounded font-semibold bg-gray-700 hover:bg-gray-600 transition"
              >
                New Maze
              </button>

              <div className="flex items-center gap-2 ml-2">
                <label className="text-sm text-gray-400">Speed</label>
                <input
                  type="range"
                  min={300}
                  max={3000}
                  step={100}
                  value={tickMs}
                  onChange={(e) => setTickMs(Number(e.target.value))}
                  className="w-28 accent-green-400"
                />
                <span className="text-sm text-gray-400 w-16">{(tickMs / 1000).toFixed(1)}s / tick</span>
              </div>
            </div>
          </div>

          {/* Right: LLM reasoning */}
          <div className="flex-1 min-w-72 flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
              LLM Reasoning {streaming && <span className="text-green-400 normal-case">(thinking...)</span>}
            </h2>
            <ReasoningPanel reasoning={reasoning} streaming={streaming} />
          </div>
        </div>
      </div>
    </main>
  );
}
