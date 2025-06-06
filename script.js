let cols = 5;
let rows = 5;
let depth = 5;
let grid = [];
let cellSize = 40;
let stack = [];
let mazeGenerated = false;
let solving = false;
let path = [];
let current;
let algorithmSelect;

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  algorithmSelect = document.getElementById('algorithm');
  document.getElementById('generate').onclick = generateMaze;
  document.getElementById('solve').onclick = solveMaze;
  generateMaze();
}

function generateMaze() {
  grid = [];
  stack = [];
  path = [];
  solving = false;
  for (let z = 0; z < depth; z++) {
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        let index = x + y * cols + z * cols * rows;
        grid[index] = new Cell(x, y, z);
      }
    }
  }
  current = grid[0];
  mazeGenerated = false;
}

function draw() {
  background(200);
  rotateX(-PI/6);
  rotateY(PI/4);

  translate(-cols * cellSize / 2, -rows * cellSize / 2, -depth * cellSize / 2);

  for (let cell of grid) {
    cell.show();
  }

  if (!mazeGenerated) {
    if (algorithmSelect.value === 'backtracker') {
      generateBacktracker();
    } else {
      generatePrim();
    }
  } else if (solving) {
    solveStep();
  }
}

function generateBacktracker() {
  current.visited = true;
  let next = current.checkNeighbors();
  if (next) {
    next.visited = true;
    stack.push(current);
    removeWalls(current, next);
    current = next;
  } else if (stack.length > 0) {
    current = stack.pop();
  } else {
    mazeGenerated = true;
  }
}

function generatePrim() {
  if (stack.length === 0) {
    current.visited = true;
    let neighbors = current.unvisitedNeighbors();
    for (let n of neighbors) stack.push([current, n]);
    if (neighbors.length === 0) mazeGenerated = true;
  } else {
    let rnd = floor(random(stack.length));
    let pair = stack.splice(rnd, 1)[0];
    let [c, n] = pair;
    if (!n.visited) {
      n.visited = true;
      removeWalls(c, n);
      let neighbors = n.unvisitedNeighbors();
      for (let nb of neighbors) stack.push([n, nb]);
    }
    if (stack.length === 0) mazeGenerated = true;
  }
}

function solveMaze() {
  if (mazeGenerated) {
    solving = true;
    path = bfs(grid[0], grid[grid.length - 1]);
  }
}

function solveStep() {
  if (path.length > 0) {
    let cell = path.shift();
    cell.highlight(color(255, 0, 0));
  } else {
    solving = false;
  }
}

function bfs(start, goal) {
  let queue = [];
  let visited = new Set();
  let cameFrom = new Map();

  queue.push(start);
  visited.add(start);

  while (queue.length > 0) {
    let current = queue.shift();
    if (current === goal) break;
    for (let n of current.neighbors()) {
      if (!visited.has(n)) {
        visited.add(n);
        cameFrom.set(n, current);
        queue.push(n);
      }
    }
  }

  let path = [];
  let curr = goal;
  while (curr !== start) {
    path.unshift(curr);
    curr = cameFrom.get(curr);
    if (!curr) break;
  }
  path.unshift(start);
  return path;
}

class Cell {
  constructor(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.walls = { top: true, bottom: true, left: true, right: true, front: true, back: true };
    this.visited = false;
  }

  index(x, y, z) {
    if (x < 0 || y < 0 || z < 0 || x >= cols || y >= rows || z >= depth) {
      return -1;
    }
    return x + y * cols + z * cols * rows;
  }

  neighbors() {
    let list = [];
    let {x, y, z} = this;
    let neighbors = [
      [x + 1, y, z, 'right', 'left'],
      [x - 1, y, z, 'left', 'right'],
      [x, y + 1, z, 'bottom', 'top'],
      [x, y - 1, z, 'top', 'bottom'],
      [x, y, z + 1, 'front', 'back'],
      [x, y, z - 1, 'back', 'front']
    ];
    for (let n of neighbors) {
      let i = this.index(n[0], n[1], n[2]);
      if (i >= 0) {
        let cell = grid[i];
        if (!this.walls[n[3]] && !cell.walls[n[4]]) list.push(cell);
      }
    }
    return list;
  }

  unvisitedNeighbors() {
    let list = [];
    let {x, y, z} = this;
    let neighbors = [
      [x + 1, y, z],
      [x - 1, y, z],
      [x, y + 1, z],
      [x, y - 1, z],
      [x, y, z + 1],
      [x, y, z - 1]
    ];
    for (let n of neighbors) {
      let i = this.index(n[0], n[1], n[2]);
      if (i >= 0 && !grid[i].visited) {
        list.push(grid[i]);
      }
    }
    return list;
  }

  checkNeighbors() {
    let neighbors = this.unvisitedNeighbors();
    if (neighbors.length > 0) {
      let r = floor(random(neighbors.length));
      return neighbors[r];
    } else {
      return undefined;
    }
  }

  show() {
    let x = this.x * cellSize;
    let y = this.y * cellSize;
    let z = this.z * cellSize;

    push();
    translate(x + cellSize/2, y + cellSize/2, z + cellSize/2);
    noFill();
    stroke(0);
    box(cellSize, cellSize, cellSize);
    pop();

    // Draw red block if part of solution path
  }

  highlight(col) {
    let x = this.x * cellSize;
    let y = this.y * cellSize;
    let z = this.z * cellSize;
    push();
    translate(x + cellSize/2, y + cellSize/2, z + cellSize/2);
    fill(col);
    noStroke();
    box(cellSize*0.5);
    pop();
  }
}

function removeWalls(a, b) {
  let x = a.x - b.x;
  if (x === 1) { a.walls.left = false; b.walls.right = false; }
  if (x === -1) { a.walls.right = false; b.walls.left = false; }
  let y = a.y - b.y;
  if (y === 1) { a.walls.top = false; b.walls.bottom = false; }
  if (y === -1) { a.walls.bottom = false; b.walls.top = false; }
  let z = a.z - b.z;
  if (z === 1) { a.walls.back = false; b.walls.front = false; }
  if (z === -1) { a.walls.front = false; b.walls.back = false; }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
