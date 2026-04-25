import Phaser from 'phaser'
import SoccerPlayer from '../entities/SoccerPlayer'
import Ball from '../entities/Ball'
import MiniMap from '../ui/MiniMap'
import ActionMenu from '../ui/ActionMenu'
import Narrative from '../ui/Narrative'

interface GameState {
  currentPlayerIndex: number
  ballOwner: SoccerPlayer | null
  gamePhase: 'menu' | 'aiming' | 'resolving' | 'narrative'
  aimingTimer: number
  aimingDuration: number
  gameTime: number // in seconds
  matchDuration: number // total match time in seconds
}

interface PlayerAction {
  playerIndex: number
  action: string
  targetIndex?: number
  successChance: number
}

export default class GameScene extends Phaser.Scene {
  private players: SoccerPlayer[] = []
  private ball: Ball | null = null
  private miniMap: MiniMap | null = null
  private actionMenu: ActionMenu | null = null
  private narrative: Narrative | null = null
  private fieldGraphics: Phaser.GameObjects.Graphics | null = null
  private trajectoryGraphics: Phaser.GameObjects.Graphics | null = null
  private uiGraphics: Phaser.GameObjects.Graphics | null = null
  private gameState: GameState = {
    currentPlayerIndex: 0,
    ballOwner: null,
    gamePhase: 'menu',
    aimingTimer: 0,
    aimingDuration: 3000,
    gameTime: 0,
    matchDuration: 90 * 60, // 90 minutes
  }
  private selectedAction: string | null = null
  private aimAccuracy: number = 0.5
  private autoPlay: boolean = true
  private fieldX: number = 50
  private fieldY: number = 100
  private fieldWidth: number = 1000
  private fieldHeight: number = 600
  private timerText: Phaser.GameObjects.Text | null = null
  private gameTimerText: Phaser.GameObjects.Text | null = null
  private ballOwnerText: Phaser.GameObjects.Text | null = null
  private actionInfoText: Phaser.GameObjects.Text | null = null
  private opponentActionText: Phaser.GameObjects.Text | null = null
  private playerSprites: Map<SoccerPlayer, Phaser.GameObjects.Container> = new Map()
  private plannedActions: Map<number, PlayerAction> = new Map()

  constructor() {
    super('GameScene')
  }

