import Phaser from 'phaser'
import SoccerPlayer from '../entities/SoccerPlayer'
import Ball from '../entities/Ball'
import { GridSystem } from '../systems/GridSystem'
import { ContestedBallSystem } from '../systems/ContestedBallSystem'
import type { ContestedBallEvent, ActionChoice } from '../systems/ContestedBallSystem'
import { TacticalAI, type Decision } from '../ai/TacticalAI'
import ActionMenu from '../ui/ActionMenu'
import MiniMap from '../ui/MiniMap'

export default class GameScene extends Phaser.Scene {
  private players: SoccerPlayer[] = []
  private ball: Ball | null = null
  private gridSystem: GridSystem | null = null
  private contestedBallSystem: ContestedBallSystem | null = null
  private tacticalAI: TacticalAI | null = null

  private fieldX: number = 50
  private fieldY: number = 100
  private fieldWidth: number = 1000
  private fieldHeight: number = 600

  private gameTime: number = 0
  private gamePhase: 'waiting' | 'vs_intro' | 'contested' | 'clash' | 'resolution' | 'slow_mo' | 'set_piece' = 'waiting'
  private ballOwner: SoccerPlayer | null = null
  private nearestDefender: SoccerPlayer | null = null
  private blueScore: number = 0
  private redScore: number = 0

  private currentContestedEvent: ContestedBallEvent | null = null
  private offensiveActionSelected: ActionChoice | null = null
  private defensiveActionSelected: ActionChoice | null = null
  private actionTimer: number = 0
  private actionTimeLimit: number = 3000
  private vsOverlay: Phaser.GameObjects.Container | null = null
  private clashOverlay: Phaser.GameObjects.Container | null = null

  private gameTimeText: Phaser.GameObjects.Text | null = null
  private scoreText: Phaser.GameObjects.Text | null = null
  private narrativeText: Phaser.GameObjects.Text | null = null
  private narrativeBg: Phaser.GameObjects.Graphics | null = null
  private offensiveMenu: ActionMenu | null = null
  private defensiveMenu: ActionMenu | null = null
  private miniMap: MiniMap | null = null
  private playerSprites: Map<SoccerPlayer, Phaser.GameObjects.Container> = new Map()
  private highlights: Phaser.GameObjects.Graphics | null = null
  private passArrow: Phaser.GameObjects.Graphics | null = null

  constructor() {
    super('GameScene')
  }

  create() {
    this.gridSystem = new GridSystem(this.fieldX, this.fieldY, this.fieldWidth, this.fieldHeight)
    this.contestedBallSystem = new ContestedBallSystem()
    this.tacticalAI = new TacticalAI(this.fieldWidth)

    this.drawField()
    this.createPlayers()
    this.players.forEach((player, index) => this.createPlayerSprite(player, index))
    
    this.ball = new Ball(this, 525, 400)
    this.ball.setDepth(15)
    
    this.highlights = this.add.graphics().setDepth(4)
    this.passArrow = this.add.graphics().setDepth(20)
    
    this.offensiveMenu = new ActionMenu(this, 20, 150)
    this.defensiveMenu = new ActionMenu(this, 920, 150)
    this.miniMap = new MiniMap(this, 800, 20, this.players, this.ball)

    this.createUI()
    this.createVSOverlay()
    this.createClashOverlay()
    this.cameras.main.setBounds(0, 0, 1100, 800)
  }

  private createVSOverlay() {
    this.vsOverlay = this.add.container(525, 400).setDepth(200).setScrollFactor(0).setVisible(false)
    const bg = this.add.graphics()
    bg.fillStyle(0x000000, 0.8).fillRect(-525, -100, 1050, 200)
    this.vsOverlay.add(bg)
    const vsText = this.add.text(0, 0, 'VS', { fontSize: '100px', color: '#ff0000', fontStyle: 'italic bold' }).setOrigin(0.5)
    this.vsOverlay.add(vsText)
  }

  private createClashOverlay() {
    this.clashOverlay = this.add.container(525, 400).setDepth(600).setScrollFactor(0).setVisible(false)
    const bg = this.add.graphics()
    bg.fillStyle(0x000000, 0.9).fillRect(-450, -200, 900, 400).lineStyle(4, 0xffffff, 1).strokeRect(-450, -200, 900, 400)
    this.clashOverlay.add(bg)
  }

