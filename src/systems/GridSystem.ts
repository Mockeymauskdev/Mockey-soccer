/**
 * Grid-based soccer field system
 * Field is divided into a tactical grid for turn-based positioning
 */

export interface GridCell {
  x: number
  y: number
  gridX: number
  gridY: number
  occupied: boolean
  occupiedBy?: string
}

export interface GridPosition {
  gridX: number
  gridY: number
}

export class GridSystem {
  private gridWidth: number = 12 // 12 cells wide
  private gridHeight: number = 8 // 8 cells tall
  private cellWidth: number = 0
  private cellHeight: number = 0
  private fieldX: number = 50
  private fieldY: number = 100
  private fieldWidth: number = 1000
  private fieldHeight: number = 600
  private grid: GridCell[][] = []

  constructor(fieldX: number, fieldY: number, fieldWidth: number, fieldHeight: number) {
    this.fieldX = fieldX
    this.fieldY = fieldY
    this.fieldWidth = fieldWidth
    this.fieldHeight = fieldHeight
    this.cellWidth = this.fieldWidth / this.gridWidth
    this.cellHeight = this.fieldHeight / this.gridHeight
    this.initializeGrid()
  }

  /**
   * Initialize the grid
   */
  private initializeGrid() {
    this.grid = []
    for (let y = 0; y < this.gridHeight; y++) {
      this.grid[y] = []
      for (let x = 0; x < this.gridWidth; x++) {
        this.grid[y][x] = {
          x: this.fieldX + x * this.cellWidth + this.cellWidth / 2,
          y: this.fieldY + y * this.cellHeight + this.cellHeight / 2,
          gridX: x,
          gridY: y,
          occupied: false,
        }
      }
    }
  }

  /**
   * Convert world coordinates to grid position
   */
  worldToGrid(worldX: number, worldY: number): GridPosition {
    const gridX = Math.floor((worldX - this.fieldX) / this.cellWidth)
    const gridY = Math.floor((worldY - this.fieldY) / this.cellHeight)

    return {
      gridX: Math.max(0, Math.min(this.gridWidth - 1, gridX)),
      gridY: Math.max(0, Math.min(this.gridHeight - 1, gridY)),
    }
  }

  /**
   * Convert grid position to world coordinates
   */
  gridToWorld(gridX: number, gridY: number): { x: number; y: number } {
    return {
      x: this.fieldX + gridX * this.cellWidth + this.cellWidth / 2,
      y: this.fieldY + gridY * this.cellHeight + this.cellHeight / 2,
    }
  }

  /**
   * Get grid cell at position
   */
  getCell(gridX: number, gridY: number): GridCell | null {
    if (gridX < 0 || gridX >= this.gridWidth || gridY < 0 || gridY >= this.gridHeight) {
      return null
    }
    return this.grid[gridY][gridX]
  }

  /**
   * Set cell as occupied
   */
  setOccupied(gridX: number, gridY: number, playerId: string) {
    const cell = this.getCell(gridX, gridY)
    if (cell) {
      cell.occupied = true
      cell.occupiedBy = playerId
    }
  }

  /**
   * Clear cell occupation
   */
  clearOccupied(gridX: number, gridY: number) {
    const cell = this.getCell(gridX, gridY)
    if (cell) {
      cell.occupied = false
      cell.occupiedBy = undefined
    }
  }

  /**
   * Get distance between two grid positions
   */
  distance(gridX1: number, gridY1: number, gridX2: number, gridY2: number): number {
    const dx = gridX2 - gridX1
    const dy = gridY2 - gridY1
    return Math.sqrt(dx * dx + dy * dy)
  }

  /**
   * Get cells within range
   */
  getCellsInRange(gridX: number, gridY: number, range: number): GridCell[] {
    const cells: GridCell[] = []

    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        const dist = this.distance(gridX, gridY, x, y)
        if (dist <= range && dist > 0) {
          const cell = this.getCell(x, y)
          if (cell) {
            cells.push(cell)
          }
        }
      }
    }

    return cells
  }

  /**
   * Get all grid cells
   */
  getAllCells(): GridCell[] {
    const cells: GridCell[] = []
    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        const cell = this.getCell(x, y)
        if (cell) {
          cells.push(cell)
        }
      }
    }
    return cells
  }

  /**
   * Get grid dimensions
   */
  getDimensions() {
    return {
      width: this.gridWidth,
      height: this.gridHeight,
      cellWidth: this.cellWidth,
      cellHeight: this.cellHeight,
    }
  }

  /**
   * Get field boundaries
   */
  getFieldBounds() {
    return {
      x: this.fieldX,
      y: this.fieldY,
      width: this.fieldWidth,
      height: this.fieldHeight,
    }
  }
}