  create() {
    // Create field background using graphics
    this.fieldGraphics = this.make.graphics({ x: 0, y: 0, add: true } as any)
    this.trajectoryGraphics = this.make.graphics({ x: 0, y: 0, add: true } as any)
    this.uiGraphics = this.make.graphics({ x: 0, y: 0, add: true } as any)

    // Draw field
    this.fieldGraphics.fillStyle(0x2d5016, 1)
    this.fieldGraphics.fillRect(this.fieldX, this.fieldY, this.fieldWidth, this.fieldHeight)

    // Draw field lines
    this.fieldGraphics.lineStyle(2, 0xffffff, 1)
    this.fieldGraphics.strokeRect(this.fieldX, this.fieldY, this.fieldWidth, this.fieldHeight)

    // Center line
    this.fieldGraphics.lineBetween(
      this.fieldX + this.fieldWidth / 2,
      this.fieldY,
      this.fieldX + this.fieldWidth / 2,
      this.fieldY + this.fieldHeight
    )

    // Center circle
    this.fieldGraphics.strokeCircle(
      this.fieldX + this.fieldWidth / 2,
      this.fieldY + this.fieldHeight / 2,
      40
    )

    // Center spot
    this.fieldGraphics.fillStyle(0xffffff, 1)
    this.fieldGraphics.fillCircle(this.fieldX + this.fieldWidth / 2, this.fieldY + this.fieldHeight / 2, 3)

    // Draw goal boxes
    const goalBoxWidth = 150
    const goalBoxHeight = 200
    const goalBoxY = this.fieldY + (this.fieldHeight - goalBoxHeight) / 2

    // Left goal box
    this.fieldGraphics.lineStyle(2, 0xffffff, 1)
    this.fieldGraphics.strokeRect(this.fieldX + 10, goalBoxY, goalBoxWidth, goalBoxHeight)

    // Right goal box
    this.fieldGraphics.strokeRect(
      this.fieldX + this.fieldWidth - goalBoxWidth - 10,
      goalBoxY,
      goalBoxWidth,
      goalBoxHeight
    )

    // Draw goal lines
    this.fieldGraphics.lineStyle(3, 0xff0000, 0.5)
    this.fieldGraphics.lineBetween(this.fieldX, this.fieldY + this.fieldHeight / 2 - 30, this.fieldX, this.fieldY + this.fieldHeight / 2 + 30)
    this.fieldGraphics.lineBetween(
      this.fieldX + this.fieldWidth,
      this.fieldY + this.fieldHeight / 2 - 30,
      this.fieldX + this.fieldWidth,
      this.fieldY + this.fieldHeight / 2 + 30
    )

    // Create players
    const teamA = [
      new SoccerPlayer(this, 150, 250, 'blue', 'Goalkeeper', 1),
      new SoccerPlayer(this, 280, 180, 'blue', 'Defender', 2),
      new SoccerPlayer(this, 280, 320, 'blue', 'Defender', 3),
      new SoccerPlayer(this, 420, 250, 'blue', 'Midfielder', 4),
      new SoccerPlayer(this, 550, 200, 'blue', 'Forward', 5),
    ]

    const teamB = [
      new SoccerPlayer(this, 900, 250, 'red', 'Goalkeeper', 6),
      new SoccerPlayer(this, 770, 180, 'red', 'Defender', 7),
      new SoccerPlayer(this, 770, 320, 'red', 'Defender', 8),
      new SoccerPlayer(this, 630, 250, 'red', 'Midfielder', 9),
      new SoccerPlayer(this, 500, 200, 'red', 'Forward', 10),
    ]

    this.players = [...teamA, ...teamB]

    // Create sprite representations for each player
    this.players.forEach((player, index) => {
      this.createPlayerSprite(player, index)
    })

    // Create ball
    this.ball = new Ball(this, 500, 250)

    // Set initial ball owner
    this.gameState.ballOwner = this.players[4]
    this.gameState.currentPlayerIndex = 4

    // Create UI text elements
    this.gameTimerText = this.add.text(50, 50, '0:00', {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      backgroundColor: '#000000',
      padding: { x: 10, y: 5 },
    })
    this.gameTimerText.setDepth(100)

    this.timerText = this.add.text(50, 85, 'Time: 0s', {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'Arial',
      backgroundColor: '#000000',
      padding: { x: 10, y: 5 },
    })
    this.timerText.setDepth(100)

    this.ballOwnerText = this.add.text(50, 115, '', {
      fontSize: '16px',
      color: '#ffff00',
      fontFamily: 'Arial',
      backgroundColor: '#000000',
      padding: { x: 10, y: 5 },
    })
    this.ballOwnerText.setDepth(100)

    this.actionInfoText = this.add.text(50, 145, '', {
      fontSize: '14px',
      color: '#00ff00',
      fontFamily: 'Arial',
      backgroundColor: '#000000',
      padding: { x: 10, y: 5 },
    })
    this.actionInfoText.setDepth(100)

    this.opponentActionText = this.add.text(50, 175, '', {
      fontSize: '14px',
      color: '#ff6600',
      fontFamily: 'Arial',
      backgroundColor: '#000000',
      padding: { x: 10, y: 5 },
    })
    this.opponentActionText.setDepth(100)

    // Create UI elements
    this.miniMap = new MiniMap(this, 1050, 150, this.players, this.ball)
    this.actionMenu = new ActionMenu(this, 1050, 400)
    this.narrative = new Narrative(this, 50, 750)

    // Initial narrative
    this.narrative.addMessage('Match started! Team Blue has possession.')
    this.narrative.addMessage('Forward #5 has the ball.')

    // Input handling
    this.input.keyboard?.on('keydown-UP', () => this.selectMenuOption(-1))
    this.input.keyboard?.on('keydown-DOWN', () => this.selectMenuOption(1))
    this.input.keyboard?.on('keydown-SPACE', () => this.confirmAction())
    this.input.keyboard?.on('keydown-ESC', () => this.cancelAction())

    this.gameState.gamePhase = 'menu'

    // Start auto-play
    this.time.delayedCall(1000, () => {
      this.autoPlayNextAction()
    })

    // Update game timer every second
    this.time.addEvent({
      delay: 1000,
      callback: () => {
        this.gameState.gameTime++
      },
      loop: true,
    })
  }

