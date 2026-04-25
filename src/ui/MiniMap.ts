import Phaser from 'phaser'
import SoccerPlayer from '../entities/SoccerPlayer'
import Ball from '../entities/Ball'

export default class MiniMap {
  private scene: Phaser.Scene
  private container: Phaser.GameObjects.Container
  private bg: Phaser.GameObjects.Graphics
  private playerDots: Map<SoccerPlayer, { dot: Phaser.GameObjects.Graphics, text: Phaser.GameObjects.Text }> = new Map()
  private ballDot: Phaser.GameObjects.Graphics
  private players: SoccerPlayer[]
  private ball: Ball | null
  
  private width: number = 200
  private height: number = 120
  private scaleX: number
  private scaleY: number

  constructor(scene: Phaser.Scene, x: number, y: number, players: SoccerPlayer[], ball: Ball | null) {
    this.scene = scene
    this.players = players
    this.ball = ball
    this.scaleX = this.width / 1100
    this.scaleY = this.height / 800

    this.container = scene.add.container(x, y).setScrollFactor(0).setDepth(1000)
    
    this.bg = scene.add.graphics()
    this.bg.fillStyle(0x000000, 0.5)
    this.bg.fillRect(0, 0, this.width, this.height)
    this.bg.lineStyle(2, 0xffffff, 1)
    this.bg.strokeRect(0, 0, this.width, this.height)
    this.container.add(this.bg)

    this.players.forEach(player => {
      const dot = scene.add.graphics()
      const color = player.team === 'blue' ? 0x0066ff : 0xff0000
      dot.fillStyle(color, 1)
      dot.fillCircle(0, 0, 4)
      
      const text = scene.add.text(0, 0, player.number.toString(), { 
        fontSize: '8px', 
        color: '#ffffff', 
        fontStyle: 'bold' 
      }).setOrigin(0.5)
      
      this.container.add(dot)
      this.container.add(text)
      this.playerDots.set(player, { dot, text })
    })

    this.ballDot = scene.add.graphics()
    this.ballDot.fillStyle(0xffffff, 1)
    this.ballDot.fillCircle(0, 0, 3)
    this.container.add(this.ballDot)
  }

  update() {
    this.playerDots.forEach((objs, player) => {
      const px = player.x * this.scaleX
      const py = player.y * this.scaleY
      objs.dot.setPosition(px, py)
      objs.text.setPosition(px, py)
    })

    if (this.ball) {
      this.ballDot.setPosition(this.ball.x * this.scaleX, this.ball.y * this.scaleY)
    }
  }

  setVisible(visible: boolean) {
    this.container.setVisible(visible)
  }
}