  private createUI() {
    this.gameTimeText = this.add.text(20, 20, 'TIME: 0:00', { fontSize: '20px', color: '#fff', fontStyle: 'bold' }).setScrollFactor(0).setDepth(100)
    this.scoreText = this.add.text(400, 20, 'BLUE 0 - 0 RED', { fontSize: '28px', color: '#fff', fontStyle: 'bold' }).setScrollFactor(0).setDepth(100)
    this.narrativeBg = this.add.graphics().setScrollFactor(0).setDepth(100)
    this.narrativeBg.fillStyle(0x000000, 0.8).fillRect(0, 720, 1100, 80).lineStyle(2, 0xffffff, 1).strokeRect(0, 720, 1100, 80)
    this.narrativeText = this.add.text(550, 760, 'MATCH STARTED!', { fontSize: '22px', color: '#fff', fontStyle: 'bold', align: 'center', wordWrap: { width: 1000 } }).setOrigin(0.5).setScrollFactor(0).setDepth(101)
  }

  update(_time: number, delta: number) {
    let timeScale = 1.0
    if (this.gamePhase === 'vs_intro' || this.gamePhase === 'contested' || this.gamePhase === 'clash') timeScale = 0.05
    else if (this.gamePhase === 'resolution') timeScale = 0
    else if (this.gamePhase === 'slow_mo' || this.gamePhase === 'set_piece') timeScale = 0.2
    
    const actualDelta = delta * timeScale
    this.gameTime += actualDelta

    this.updatePlayerPositions(actualDelta)
    this.players.forEach((player) => this.updatePlayerSprite(player))
    this.updateHighlights()
    
    if (this.ball) {
        this.ball.update()
        if (this.ballOwner) {
            const targetX = this.ballOwner.x + (this.ballOwner.team === 'blue' ? 10 : -10)
            const targetY = this.ballOwner.y + 5
            this.ball.x += (targetX - this.ball.x) * 0.2
            this.ball.y += (targetY - this.ball.y) * 0.2
            
            if (this.gamePhase === 'waiting' && Math.random() < 0.015) {
                this.performFreeAction()
            }
        } else {
            this.checkBoundaries()
        }
    }

    if (this.gamePhase === 'waiting') this.checkContestedBall()
    else if (this.gamePhase === 'contested') this.handleContestedBall(delta)

    this.miniMap?.update()
    this.updateUI()
  }

  private performFreeAction() {
      if (!this.ballOwner) return
      const isNearGoal = this.ballOwner.team === 'blue' ? this.ballOwner.x > 750 : this.ballOwner.x < 350
      
      const label = this.add.text(this.ballOwner.x, this.ballOwner.y - 50, 'FREE ACTION!', { 
          fontSize: '24px', color: '#00ff00', fontStyle: 'bold italic', stroke: '#000', strokeThickness: 4 
      }).setOrigin(0.5).setDepth(100)
      this.tweens.add({ targets: label, y: label.y - 50, alpha: 0, duration: 1000, onComplete: () => label.destroy() })

      if (isNearGoal) {
          this.setNarrative(`${this.ballOwner.playerName} TAKES A LONG SHOT!`)
          if (this.ball) this.ball.setVelocity(this.ballOwner.team === 'blue' ? 700 : -700, (Math.random() - 0.5) * 300)
          this.ballOwner = null
      } else {
          const teammates = this.players.filter(p => p.team === this.ballOwner!.team && p !== this.ballOwner)
          const target = teammates[Math.floor(Math.random() * teammates.length)]
          this.setNarrative(`${this.ballOwner.playerName} PLAYS A FREE PASS!`)
          const line = this.add.graphics().setDepth(20)
          line.lineStyle(4, 0x00ff00, 0.6).lineBetween(this.ballOwner.x, this.ballOwner.y, target.x, target.y)
          this.time.delayedCall(500, () => line.destroy())
          this.ballOwner = target
      }
  }