  update() {
    if (!this.ball || !this.gameState.ballOwner) return

    // Update player positions
    this.players.forEach((player) => {
      player.update()
      this.updatePlayerSprite(player)
    })

    // Update ball
    this.ball.update()

    // Ball follows player with possession
    if (!this.ball.isMoving && this.gameState.ballOwner) {
      this.ball.x = this.gameState.ballOwner.x
      this.ball.y = this.gameState.ballOwner.y - 15
    }

    // Update mini map
    if (this.miniMap) {
      this.miniMap.update()
    }

    // Draw ball owner highlight
    this.drawBallOwnerHighlight()

    // Update timers
    if (this.timerText) {
      const elapsed = Math.floor(this.gameState.aimingTimer / 1000)
      this.timerText.setText(`Action Time: ${elapsed}s`)
    }

    if (this.gameTimerText) {
      const minutes = Math.floor(this.gameState.gameTime / 60)
      const seconds = this.gameState.gameTime % 60
      this.gameTimerText.setText(`${minutes}:${seconds.toString().padStart(2, '0')}`)
    }

    // Update ball owner info
    if (this.ballOwnerText && this.gameState.ballOwner) {
      const team = this.gameState.ballOwner.team.toUpperCase()
      this.ballOwnerText.setText(`🔵 ${this.gameState.ballOwner.playerName} #${this.gameState.ballOwner.number} (${team})`)
      this.ballOwnerText.setColor(this.gameState.ballOwner.team === 'blue' ? '#0066ff' : '#ff0000')
    }

    // Handle aiming phase
    if (this.gameState.gamePhase === 'aiming') {
      this.gameState.aimingTimer += this.game.loop.delta

      // Calculate accuracy based on time (peaks at 50%)
      const progress = this.gameState.aimingTimer / this.gameState.aimingDuration
      if (progress < 0.5) {
        this.aimAccuracy = progress * 2
      } else {
        this.aimAccuracy = (1 - progress) * 2
      }

      // Auto-complete aiming after duration
      if (this.gameState.aimingTimer >= this.gameState.aimingDuration) {
        this.resolveAction()
      }

      // Update action menu
      if (this.actionMenu) {
        this.actionMenu.setAimingProgress(progress)
      }

      // Draw trajectory
      this.drawTrajectory()
    }
  }

  private createPlayerSprite(player: SoccerPlayer, index: number) {
    const container = this.add.container(player.x, player.y)
    container.setDepth(5)

    // Create player body (colored square)
    const graphics = this.make.graphics({ x: 0, y: 0, add: false } as any)
    const color = player.team === 'blue' ? 0x0066ff : 0xff0000
    graphics.fillStyle(color, 1)
    graphics.fillRect(-12, -12, 24, 24)

    // Add border
    graphics.lineStyle(2, 0xffffff, 1)
    graphics.strokeRect(-12, -12, 24, 24)

    graphics.generateTexture(`player_${index}`, 24, 24)
    graphics.destroy()

    const sprite = this.add.sprite(0, 0, `player_${index}`)
    container.add(sprite)

    // Add player number
    const numberText = this.add.text(0, 0, player.number.toString(), {
      fontSize: '12px',
      color: '#ffffff',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      align: 'center',
    })
    numberText.setOrigin(0.5, 0.5)
    container.add(numberText)

    this.playerSprites.set(player, container)
  }

  private updatePlayerSprite(player: SoccerPlayer) {
    const sprite = this.playerSprites.get(player)
    if (sprite) {
      sprite.setPosition(player.x, player.y)
    }
  }

