import Phaser from 'phaser'

export default class SoccerPlayer {
  x: number
  y: number
  team: 'blue' | 'red'
  playerName: string
  number: number
  role: string
  isMoving: boolean = false
  targetX: number
  targetY: number
  speed: number = 120 // pixels per second
  scene: any

  // AI behavior
  plannedAction: string | null = null
  plannedActionTime: number = 0

  constructor(
    scene: any,
    x: number,
    y: number,
    team: 'blue' | 'red',
    role: string,
    number: number
  ) {
    this.scene = scene
    this.x = x
    this.y = y
    this.team = team
    this.playerName = role
    this.number = number
    this.role = role
    this.targetX = x
    this.targetY = y
  }

  update() {
    // Update movement
    if (this.isMoving) {
      const distance = Phaser.Math.Distance.Between(this.x, this.y, this.targetX, this.targetY)

      if (distance > 5) {
        const angle = Phaser.Math.Angle.Between(this.x, this.y, this.targetX, this.targetY)
        const moveDistance = this.speed * (this.scene.game.loop.delta / 1000)

        this.x += Math.cos(angle) * moveDistance
        this.y += Math.sin(angle) * moveDistance
      } else {
        this.x = this.targetX
        this.y = this.targetY
        this.isMoving = false
      }
    }

    // AI positioning behavior
    this.updateAIBehavior()

    // Update planned action timer
    if (this.plannedAction) {
      this.plannedActionTime++
      if (this.plannedActionTime > 3000) {
        this.plannedAction = null
        this.plannedActionTime = 0
      }
    }
  }

  private updateAIBehavior() {
    // Get game state
    const ballOwner = this.scene.gameState?.ballOwner
    const players = this.scene.players || []
    const ball = this.scene.ball

    if (!ballOwner || !ball) return

    // Goalkeeper behavior
    if (this.role === 'Goalkeeper') {
      this.updateGoalkeeperBehavior(ball)
      return
    }

    // If this player has the ball, move towards goal
    if (ballOwner === this) {
      this.moveTowardsGoal()
      return
    }

    // If teammate has ball, support them
    if (ballOwner.team === this.team) {
      this.supportTeammate(ballOwner, players)
      return
    }

    // If opponent has ball, defend
    this.defendAgainstOpponent(ballOwner, players)
  }

  private updateGoalkeeperBehavior(ball: any) {
    const goalAreaX = this.team === 'blue' ? 150 : 900
    const goalAreaMinX = this.team === 'blue' ? 100 : 850
    const goalAreaMaxX = this.team === 'blue' ? 200 : 950

    // Stay in goal area
    if (this.x < goalAreaMinX || this.x > goalAreaMaxX) {
      this.moveTo(goalAreaX, this.y)
      return
    }

    // Move side-to-side based on ball position
    const ballY = ball.y
    const goalTop = 280
    const goalBottom = 520

    if (ballY < goalTop) {
      this.moveTo(this.x, goalTop + 20)
    } else if (ballY > goalBottom) {
      this.moveTo(this.x, goalBottom - 20)
    } else {
      this.moveTo(this.x, ballY)
    }
  }

  private moveTowardsGoal() {
    const goalX = this.team === 'blue' ? 1000 : 50
    const goalY = 400

    // Move towards goal, but not too far
    const distance = Phaser.Math.Distance.Between(this.x, this.y, goalX, goalY)

    if (distance > 100) {
      const angle = Phaser.Math.Angle.Between(this.x, this.y, goalX, goalY)
      const moveDistance = 80

      const newX = this.x + Math.cos(angle) * moveDistance
      const newY = this.y + Math.sin(angle) * moveDistance

      // Stay on field
      const fieldX = 50
      const fieldY = 100
      const fieldWidth = 1000
      const fieldHeight = 600

      const clampedX = Math.max(fieldX + 20, Math.min(fieldX + fieldWidth - 20, newX))
      const clampedY = Math.max(fieldY + 20, Math.min(fieldY + fieldHeight - 20, newY))

      this.moveTo(clampedX, clampedY)
    }
  }

  private supportTeammate(teammate: SoccerPlayer, players: SoccerPlayer[]) {
    // Find open space near teammate
    const teammates = players.filter((p) => p.team === this.team && p !== this && p !== teammate)

    if (teammates.length === 0) return

    // Move towards teammate if far away
    const distance = Phaser.Math.Distance.Between(this.x, this.y, teammate.x, teammate.y)

    if (distance > 150) {
      // Move towards teammate
      const angle = Phaser.Math.Angle.Between(this.x, this.y, teammate.x, teammate.y)
      const moveDistance = 60

      const newX = this.x + Math.cos(angle) * moveDistance
      const newY = this.y + Math.sin(angle) * moveDistance

      // Stay on field
      const fieldX = 50
      const fieldY = 100
      const fieldWidth = 1000
      const fieldHeight = 600

      const clampedX = Math.max(fieldX + 20, Math.min(fieldX + fieldWidth - 20, newX))
      const clampedY = Math.max(fieldY + 20, Math.min(fieldY + fieldHeight - 20, newY))

      this.moveTo(clampedX, clampedY)
    } else {
      // Move to open space (spread out)
      const spreadX = this.team === 'blue' ? this.x + 50 : this.x - 50
      const spreadY = this.y + (Math.random() - 0.5) * 100

      const fieldX = 50
      const fieldY = 100
      const fieldWidth = 1000
      const fieldHeight = 600

      const clampedX = Math.max(fieldX + 20, Math.min(fieldX + fieldWidth - 20, spreadX))
      const clampedY = Math.max(fieldY + 20, Math.min(fieldY + fieldHeight - 20, spreadY))

      this.moveTo(clampedX, clampedY)
    }
  }

  private defendAgainstOpponent(_opponent: SoccerPlayer, players: SoccerPlayer[]) {
    // Mark the nearest opponent
    const opponents = players.filter((p) => p.team !== this.team)

    if (opponents.length === 0) return

    const nearest = opponents.reduce((prev, curr) => {
      const prevDist = Phaser.Math.Distance.Between(this.x, this.y, prev.x, prev.y)
      const currDist = Phaser.Math.Distance.Between(this.x, this.y, curr.x, curr.y)
      return currDist < prevDist ? curr : prev
    })

    // Move towards nearest opponent to mark them
    const distance = Phaser.Math.Distance.Between(this.x, this.y, nearest.x, nearest.y)

    if (distance > 50) {
      const angle = Phaser.Math.Angle.Between(this.x, this.y, nearest.x, nearest.y)
      const moveDistance = 70

      const newX = this.x + Math.cos(angle) * moveDistance
      const newY = this.y + Math.sin(angle) * moveDistance

      // Stay on field
      const fieldX = 50
      const fieldY = 100
      const fieldWidth = 1000
      const fieldHeight = 600

      const clampedX = Math.max(fieldX + 20, Math.min(fieldX + fieldWidth - 20, newX))
      const clampedY = Math.max(fieldY + 20, Math.min(fieldY + fieldHeight - 20, newY))

      this.moveTo(clampedX, clampedY)
    }
  }

  moveTo(x: number, y: number) {
    this.targetX = x
    this.targetY = y
    this.isMoving = true
  }

  stopMoving() {
    this.isMoving = false
  }

  setPlan(action: string) {
    this.plannedAction = action
    this.plannedActionTime = 0
  }

  getPlan(): string | null {
    return this.plannedAction
  }
}
