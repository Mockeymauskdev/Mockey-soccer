import Phaser from 'phaser'

export default class Ball extends Phaser.Physics.Arcade.Sprite {
  public isMoving: boolean = false
  public targetX: number
  public targetY: number
  public speed: number = 300

  constructor(scene: Phaser.Scene, x: number, y: number) {
    // Create a simple white circle sprite for the ball
    const graphics = scene.make.graphics({ x: 0, y: 0, add: false })
    graphics.fillStyle(0xffffff, 1)
    graphics.fillCircle(6, 6, 6)
    graphics.lineStyle(1, 0x000000, 1)
    graphics.strokeCircle(6, 6, 6)
    graphics.generateTexture('ball', 12, 12)
    graphics.destroy()

    super(scene, x, y, 'ball')

    scene.physics.add.existing(this)
    scene.add.existing(this)

    this.targetX = x
    this.targetY = y

    // Set physics properties
    this.setCollideWorldBounds(true)
    this.setBounce(0.8)
  }

  moveTo(targetX: number, targetY: number, speed?: number) {
    this.targetX = targetX
    this.targetY = targetY
    if (speed) this.speed = speed
    this.isMoving = true
  }

  update() {
    if (this.isMoving) {
      const distance = Phaser.Math.Distance.Between(
        this.x,
        this.y,
        this.targetX,
        this.targetY
      )

      if (distance > 10) {
        const angle = Phaser.Math.Angle.Between(
          this.x,
          this.y,
          this.targetX,
          this.targetY
        )
        this.setVelocity(
          Math.cos(angle) * this.speed,
          Math.sin(angle) * this.speed
        )
      } else {
        this.setVelocity(0, 0)
        this.isMoving = false
        this.x = this.targetX
        this.y = this.targetY
      }
    }
  }

  stopMoving() {
    this.isMoving = false
    this.setVelocity(0, 0)
  }
}