  private drawBallOwnerHighlight() {
    if (!this.uiGraphics || !this.gameState.ballOwner) return

    this.uiGraphics.clear()

    // Draw glowing circle around ball owner
    this.uiGraphics.lineStyle(3, 0xffff00, 0.8)
    this.uiGraphics.strokeCircle(this.gameState.ballOwner.x, this.gameState.ballOwner.y, 25)

    // Draw player name above
    const nameText = this.add.text(
      this.gameState.ballOwner.x - 40,
      this.gameState.ballOwner.y - 40,
      `${this.gameState.ballOwner.playerName} #${this.gameState.ballOwner.number}`,
      {
        fontSize: '12px',
        color: '#ffff00',
        fontFamily: 'Arial',
        backgroundColor: '#000000',
        padding: { x: 3, y: 2 },
      }
    )
    nameText.setDepth(8)
  }

  private calculatePositioningSuccessModifier(player: SoccerPlayer, targetPlayer?: SoccerPlayer): number {
    if (!targetPlayer) return 1.0

    // Calculate distance between players
    const distance = Phaser.Math.Distance.Between(player.x, player.y, targetPlayer.x, targetPlayer.y)
    
    // Distance modifier: closer is better (max 1.2x at 0 distance, min 0.6x at max distance)
    const maxDistance = 300
    const distanceModifier = Math.max(0.6, 1.2 - (distance / maxDistance) * 0.6)

    // Position modifier: if target is in better position (forward for attacking team)
    let positionModifier = 1.0
    if (player.team === 'blue' && targetPlayer.x > player.x) {
      positionModifier = 1.1 // Bonus for passing forward
    } else if (player.team === 'red' && targetPlayer.x < player.x) {
      positionModifier = 1.1 // Bonus for passing forward
    }

    return distanceModifier * positionModifier
  }

  private calculateOpponentDefenseModifier(targetPlayer: SoccerPlayer): number {
    // Find nearest opponent
    const opponents = this.players.filter((p) => p.team !== targetPlayer.team)
    if (opponents.length === 0) return 1.0

    const nearest = opponents.reduce((prev, curr) => {
      const prevDist = Phaser.Math.Distance.Between(targetPlayer.x, targetPlayer.y, prev.x, prev.y)
      const currDist = Phaser.Math.Distance.Between(targetPlayer.x, targetPlayer.y, curr.x, curr.y)
      return currDist < prevDist ? curr : prev
    })

    // Closer defenders reduce success chance
    const distance = Phaser.Math.Distance.Between(targetPlayer.x, targetPlayer.y, nearest.x, nearest.y)
    const maxDistance = 200
    const defenseModifier = Math.max(0.5, 1.0 - (maxDistance - distance) / maxDistance * 0.5)

    return defenseModifier
  }