  private checkBoundaries() {
    if (!this.ball || this.gamePhase !== 'waiting') return
    const isGoalArea = Math.abs(this.ball.y - 400) < 100
    if (this.ball.x < this.fieldX && isGoalArea) {
        this.redScore++; this.setNarrative("GOAL FOR RED TEAM!"); this.triggerSetPiece('kick_off'); return;
    }
    if (this.ball.x > this.fieldX + this.fieldWidth && isGoalArea) {
        this.blueScore++; this.setNarrative("GOAL FOR BLUE TEAM!"); this.triggerSetPiece('kick_off'); return;
    }
    if (this.ball.x < this.fieldX || this.ball.x > this.fieldX + this.fieldWidth || 
        this.ball.y < this.fieldY || this.ball.y > this.fieldY + this.fieldHeight) {
        if (this.ball.y < this.fieldY || this.ball.y > this.fieldY + this.fieldHeight) {
            this.setNarrative("THROW IN!"); this.triggerSetPiece('throw_in')
        } else {
            this.setNarrative("CORNER KICK!"); this.triggerSetPiece('corner')
        }
    }
  }

  private triggerSetPiece(type: string) {
    this.gamePhase = 'set_piece'
    this.ball?.setVelocity(0, 0)
    
    this.time.delayedCall(1500, () => {
        if (type === 'kick_off') { 
            this.resetBall(); 
            this.gamePhase = 'waiting'; 
        } else {
            const offTeam = this.ball!.x < 525 ? 'red' : 'blue'
            const defTeam = offTeam === 'blue' ? 'red' : 'blue'
            this.setupSetPieceFormation(type as 'throw_in' | 'corner', offTeam)
            const taker = this.players.find(p => p.team === offTeam && p.role !== 'GK') || this.players[0]
            const defender = this.players.find(p => p.team === defTeam && p.role === 'DEF') || this.players[1]
            this.ballOwner = taker
            this.ball!.x = taker.x
            this.ball!.y = taker.y
            this.startVSIntro(taker, defender, 50, type as 'throw_in' | 'corner')
        }
    })
  }

  private setupSetPieceFormation(type: 'throw_in' | 'corner', offTeam: 'blue' | 'red') {
      const ballX = this.ball!.x
      const ballY = this.ball!.y
      const defTeam = offTeam === 'blue' ? 'red' : 'blue'
      if (type === 'throw_in') {
          const taker = this.players.find(p => p.team === offTeam && p.role !== 'GK')!
          taker.x = ballX; taker.y = ballY
          const teammates = this.players.filter(p => p.team === offTeam && p !== taker && p.role !== 'GK')
          teammates.forEach((p, i) => { p.x = ballX + (offTeam === 'blue' ? 100 : -100); p.y = ballY + (i * 60 - 120) })
          const defenders = this.players.filter(p => p.team === defTeam && p.role !== 'GK')
          defenders.forEach((p, i) => { p.x = ballX + (offTeam === 'blue' ? 140 : -140); p.y = ballY + (i * 60 - 120) })
      } else if (type === 'corner') {
          const taker = this.players.find(p => p.team === offTeam && p.role !== 'GK')!
          taker.x = ballX; taker.y = ballY
          const targetX = offTeam === 'blue' ? 900 : 150
          const targetY = 400
          const attackers = this.players.filter(p => p.team === offTeam && p !== taker && p.role !== 'GK')
          attackers.forEach((p, i) => { p.x = targetX + (Math.random() - 0.5) * 100; p.y = targetY + (i * 40 - 160) })
          const defenders = this.players.filter(p => p.team === defTeam && p.role !== 'GK')
          defenders.forEach((p, i) => { p.x = targetX + (offTeam === 'blue' ? -30 : 30) + (Math.random() - 0.5) * 50; p.y = targetY + (i * 40 - 160) })
      }
  }

