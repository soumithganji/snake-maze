import OpenAI from 'openai';
import { type GameState, getValidMoves, mazeToAscii } from '@/lib/game';
import { NextRequest } from 'next/server';

const client = new OpenAI({
  baseURL: 'https://integrate.api.nvidia.com/v1',
  apiKey: process.env.NVIDIA_API_KEY!,
});

export async function POST(req: NextRequest) {
  const state: GameState = await req.json();
  const validMoves = getValidMoves(state);

  const ascii = mazeToAscii(state);
  const recentHistory = state.history.slice(-6).join(' → ') || 'none';

  const prompt = `You are controlling a snake navigating a maze. Your ONLY goal: keep moving without hitting walls.

MAZE (# = wall, . = open, S = snake head):
${ascii}

STATE:
- Position: row ${state.pos[0]}, col ${state.pos[1]}
- Facing: ${state.direction}
- Recent moves: ${recentHistory}
- Steps: ${state.steps}

VALID MOVES (guaranteed wall-free, pre-computed — trust these completely):
${validMoves.map((dir) => {
  const [dr, dc] = ({ UP: [-1,0], DOWN: [1,0], LEFT: [0,-1], RIGHT: [0,1] } as Record<string,[number,number]>)[dir];
  const nr = state.pos[0] + dr;
  const nc = state.pos[1] + dc;
  const seen = state.visited.includes(`${nr},${nc}`);
  return `  ${dir} → (${nr},${nc}) [${seen ? 'ALREADY VISITED' : 'unvisited'}]`;
}).join('\n')}

RULES:
1. You MUST pick one of the valid moves listed above. Do not question them.
2. STRONGLY prefer moves leading to UNVISITED cells — they open new territory.
3. Only go to an ALREADY VISITED cell if all valid moves are visited (backtracking).
4. Avoid back-and-forth: recent moves are ${state.history.slice(-6).join(' → ') || 'none'}.

Think briefly about which valid move explores new territory, then respond with exactly:
MOVE: <direction>`;

  const response = await client.chat.completions.create({
    model: 'meta/llama-3.3-70b-instruct',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 300,
    temperature: 0.3,
    stream: true,
  });

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let fullText = '';

      for await (const chunk of response) {
        const delta = chunk.choices[0]?.delta?.content ?? '';
        fullText += delta;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`));
      }

      // Parse move from full response
      const match = fullText.match(/MOVE:\s*(UP|DOWN|LEFT|RIGHT)/i);
      let move = match ? match[1].toUpperCase() : null;
      if (!move || !validMoves.includes(move as typeof validMoves[number])) {
        move = validMoves[0];
      }

      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, move, reasoning: fullText })}\n\n`));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
  });
}