  private drawTrajectory() {
    if (!this.trajectoryGraphics || !this.gameState.ballOwner || !this.selectedAction) return

    this.trajectoryGraphics.clear()

    const player = this.gameState.ballOwner
    let targetX = player.x
    let targetY = player.y
    let targetPlayer: SoccerPlayer | null = null

    if (this.selectedAction === 'pass') {
      const teammates = this.players.filter(
        (p) => p.team === player.team && p !== player
      )
      if (teammates.length > 0) {
        targetPlayer = teammates[0]
        targetX = targetPlayer.x
        targetY = targetPlayer.y
      }
    } else if (this.selectedAction === 'shoot') {
      targetX = player.team === 'blue' ? this.fieldX + this.fieldWidth : this.fieldX
      targetY = this.fieldY + this.fieldHeight / 2
    } else if (this.selectedAction === 'dribble') {
      targetX = player.team === 'blue' ? player.x + 100 : player.x - 100
      targetY = player.y
    } else if (this.selectedAction === 'run') {
      targetX = player.team === 'blue' ? player.x + 150 : player.x - 150
      targetY = player.y
    }

    // Draw arrow
    const angle = Phaser.Math.Angle.Between(player.x, player.y, targetX, targetY)

    // Draw line
    this.trajectoryGraphics.lineStyle(2, 0xffff00, 0.6)
    this.trajectoryGraphics.lineBetween(player.x, player.y, targetX, targetY)

    // Draw arrowhead
    const arrowSize = 15
    const arrowX1 = targetX - Math.cos(angle - Math.PI / 6) * arrowSize
    const arrowY1 = targetY - Math.sin(angle - Math.PI / 6) * arrowSize
    const arrowX2 = targetX - Math.cos(angle + Math.PI / 6) * arrowSize
    const arrowY2 = targetY - Math.sin(angle + Math.PI / 6) * arrowSize

    this.trajectoryGraphics.lineStyle(2, 0xffff00, 0.6)
    this.trajectoryGraphics.lineBetween(targetX, targetY, arrowX1, arrowY1)
    this.trajectoryGraphics.lineBetween(targetX, targetY, arrowX2, arrowY2)

    // Calculate success rate with positioning
    const baseSuccessRate: Record<string, number> = {
      pass: 0.75,
      shoot: 0.5,
      dribble: 0.6,
      juggle: 0.4,
      run: 0.9,
    }

    const baseRate = baseSuccessRate[this.selectedAction] || 0.5
    let successRate = baseRate * (0.5 + this.aimAccuracy)

    // Apply positioning modifiers
    if (targetPlayer) {
      const positioningModifier = this.calculatePositioningSuccessModifier(player, targetPlayer)
      const defenseModifier = this.calculateOpponentDefenseModifier(targetPlayer)
      successRate *= positioningModifier * defenseModifier
    } else if (this.selectedAction === 'shoot') {
      const defenseModifier = this.calculateOpponentDefenseModifier(player)
      successRate *= defenseModifier
    }

    successRate = Math.min(0.99, Math.max(0.01, successRate)) // Clamp between 1% and 99%

    const actionName = this.selectedAction.charAt(0).toUpperCase() + this.selectedAction.slice(1)

    const text = this.add.text(
      (player.x + targetX) / 2,
      (player.y + targetY) / 2 - 20,
      `${actionName}\n${Math.round(successRate * 100)}%`,
      {
        fontSize: '14px',
        color: '#ffff00',
        fontFamily: 'Arial',
        backgroundColor: '#000000',
        padding: { x: 8, y: 5 },
        align: 'center',
      }
    )
    text.setDepth(8)

    // Update action info
    if (this.actionInfoText) {
      this.actionInfoText.setText(`Action: ${actionName} | Accuracy: ${Math.round(this.aimAccuracy * 100)}%`)
    }
  }

  private planOpponentAction() {
    if (!this.gameState.ballOwner) return

    const opponents = this.players.filter((p) => p.team !== this.gameState.ballOwner?.team)
    if (opponents.length === 0) return

    // Find nearest opponent to ball
    const nearest = opponents.reduce((prev, curr) => {
      const prevDist = Phaser.Math.Distance.Between(
        this.gameState.ballOwner!.x,
        this.gameState.ballOwner!.y,
        prev.x,
        prev.y
      )
      const currDist = Phaser.Math.Distance.Between(
        this.gameState.ballOwner!.x,
        this.gameState.ballOwner!.y,
        curr.x,
        curr.y
      )
      return currDist < prevDist ? curr : prev
    })

    const actions = ['pass', 'shoot', 'dribble', 'run']
    const plannedAction = actions[Math.floor(Math.random() * actions.length)]
    const playerIndex = this.players.indexOf(nearest)

    this.plannedActions.set(playerIndex, {
      playerIndex,
      action: plannedAction,
      successChance: Math.round(Math.random() * 100),
    })

    if (this.opponentActionText) {
      this.opponentActionText.setText(
        `⚠️ ${nearest.playerName} #${nearest.number} planning: ${plannedAction.toUpperCase()}`
      )
    }
  }