  private updatePlayerPositions(delta: number) {
    this.players.forEach((player) => {
      if (this.gamePhase !== 'waiting' && this.gamePhase !== 'slow_mo' && (player === this.ballOwner || player === this.nearestDefender)) return
      const ballX = this.ball?.x || 525; const ballY = this.ball?.y || 400
      if (player.role === 'GK') {
          const goalX = player.team === 'blue' ? 70 : 980
          const targetY = Phaser.Math.Clamp(ballY, 320, 480)
          player.x += (goalX - player.x) * 0.05 * delta; player.y += (targetY - player.y) * 0.05 * delta
          return
      }
      if (this.ballOwner && this.ballOwner.role === 'GK' && player.team !== this.ballOwner.team) {
          const penaltyAreaX = this.ballOwner.team === 'blue' ? 250 : 800
          const isInside = this.ballOwner.team === 'blue' ? player.x < penaltyAreaX : player.x > penaltyAreaX
          if (isInside) {
              const retreatX = this.ballOwner.team === 'blue' ? penaltyAreaX + 50 : penaltyAreaX - 50
              player.x += (retreatX - player.x) * 0.05 * delta
              return
          }
      }
      if (player === this.ballOwner) {
        const goalX = player.team === 'blue' ? 1000 : 50
        const angle = Math.atan2(400 - player.y, goalX - player.x)
        player.x += Math.cos(angle) * 0.06 * delta; player.y += Math.sin(angle) * 0.06 * delta
      } else {
          let targetX, targetY
          const isAttacking = (this.ballOwner && this.ballOwner.team === player.team)
          if (isAttacking) {
              targetX = player.team === 'blue' ? (ballX + 150) : (ballX - 150)
              targetY = ballY + (player.number % 2 === 0 ? 100 : -100)
          } else {
              const goalX = player.team === 'blue' ? 100 : 1000
              targetX = (ballX + goalX) / 2; targetY = (ballY + player.y) / 2
          }
          const angle = Math.atan2(targetY - player.y, targetX - player.x)
          player.x += Math.cos(angle) * 0.04 * delta; player.y += Math.sin(angle) * 0.04 * delta
      }
    })
  }

  private updateHighlights() {
    this.highlights?.clear(); this.passArrow?.clear()
    if (this.ballOwner) { 
        this.highlights?.lineStyle(3, 0xffff00, 1).strokeCircle(this.ballOwner.x, this.ballOwner.y, 25) 
        if (this.offensiveActionSelected?.name.includes('Pass') || this.offensiveActionSelected?.name.includes('Throw') || this.offensiveActionSelected?.name.includes('Post')) {
            const teammates = this.players.filter(p => p.team === this.ballOwner!.team && p !== this.ballOwner)
            const target = teammates[0]; this.passArrow?.lineStyle(4, 0x00ff00, 0.8).lineBetween(this.ballOwner.x, this.ballOwner.y, target.x, target.y)
            const angle = Math.atan2(target.y - this.ballOwner.y, target.x - this.ballOwner.x)
            this.passArrow?.lineBetween(target.x, target.y, target.x - 20 * Math.cos(angle - 0.5), target.y - 20 * Math.sin(angle - 0.5))
            this.passArrow?.lineBetween(target.x, target.y, target.x - 20 * Math.cos(angle + 0.5), target.y - 20 * Math.sin(angle + 0.5))
        }
    }
    if (this.nearestDefender) { this.highlights?.lineStyle(3, 0xff0000, 1).strokeCircle(this.nearestDefender.x, this.nearestDefender.y, 25) }
  }

  private checkContestedBall() {
    if (!this.ballOwner || this.gamePhase !== 'waiting') return
    const penaltyAreaX = this.ballOwner.team === 'blue' ? 250 : 800
    const isGKInBox = this.ballOwner.role === 'GK' && (this.ballOwner.team === 'blue' ? this.ballOwner.x < penaltyAreaX : this.ballOwner.x > penaltyAreaX)
    if (isGKInBox) return
    const opponents = this.players.filter((p) => p.team !== this.ballOwner!.team)
    let nearest: SoccerPlayer | null = null; let minDistance = Infinity
    opponents.forEach((opponent) => {
      const dist = Phaser.Math.Distance.Between(opponent.x, opponent.y, this.ballOwner!.x, this.ballOwner!.y)
      if (dist < minDistance) { minDistance = dist; nearest = opponent; }
    })
    if (nearest && minDistance < 60) this.startVSIntro(this.ballOwner!, nearest, minDistance)
  }

