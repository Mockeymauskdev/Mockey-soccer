import Phaser from 'phaser'

export default class Narrative {
  private scene: Phaser.Scene
  private x: number
  private y: number
  private messages: string[] = []
  private maxMessages: number = 3
  private textObjects: Phaser.GameObjects.Text[] = []
  private graphics: Phaser.GameObjects.Graphics

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene
    this.x = x
    this.y = y

    this.graphics = scene.add.graphics()

    // Create text objects for messages
    for (let i = 0; i < this.maxMessages; i++) {
      const text = scene.add.text(x + 10, y - 20 - (this.maxMessages - i) * 25, '', {
        fontSize: '14px',
        color: '#ffffff',
        fontFamily: 'Arial',
        wordWrap: { width: 900 },
      })
      this.textObjects.push(text)
    }

    this.draw()
  }

  addMessage(message: string) {
    // Add to beginning of array
    this.messages.unshift(message)

    // Keep only the last maxMessages
    if (this.messages.length > this.maxMessages) {
      this.messages.pop()
    }

    this.updateDisplay()
  }

  private updateDisplay() {
    this.messages.forEach((message, index) => {
      if (this.textObjects[index]) {
        this.textObjects[index].setText(message)
      }
    })
  }

  private draw() {
    this.graphics.clear()

    // Draw narrative background
    this.graphics.fillStyle(0x000000, 0.7)
    this.graphics.fillRect(this.x, this.y - 100, 950, 90)

    // Draw border
    this.graphics.lineStyle(2, 0x00ff00, 1)
    this.graphics.strokeRect(this.x, this.y - 100, 950, 90)

    // Add title
    this.scene.add.text(this.x + 10, this.y - 95, 'Match Commentary', {
      fontSize: '12px',
      color: '#00ff00',
      fontFamily: 'Arial',
    })
  }
}