  private autoPlayNextAction() {
    if (!this.autoPlay || !this.gameState.ballOwner) return

    // Plan opponent actions
    this.planOpponentAction()

    const actions = ['pass', 'shoot', 'dribble', 'juggle', 'run']
    const randomAction = actions[Math.floor(Math.random() * actions.length)]

    this.selectedAction = randomAction
    this.gameState.gamePhase = 'aiming'
    this.gameState.aimingTimer = 0
    this.aimAccuracy = 0

    if (this.actionMenu) {
      this.actionMenu.setCurrentAction(randomAction)
      this.actionMenu.showAimingBar()
    }

    this.time.delayedCall(this.gameState.aimingDuration, () => {
      if (this.gameState.gamePhase === 'aiming') {
        this.resolveAction()
      }
    })
  }

  private selectMenuOption(direction: number) {
    if (this.gameState.gamePhase === 'menu' && this.actionMenu) {
      this.actionMenu.selectOption(direction)
    }
  }

  private confirmAction() {
    if (this.gameState.gamePhase === 'menu') {
      this.selectedAction = this.actionMenu?.getSelectedAction() || null

      if (this.selectedAction) {
        this.gameState.gamePhase = 'aiming'
        this.gameState.aimingTimer = 0
        this.aimAccuracy = 0

        if (this.actionMenu) {
          this.actionMenu.setCurrentAction(this.selectedAction)
          this.actionMenu.showAimingBar()
        }
      }
    }
  }

  private cancelAction() {
    if (this.gameState.gamePhase === 'aiming') {
      this.gameState.gamePhase = 'menu'
      this.gameState.aimingTimer = 0

      if (this.actionMenu) {
        this.actionMenu.hideAimingBar()
        this.actionMenu.reset()
      }

      this.trajectoryGraphics?.clear()
    }
  }

  private resolveAction() {
    if (!this.selectedAction || !this.gameState.ballOwner) return

    this.gameState.gamePhase = 'resolving'
    this.trajectoryGraphics?.clear()

    const baseSuccessRate: Record<string, number> = {
      pass: 0.75,
      shoot: 0.5,
      dribble: 0.6,
      juggle: 0.4,
      run: 0.9,
    }

    const player = this.gameState.ballOwner
    const baseRate = baseSuccessRate[this.selectedAction] || 0.5
    let successRate = baseRate * (0.5 + this.aimAccuracy)

    // Apply positioning modifiers for pass
    if (this.selectedAction === 'pass') {
      const teammates = this.players.filter((p) => p.team === player.team && p !== player)
      if (teammates.length > 0) {
        const targetPlayer = teammates[0]
        const positioningModifier = this.calculatePositioningSuccessModifier(player, targetPlayer)
        const defenseModifier = this.calculateOpponentDefenseModifier(targetPlayer)
        successRate *= positioningModifier * defenseModifier
      }
    } else if (this.selectedAction === 'shoot') {
      const defenseModifier = this.calculateOpponentDefenseModifier(player)
      successRate *= defenseModifier
    }

    successRate = Math.min(0.99, Math.max(0.01, successRate))

    const isSuccess = Math.random() < successRate
    const actionName = this.selectedAction.charAt(0).toUpperCase() + this.selectedAction.slice(1)

    if (this.narrative) {
      if (isSuccess) {
        this.narrative.addMessage(
          `✓ ${player.playerName} #${player.number} - ${actionName} successful! (${Math.round(successRate * 100)}%)`
        )

        if (this.selectedAction === 'pass') {
          this.performPass()
        } else if (this.selectedAction === 'shoot') {
          this.performShoot()
        } else if (this.selectedAction === 'dribble') {
          this.performDribble()
        } else if (this.selectedAction === 'juggle') {
          this.performJuggle()
        } else if (this.selectedAction === 'run') {
          this.performRun()
        }
      } else {
        this.narrative.addMessage(
          `✗ ${player.playerName} #${player.number} - ${actionName} failed! (${Math.round((1 - successRate) * 100)}% chance of failure)`
        )
        this.turnoverBall()
      }
    }

    this.time.delayedCall(2000, () => {
      this.gameState.gamePhase = 'menu'
      this.selectedAction = null
      this.gameState.aimingTimer = 0

      if (this.actionMenu) {
        this.actionMenu.hideAimingBar()
        this.actionMenu.reset()
      }

      if (this.autoPlay) {
        this.autoPlayNextAction()
      }
    })
  }