  private startVSIntro(attacker: SoccerPlayer, defender: SoccerPlayer, distance: number, setPieceType?: 'throw_in' | 'corner') {
    this.gamePhase = 'vs_intro'
    this.nearestDefender = defender
    this.currentContestedEvent = this.contestedBallSystem!.createContestedBallEvent(attacker, defender, distance, setPieceType)
    const title = setPieceType ? setPieceType.replace('_', ' ').toUpperCase() : 'DUEL'
    this.setNarrative(`${title}: ${attacker.playerName} (#${attacker.number}) VS ${defender.playerName} (#${defender.number})!`)
    this.vsOverlay?.setVisible(true).setScale(0)
    this.tweens.add({ targets: this.vsOverlay, scale: 1, duration: 400, ease: 'Back.easeOut', onComplete: () => { this.time.delayedCall(800, () => { this.vsOverlay?.setVisible(false); this.startDuel(); }) } })
  }

  private startDuel() {
    this.gamePhase = 'contested'
    const offTeam = this.ballOwner!.team as 'blue' | 'red'
    const defTeam = this.nearestDefender!.team as 'blue' | 'red'
    this.offensiveMenu?.setTheme(offTeam)
    this.defensiveMenu?.setTheme(defTeam)
    if (offTeam === 'blue') {
        this.offensiveMenu?.setActions(this.currentContestedEvent!.offensiveActions.map(a => a.name), `BLUE OFF: #${this.ballOwner!.number}`)
        this.defensiveMenu?.setActions(this.currentContestedEvent!.defensiveActions.map(a => a.name), `RED DEF: #${this.nearestDefender!.number}`)
    } else {
        this.offensiveMenu?.setActions(this.currentContestedEvent!.offensiveActions.map(a => a.name), `RED OFF: #${this.ballOwner!.number}`)
        this.defensiveMenu?.setActions(this.currentContestedEvent!.defensiveActions.map(a => a.name), `BLUE DEF: #${this.nearestDefender!.number}`)
    }
    this.offensiveMenu?.setVisible(true); this.defensiveMenu?.setVisible(true)
    this.actionTimer = 0
  }

  private handleContestedBall(delta: number) {
    this.actionTimer += delta
    const progress = Math.min(this.actionTimer / this.actionTimeLimit, 1)
    this.offensiveMenu?.setAimingProgress(progress); this.defensiveMenu?.setAimingProgress(progress)
    if (!this.offensiveActionSelected && this.actionTimer > 800) {
        const actions = this.currentContestedEvent!.offensiveActions
        this.offensiveActionSelected = actions[Math.floor(Math.random() * actions.length)]
        this.offensiveMenu?.setCurrentAction(this.offensiveActionSelected.name)
    }
    if (!this.defensiveActionSelected && this.actionTimer > 1200) {
        const actions = this.currentContestedEvent!.defensiveActions
        this.defensiveActionSelected = actions[Math.floor(Math.random() * actions.length)]
        this.defensiveMenu?.setCurrentAction(this.defensiveActionSelected.name)
    }
    if (this.actionTimer >= this.actionTimeLimit) this.showClash()
  }

