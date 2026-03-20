export type Cell = '#' | '.';
export type Grid = Cell[][];

export function generateMaze(rows = 21, cols = 21): Grid {
  // Force odd dimensions so walls and passages alternate cleanly
  rows = rows % 2 === 1 ? rows : rows + 1;
  cols = cols % 2 === 1 ? cols : cols + 1;

  const grid: Grid = Array.from({ length: rows }, () =>
    Array(cols).fill('#') as Cell[]
  );

  const visited = new Set<string>();
  const key = (r: number, c: number) => `${r},${c}`;

  grid[1][1] = '.';
  visited.add(key(1, 1));
  const stack: [number, number][] = [[1, 1]];

  while (stack.length > 0) {
    const [r, c] = stack[stack.length - 1];
    const neighbors: [number, number, number, number][] = [];

    for (const [dr, dc] of [[0, 2], [0, -2], [2, 0], [-2, 0]] as [number, number][]) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr > 0 && nr < rows - 1 && nc > 0 && nc < cols - 1 && !visited.has(key(nr, nc))) {
        neighbors.push([nr, nc, r + dr / 2, c + dc / 2]);
      }
    }

    if (neighbors.length > 0) {
      const [nr, nc, wr, wc] = neighbors[Math.floor(Math.random() * neighbors.length)];
      grid[wr][wc] = '.';
      grid[nr][nc] = '.';
      visited.add(key(nr, nc));
      stack.push([nr, nc]);
    } else {
      stack.pop();
    }
  }

  return grid;
}

export function findStart(_maze: Grid): [number, number] {
  // Always start at the top-left entrance — (1,1) is guaranteed open
  // by the recursive backtracking generator
  return [1, 1];
}