  private performPass() {
    if (!this.gameState.ballOwner) return

    const teammates = this.players.filter(
      (p) => p.team === this.gameState.ballOwner?.team && p !== this.gameState.ballOwner
    )

    if (teammates.length > 0) {
      const nearest = teammates.reduce((prev, curr) => {
        const prevDist = Phaser.Math.Distance.Between(
          this.gameState.ballOwner!.x,
          this.gameState.ballOwner!.y,
          prev.x,
          prev.y
        )
        const currDist = Phaser.Math.Distance.Between(
          this.gameState.ballOwner!.x,
          this.gameState.ballOwner!.y,
          curr.x,
          curr.y
        )
        return currDist < prevDist ? curr : prev
      })

      // Animate ball movement
      if (this.ball) {
        this.tweens.add({
          targets: this.ball,
          x: nearest.x,
          y: nearest.y - 15,
          duration: 800,
          ease: 'Linear',
        })
      }

      // Animate receiver moving towards ball
      nearest.moveTo(nearest.x, nearest.y)

      this.gameState.ballOwner = nearest
      if (this.narrative) {
        this.narrative.addMessage(`Ball passed to ${nearest.playerName} #${nearest.number}`)
      }
    }
  }

  private performShoot() {
    if (this.narrative) {
      this.narrative.addMessage('⚽ GOAL! The ball flies into the net!')
    }

    if (this.ball) {
      const goalX = this.gameState.ballOwner?.team === 'blue' ? this.fieldX + this.fieldWidth : this.fieldX
      this.tweens.add({
        targets: this.ball,
        x: goalX,
        y: this.fieldY + this.fieldHeight / 2,
        duration: 1000,
        ease: 'Linear',
      })
    }

    this.gameState.ballOwner = null

    this.time.delayedCall(3000, () => {
      this.gameState.ballOwner = this.players[4]
      if (this.ball) {
        this.ball.x = 500
        this.ball.y = 250
      }
      if (this.narrative) {
        this.narrative.addMessage('Ball reset to center. Match continues!')
      }
      if (this.autoPlay) {
        this.autoPlayNextAction()
      }
    })
  }

  private performDribble() {
    if (!this.gameState.ballOwner) return

    const direction = this.gameState.ballOwner.team === 'blue' ? 1 : -1
    this.gameState.ballOwner.moveTo(
      this.gameState.ballOwner.x + direction * 80,
      this.gameState.ballOwner.y
    )

    if (this.narrative) {
      this.narrative.addMessage(`${this.gameState.ballOwner.playerName} dribbles forward!`)
    }
  }

  private performJuggle() {
    if (this.narrative) {
      this.narrative.addMessage(`${this.gameState.ballOwner?.playerName} juggles the ball skillfully!`)
    }
  }

  private performRun() {
    if (!this.gameState.ballOwner) return

    const direction = this.gameState.ballOwner.team === 'blue' ? 1 : -1
    this.gameState.ballOwner.moveTo(
      this.gameState.ballOwner.x + direction * 120,
      this.gameState.ballOwner.y
    )

    if (this.narrative) {
      this.narrative.addMessage(`${this.gameState.ballOwner.playerName} makes a quick run!`)
    }
  }

  private turnoverBall() {
    if (!this.gameState.ballOwner) return

    const opponents = this.players.filter((p) => p.team !== this.gameState.ballOwner?.team)

    if (opponents.length > 0) {
      const nearest = opponents.reduce((prev, curr) => {
        const prevDist = Phaser.Math.Distance.Between(
          this.gameState.ballOwner!.x,
          this.gameState.ballOwner!.y,
          prev.x,
          prev.y
        )
        const currDist = Phaser.Math.Distance.Between(
          this.gameState.ballOwner!.x,
          this.gameState.ballOwner!.y,
          curr.x,
          curr.y
        )
        return currDist < prevDist ? curr : prev
      })

      this.gameState.ballOwner = nearest
      if (this.narrative) {
        this.narrative.addMessage(`Turnover! ${nearest.playerName} #${nearest.number} (Team ${nearest.team}) has the ball!`)
      }
    }
  }
}