  private showClash() {
    this.gamePhase = 'clash'
    this.clashOverlay?.removeAll(true); this.createClashOverlay(); this.clashOverlay?.setVisible(true)
    const offRate = this.contestedBallSystem!.calculateDynamicSuccess(this.offensiveActionSelected!, true, this.ballOwner!, this.nearestDefender!, this.players)
    const defRate = this.contestedBallSystem!.calculateDynamicSuccess(this.defensiveActionSelected!, false, this.nearestDefender!, this.ballOwner!, this.players)
    const offColor = this.ballOwner!.team === 'blue' ? '#00ffff' : '#ff6666'
    const defColor = this.nearestDefender!.team === 'blue' ? '#00ffff' : '#ff6666'
    const offTitle = this.add.text(-220, -140, `PLAYER #${this.ballOwner!.number} (${this.ballOwner!.role})`, { fontSize: '20px', color: offColor, fontStyle: 'bold' }).setOrigin(0.5)
    const offAction = this.add.text(-220, -80, this.offensiveActionSelected!.name.toUpperCase(), { fontSize: '36px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5)
    const offChance = this.add.text(-220, -20, `${Math.round(offRate*100)}% SUCCESS`, { fontSize: '28px', color: offColor, fontStyle: 'bold' }).setOrigin(0.5)
    const vsText = this.add.text(0, -50, 'VS', { fontSize: '60px', color: '#ff0000', fontStyle: 'bold italic' }).setOrigin(0.5)
    const defTitle = this.add.text(220, -140, `PLAYER #${this.nearestDefender!.number} (${this.nearestDefender!.role})`, { fontSize: '20px', color: defColor, fontStyle: 'bold' }).setOrigin(0.5)
    const defAction = this.add.text(220, -80, this.defensiveActionSelected!.name.toUpperCase(), { fontSize: '36px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5)
    const defChance = this.add.text(220, -20, `${Math.round(defRate*100)}% BLOCK`, { fontSize: '28px', color: defColor, fontStyle: 'bold' }).setOrigin(0.5)
    const factors = this.add.text(0, 80, `FACTORS: POSITIONING | NEARBY SUPPORT | ROLE BONUS`, { fontSize: '18px', color: '#ffff00', fontStyle: 'bold' }).setOrigin(0.5)
    this.clashOverlay?.add([offTitle, offAction, offChance, vsText, defTitle, defAction, defChance, factors])
    this.setNarrative(`${this.ballOwner!.playerName} USES ${this.offensiveActionSelected!.name}!`)
    this.time.delayedCall(2500, () => { this.resolveDuel(offRate, defRate); })
  }

  private resolveDuel(offRate: number, defRate: number) {
    this.gamePhase = 'resolution'
    const result = this.contestedBallSystem!.resolveAction(this.offensiveActionSelected!, this.defensiveActionSelected!, offRate, defRate)
    let outcomeType: 'success' | 'fail' | 'loose' = result.success ? 'success' : (Math.random() > 0.3 ? 'fail' : 'loose')
    
    // Detailed Result Message
    let resultMsg = ''
    let resultColor = '#ffffff'
    if (outcomeType === 'success') {
        resultMsg = `PLAYER #${this.ballOwner!.number} (${this.ballOwner!.team.toUpperCase()}) WINS WITH ${this.offensiveActionSelected!.name.toUpperCase()}!`
        resultColor = '#00ff00'
    } else if (outcomeType === 'fail') {
        resultMsg = `PLAYER #${this.nearestDefender!.number} (${this.nearestDefender!.team.toUpperCase()}) BLOCKS WITH ${this.defensiveActionSelected!.name.toUpperCase()}!`
        resultColor = '#ff0000'
    } else {
        resultMsg = `THE BALL GOES FLYING AFTER A HEAVY CLASH!`
        resultColor = '#ffff00'
    }

    const resLabel = this.add.text(0, 150, resultMsg, { 
        fontSize: '24px', 
        color: resultColor, 
        fontStyle: 'bold italic', 
        stroke: '#000', 
        strokeThickness: 4,
        align: 'center',
        wordWrap: { width: 800 }
    }).setOrigin(0.5)
    
    this.clashOverlay?.add(resLabel)
    this.offensiveMenu?.setVisible(false); this.defensiveMenu?.setVisible(false)
    
    this.time.delayedCall(5000, () => {
        this.clashOverlay?.setVisible(false); this.gamePhase = 'slow_mo'
        if (outcomeType === 'success') {
            this.setNarrative(`${this.ballOwner!.playerName} WINS THE CLASH!`)
            const direction = this.ballOwner!.team === 'blue' ? 1 : -1
            this.ballOwner!.x += direction * 150
        } else if (outcomeType === 'fail') {
            this.setNarrative(`${this.nearestDefender!.playerName} STEALS THE BALL!`)
            this.ballOwner = this.nearestDefender
        } else {
            this.setNarrative("THE BALL GOES FLYING!"); this.ballOwner = null
            if (this.ball) this.ball.setVelocity((Math.random() - 0.5) * 800, (Math.random() - 0.5) * 800)
        }
        this.time.delayedCall(2000, () => {
            this.gamePhase = 'waiting'
            if (!this.ballOwner && this.ball) {
                let closest: SoccerPlayer | null = null; let minDist = Infinity
                this.players.forEach(p => { const d = Phaser.Math.Distance.Between(p.x, p.y, this.ball!.x, this.ball!.y); if (d < minDist) { minDist = d; closest = p; } })
                if (closest && minDist < 50) this.ballOwner = closest
            }
            this.nearestDefender = null; this.offensiveActionSelected = null; this.defensiveActionSelected = null
        })
    })
  }

  private setNarrative(text: string) { this.narrativeText?.setText(text.toUpperCase()) }

  private createPlayers() {
    const roles = ['GK', 'DEF', 'DEF', 'DEF', 'DEF', 'MID', 'MID', 'MID', 'FWD', 'FWD', 'FWD']
    const formation = [ { x: 100, y: 400 }, { x: 250, y: 200 }, { x: 250, y: 330 }, { x: 250, y: 470 }, { x: 250, y: 600 }, { x: 450, y: 250 }, { x: 450, y: 400 }, { x: 450, y: 550 }, { x: 700, y: 200 }, { x: 700, y: 400 }, { x: 700, y: 600 } ]
    for(let i=0; i<11; i++) {
        this.players.push(new SoccerPlayer(this, formation[i].x, formation[i].y, 'blue', roles[i], i+1))
        this.players.push(new SoccerPlayer(this, 1100 - formation[i].x, formation[i].y, 'red', roles[i], i+1))
    }
    this.ballOwner = this.players.find(p => p.team === 'blue' && p.role === 'MID') || this.players[0]
  }

  private createPlayerSprite(player: SoccerPlayer, index: number) {
    const container = this.add.container(player.x, player.y)
    const graphics = this.add.graphics()
    graphics.fillStyle(player.team === 'blue' ? 0x0066ff : 0xff0000, 1).fillCircle(0, 0, 15).lineStyle(2, 0xffffff, 1).strokeCircle(0, 0, 15)
    container.add(graphics)
    const text = this.add.text(0, 0, player.number.toString(), { fontSize: '12px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5)
    container.add(text)
    const roleLabel = this.add.text(0, 22, player.role, { fontSize: '10px', color: '#ffff00', fontStyle: 'bold' }).setOrigin(0.5)
    container.add(roleLabel)
    this.playerSprites.set(player, container)
  }

  private updatePlayerSprite(player: SoccerPlayer) {
    const sprite = this.playerSprites.get(player)
    if (sprite) {
      sprite.setPosition(player.x, player.y)
      sprite.setScale(player === this.ballOwner ? 1.3 : 1.0)
      sprite.setDepth(player === this.ballOwner ? 10 : 5)
    }
  }

  private drawField() {
    const g = this.add.graphics()
    g.fillStyle(0x2d5a27, 1).fillRect(0, 0, 1100, 800).lineStyle(4, 0xffffff).strokeRect(this.fieldX, this.fieldY, this.fieldWidth, this.fieldHeight).lineBetween(525, 100, 525, 700).strokeCircle(525, 400, 60)
    g.strokeRect(this.fieldX - 20, 300, 20, 200).strokeRect(this.fieldX + this.fieldWidth, 300, 20, 200)
    g.lineStyle(2, 0xffffff, 0.5).strokeRect(this.fieldX, 250, 200, 300).strokeRect(this.fieldX + this.fieldWidth - 200, 250, 200, 300)
  }

  private updateUI() {
    const mins = Math.floor(this.gameTime / 60000); const secs = Math.floor((this.gameTime % 60000) / 1000)
    this.gameTimeText?.setText(`TIME: ${mins}:${secs.toString().padStart(2, '0')}`)
    this.scoreText?.setText(`BLUE ${this.blueScore} - ${this.redScore} RED`)
  }

  private resetBall() {
      this.players.forEach((p, i) => {
          const baseIdx = i % 11
          const formation = [ { x: 100, y: 400 }, { x: 250, y: 200 }, { x: 250, y: 330 }, { x: 250, y: 470 }, { x: 250, y: 600 }, { x: 450, y: 250 }, { x: 450, y: 400 }, { x: 450, y: 550 }, { x: 700, y: 200 }, { x: 700, y: 400 }, { x: 700, y: 600 } ]
          const pos = formation[baseIdx]
          p.x = p.team === 'blue' ? pos.x : 1100 - pos.x; p.y = pos.y
      })
      this.ballOwner = this.players.find(p => p.team === (Math.random() > 0.5 ? 'blue' : 'red') && p.role === 'MID') || this.players[0]
      if (this.ball) { this.ball.x = 525; this.ball.y = 400; this.ball.setVelocity(0, 0); }
  }
}
