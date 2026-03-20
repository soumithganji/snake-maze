export type Cell = '#' | '.';
export type Grid = Cell[][];

export function generateMaze(rows = 21, cols = 21): Grid {
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

  // Cut entrance in top border above (1,1)
  grid[0][1] = '.';
  // Cut exit in bottom border below (rows-2, cols-2)
  grid[rows - 1][cols - 2] = '.';

  return grid;
}

export function findStart(_maze: Grid): [number, number] {
  return [1, 1];
}

export function findExit(maze: Grid): [number, number] {
  // The exit opening is in the bottom border
  return [maze.length - 1, maze[0].length - 2];
}
