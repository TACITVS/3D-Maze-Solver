// ----------------------------------------------------------------------------
// Game Configuration
// ----------------------------------------------------------------------------
class GameConfig {
    static instance = null;
  
    constructor() {
      if (GameConfig.instance) {
        return GameConfig.instance;
      }
  
      this.MAZE_SIZE = 21;
      this.CELL_SIZE = 40;
      this.WALL_HEIGHT = 80;
      this.CELL_TYPES = {
        WALL: 1,
        PATH: 0,
        UNKNOWN: -1
      };
      this.COLORS = {
        WALL: '#404040',
        PATH: '#808080',
        AGENT: '#FF0000',
        EXIT: '#00FF00',
        TRAIL: 'rgba(255, 0, 0, 0.3)'
      };
  
      GameConfig.instance = this;
    }
  
    static getInstance() {
      if (!GameConfig.instance) {
        GameConfig.instance = new GameConfig();
      }
      return GameConfig.instance;
    }
  }
  
  // ----------------------------------------------------------------------------
  // Base Entity Class
  // ----------------------------------------------------------------------------
  class GameEntity {
    constructor(position = { x: 0, y: 0, z: 0 }) {
      this.position = { ...position };
      this.size = { width: 0, height: 0, depth: 0 };
    }
  
    update() {}
    draw() {}
  }
  
  // ----------------------------------------------------------------------------
  // Cell Class
  // ----------------------------------------------------------------------------
  class Cell {
    constructor(x, y, type) {
      this.config = GameConfig.getInstance();
      this.x = x;
      this.y = y;
      this.type = type;
      this.isDiscovered = false;
    }
  
    getWorldPosition() {
      return {
        x: (this.x - this.config.MAZE_SIZE / 2) * this.config.CELL_SIZE,
        y: 0,
        z: (this.y - this.config.MAZE_SIZE / 2) * this.config.CELL_SIZE
      };
    }
  }
  
  // ----------------------------------------------------------------------------
  // Maze Generator
  // ----------------------------------------------------------------------------
  class MazeGenerator {
    constructor() {
      this.config = GameConfig.getInstance();
      this.grid = [];
      this.entrance = null;
      this.exit = null;
      this.initialize();
    }
  
    initialize() {
      for (let y = 0; y < this.config.MAZE_SIZE; y++) {
        this.grid[y] = [];
        for (let x = 0; x < this.config.MAZE_SIZE; x++) {
          this.grid[y][x] = new Cell(x, y, this.config.CELL_TYPES.WALL);
        }
      }
    }
  
    generate() {
      this.recursiveBacktracker(1, 1);
      this.createEntranceAndExit();
      return this.grid;
    }
  
    recursiveBacktracker(startX, startY) {
      const stack = [{x: startX, y: startY}];
      this.grid[startY][startX].type = this.config.CELL_TYPES.PATH;
  
      while (stack.length > 0) {
        const current = stack[stack.length - 1];
        const neighbors = this.getUnvisitedNeighbors(current.x, current.y);
  
        if (neighbors.length === 0) {
          stack.pop();
          continue;
        }
  
        const next = neighbors[Math.floor(Math.random() * neighbors.length)];
        const midX = Math.floor(current.x + (next.x - current.x) / 2);
        const midY = Math.floor(current.y + (next.y - current.y) / 2);
  
        this.grid[midY][midX].type = this.config.CELL_TYPES.PATH;
        this.grid[next.y][next.x].type = this.config.CELL_TYPES.PATH;
        stack.push(next);
      }
    }
  
    getUnvisitedNeighbors(x, y) {
      const neighbors = [];
      const directions = [
        {x: 0, y: -2},  // North
        {x: 2, y: 0},   // East
        {x: 0, y: 2},   // South
        {x: -2, y: 0}   // West
      ];
  
      for (const dir of directions) {
        const newX = x + dir.x;
        const newY = y + dir.y;
        if (this.isValidCell(newX, newY) && 
            this.grid[newY][newX].type === this.config.CELL_TYPES.WALL) {
          neighbors.push({x: newX, y: newY});
        }
      }
      return neighbors;
    }
  
    isValidCell(x, y) {
      return x > 0 && x < this.config.MAZE_SIZE - 1 && 
             y > 0 && y < this.config.MAZE_SIZE - 1;
    }
  
    createEntranceAndExit() {
      // Create entrance on top row (first quarter)
      for (let x = 1; x < Math.floor(this.config.MAZE_SIZE / 4); x++) {
        if (this.grid[1][x].type === this.config.CELL_TYPES.PATH) {
          this.entrance = {x: x, y: 0};
          this.grid[0][x].type = this.config.CELL_TYPES.PATH;
          break;
        }
      }
  
      // Create exit on bottom row (last quarter)
      for (let x = this.config.MAZE_SIZE - 2; x > Math.floor(3 * this.config.MAZE_SIZE / 4); x--) {
        if (this.grid[this.config.MAZE_SIZE - 2][x].type === this.config.CELL_TYPES.PATH) {
          this.exit = {x: x, y: this.config.MAZE_SIZE - 1};
          this.grid[this.config.MAZE_SIZE - 1][x].type = this.config.CELL_TYPES.PATH;
          break;
        }
      }
    }
  }
  
  // ----------------------------------------------------------------------------
  // Agent Class
  // ----------------------------------------------------------------------------
  // Priority Queue for A* pathfinding
  class PriorityQueue {
    constructor() {
      this.values = [];
    }
  
    enqueue(val, priority) {
      this.values.push({ val, priority });
      this.sort();
    }
  
    dequeue() {
      return this.values.shift();
    }
  
    sort() {
      this.values.sort((a, b) => a.priority - b.priority);
    }
  }
  
  class Agent extends GameEntity {
    constructor(maze, startPosition, mazeGenerator) {  // Add mazeGenerator parameter
        super(startPosition);
        this.config = GameConfig.getInstance();
        this.maze = maze;
        this.trail = [];
        this.speed = 2;
        this.size = {
            width: this.config.CELL_SIZE * 0.6,
            height: this.config.CELL_SIZE * 0.6,
            depth: this.config.CELL_SIZE * 0.6
        };
        
        this.currentCell = {
            x: Math.floor(this.config.MAZE_SIZE / 2 + startPosition.x / this.config.CELL_SIZE),
            y: Math.floor(this.config.MAZE_SIZE / 2 + startPosition.z / this.config.CELL_SIZE)
        };
        
        this.position.y = -this.size.height / 2;
        this.targetPosition = null;
        this.hasReachedExit = false;
        this.direction = 'south'; // Initial direction
        this.wallFollowDirection = 'right'; // Follow right wall
        this.exitLocation = mazeGenerator.exit;  // Store exit location
    }

    getNextMove() {
        const directions = {
            'north': {dx: 0, dy: -1, right: 'east', left: 'west'},
            'east':  {dx: 1, dy: 0, right: 'south', left: 'north'},
            'south': {dx: 0, dy: 1, right: 'west', left: 'east'},
            'west':  {dx: -1, dy: 0, right: 'north', left: 'south'}
        };

        const current = directions[this.direction];
        const rightDir = directions[current.right];
        
        // Check if we can turn right
        if (this.isValidMove(this.currentCell.x + rightDir.dx, this.currentCell.y + rightDir.dy)) {
            this.direction = current.right;
            return {x: this.currentCell.x + rightDir.dx, y: this.currentCell.y + rightDir.dy};
        }
        
        // Check if we can go straight
        if (this.isValidMove(this.currentCell.x + current.dx, this.currentCell.y + current.dy)) {
            return {x: this.currentCell.x + current.dx, y: this.currentCell.y + current.dy};
        }
        
        // Turn left
        this.direction = directions[this.direction].left;
        return null;
    }

    isValidMove(x, y) {
        if (x === this.exitLocation.x && y === this.exitLocation.y) {
            this.hasReachedExit = true;
            return true;
        }
        return x >= 0 && x < this.config.MAZE_SIZE &&
               y >= 0 && y < this.config.MAZE_SIZE &&
               this.maze[y][x].type === this.config.CELL_TYPES.PATH;
    }

    update() {
        if (this.hasReachedExit) {
            this.targetPosition = null;
            return;
        }

        if (!this.targetPosition) {
            const nextMove = this.getNextMove();
            if (nextMove) {
                this.targetPosition = {
                    x: (nextMove.x - this.config.MAZE_SIZE / 2) * this.config.CELL_SIZE,
                    y: this.position.y,
                    z: (nextMove.y - this.config.MAZE_SIZE / 2) * this.config.CELL_SIZE
                };
            }
        }

        if (this.targetPosition) {
            const dx = this.targetPosition.x - this.position.x;
            const dz = this.targetPosition.z - this.position.z;
            const distance = Math.sqrt(dx * dx + dz * dz);

            if (distance > this.speed) {
                this.position.x += (dx / distance) * this.speed;
                this.position.z += (dz / distance) * this.speed;
                this.trail.push({...this.position});
            } else {
                this.position = {...this.targetPosition};
                this.currentCell = {
                    x: Math.floor(this.config.MAZE_SIZE / 2 + this.position.x / this.config.CELL_SIZE),
                    y: Math.floor(this.config.MAZE_SIZE / 2 + this.position.z / this.config.CELL_SIZE)
                };
                this.targetPosition = null;

                // Check if reached exit - improved detection
                if (this.currentCell.y === this.config.MAZE_SIZE - 1 &&
                    Math.abs(this.position.x - (this.maze[this.config.MAZE_SIZE-1].findIndex(cell => 
                        cell.type === this.config.CELL_TYPES.PATH) - this.config.MAZE_SIZE / 2) 
                        * this.config.CELL_SIZE) < this.config.CELL_SIZE) {
                    this.hasReachedExit = true;
                }
            }
        }
    }

    draw() {
        // Draw permanent trail
        push();
        stroke(255, 0, 0);
        strokeWeight(3);
        noFill();
        beginShape();
        for (const pos of this.trail) {
            vertex(pos.x, pos.y, pos.z);
        }
        vertex(this.position.x, this.position.y, this.position.z);
        endShape();
        pop();

        // Draw agent
        push();
        translate(this.position.x, this.position.y, this.position.z);
        fill(this.config.COLORS.AGENT);
        box(this.size.width, this.size.height, this.size.depth);
        pop();
    }
}
  
  // ----------------------------------------------------------------------------
  // Main Game Class
  // ----------------------------------------------------------------------------
  class MazeGame {
    constructor() {
      this.config = GameConfig.getInstance();
      this.maze = null;
      this.agent = null;
      this.mazeGenerator = new MazeGenerator();
    }
  
    setup() {
      createCanvas(windowWidth, windowHeight, WEBGL);
      perspective(PI / 3, width / height, 1, 5000);
      this.maze = this.mazeGenerator.generate();
      
      // Create agent at entrance
      const startPos = {
        x: (this.mazeGenerator.entrance.x - this.config.MAZE_SIZE / 2) * this.config.CELL_SIZE,
        y: 0,
        z: (this.mazeGenerator.entrance.y - this.config.MAZE_SIZE / 2) * this.config.CELL_SIZE
      };
      this.agent = new Agent(this.maze, startPos, this.mazeGenerator); // Modified agent creation to pass mazeGenerator
    }
  
    update() {
      if (this.agent) {
        this.agent.update();
      }
    }
  
    draw() {
      background(200);
      
      // Enable mouse controls
      orbitControl(4, 4, 0.2);
      
      // Setup lighting
      ambientLight(100);
      pointLight(255, 255, 255, 0, -500, 0);
      directionalLight(255, 255, 255, -1, -1, -1);
  
      // Draw maze
      push();
      for (let y = 0; y < this.config.MAZE_SIZE; y++) {
        for (let x = 0; x < this.config.MAZE_SIZE; x++) {
          if (this.maze[y][x].type === this.config.CELL_TYPES.WALL) {
            const pos = this.maze[y][x].getWorldPosition();
            push();
            translate(pos.x, -this.config.WALL_HEIGHT/2, pos.z);
            fill(100);
            box(this.config.CELL_SIZE, this.config.WALL_HEIGHT, this.config.CELL_SIZE);
            pop();
          }
        }
      }
      pop();
  
      // Draw exit marker
      if (this.mazeGenerator.exit) {
        const exitPos = {
          x: (this.mazeGenerator.exit.x - this.config.MAZE_SIZE / 2) * this.config.CELL_SIZE,
          z: (this.mazeGenerator.exit.y - this.config.MAZE_SIZE / 2) * this.config.CELL_SIZE
        };
        push();
        translate(exitPos.x, -this.config.WALL_HEIGHT/2, exitPos.z);
        fill(0, 255, 0);
        box(this.config.CELL_SIZE, this.config.WALL_HEIGHT, this.config.CELL_SIZE);
        pop();
      }
  
      // Draw agent
      if (this.agent) {
        this.agent.draw();
      }

      // Draw success message when agent reaches exit
      if (this.agent && this.agent.hasReachedExit) {
        push();
        // Position the text in front of the camera
        let cam = createCamera();
        let camPos = cam.eyeX;
        translate(camPos, -200, -400);
        textSize(50);
        textAlign(CENTER);
        fill(0, 255, 0);
        text('Exit Found!', 0, 0);
        pop();
      }
    }
  
    handleWindowResize() {
      resizeCanvas(windowWidth, windowHeight);
      perspective(PI / 3, width / height, 1, 5000);
    }
  }
  
  // ----------------------------------------------------------------------------
  // Global game instance and p5.js functions
  // ----------------------------------------------------------------------------
  let game;
  
  function setup() {
    game = new MazeGame();
    game.setup();
  }
  
  function draw() {
    game.update();
    game.draw();
  }
  
  function windowResized() {
    game.handleWindowResize();
  }
  
  function keyPressed() {
    if (key === 'R' || key === 'r') {
      game = new MazeGame();
      game.setup();
    }
  }