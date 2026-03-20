# Snake Maze Agent

A maze game where an LLM (LLaMA 3.3 70B) acts as the brain — observing the maze, reasoning about its options, and navigating the snake from start to exit in real time.

## How it works

Each tick, the game:
1. Renders the maze as an ASCII grid with the snake's position (`S`), visited cells (`v`), and the exit (`E`)
2. Sends the grid + valid moves + move history to LLaMA 3.3 70B
3. Streams the model's reasoning back to the UI live
4. Applies the chosen move and updates the board

The LLM only decides at junctions (2+ valid moves). Single-exit corridors are handled automatically.

### Key design decisions

- **No reversal by default** — the opposite direction is excluded from valid moves to prevent oscillation; reversal is only allowed when it's the only escape from a dead end
- **Visited cell memory** — every cell the snake has stepped on is tracked and labeled `[ALREADY VISITED]` in the prompt, so the LLM prefers unexplored paths and backtracks intelligently
- **Concurrency guard** — a mutex prevents multiple simultaneous LLM calls from corrupting game state

## Stack

- **Next.js 15** (App Router) — frontend + API routes
- **LLaMA 3.3 70B** — the agent brain
- **TypeScript** — end to end

## Getting started

### 1. Get an NVIDIA NIM API key

Go to [build.nvidia.com](https://build.nvidia.com), find any model, and click **Get API Key**. Activate the `meta/llama-3.3-70b-instruct` model by visiting its page.

### 2. Set up environment variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```
NVIDIA_API_KEY=nvapi-xxxxxxxxxxxxxxxxxxxx
```

### 3. Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).


## Project structure

```
app/
  page.tsx              # Game UI and loop
  api/agent/route.ts    # Streams LLM reasoning + move decision
components/
  MazeBoard.tsx         # Maze grid visualization
  ReasoningPanel.tsx    # Live LLM reasoning stream
lib/
  maze.ts               # Recursive backtracking maze generator
  game.ts               # Game state, move validation, visited tracking
```

## Controls

| Control | Description |
|---|---|
| Start / Pause | Run or pause the agent |
| New Maze | Generate a fresh maze and reset |
| Speed slider | Set tick interval (0.3s – 3s per move) |
