import Phaser from 'phaser'

export default class ActionMenu {
  private scene: Phaser.Scene
  private container: Phaser.GameObjects.Container
  private bg: Phaser.GameObjects.Graphics
  private titleText: Phaser.GameObjects.Text
  private actionTexts: Phaser.GameObjects.Text[] = []
  private aimingBar: Phaser.GameObjects.Graphics
  private currentActionIndex: number = -1
  private themeColor: number = 0x0066ff // Default Blue

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene
    this.container = scene.add.container(x, y).setScrollFactor(0).setDepth(1000).setVisible(false)
    
    this.bg = scene.add.graphics()
    this.container.add(this.bg)

    this.titleText = scene.add.text(10, 10, 'ACTIONS', { 
      fontSize: '18px', 
      color: '#ffffff', 
      fontStyle: 'bold',
      backgroundColor: '#000000'
    })
    this.container.add(this.titleText)

    this.aimingBar = scene.add.graphics()
    this.container.add(this.aimingBar)
  }

  setTheme(team: 'blue' | 'red') {
    this.themeColor = team === 'blue' ? 0x0066ff : 0xff0000
    this.drawBackground()
  }

  private drawBackground() {
    this.bg.clear()
    this.bg.fillStyle(0x000000, 0.8)
    this.bg.fillRect(0, 0, 160, 250)
    this.bg.lineStyle(3, this.themeColor, 1)
    this.bg.strokeRect(0, 0, 160, 250)
  }

  setActions(actions: string[], title: string) {
    this.titleText.setText(title.toUpperCase())
    this.actionTexts.forEach(t => t.destroy())
    this.actionTexts = []

    actions.forEach((action, i) => {
      const text = this.scene.add.text(15, 45 + (i * 35), action, { 
        fontSize: '16px', 
        color: '#cccccc' 
      })
      this.container.add(text)
      this.actionTexts.push(text)
    })
    this.currentActionIndex = -1
    this.drawBackground()
  }

  setCurrentAction(actionName: string) {
    this.actionTexts.forEach((t, i) => {
      if (t.text === actionName) {
        t.setColor('#ffffff').setFontStyle('bold')
        this.currentActionIndex = i
        // Highlight current action with theme color
        this.bg.lineStyle(2, this.themeColor, 1)
        this.bg.strokeRect(10, 40 + (i * 35), 140, 30)
      } else {
        t.setColor('#cccccc').setFontStyle('normal')
      }
    })
  }

  setAimingProgress(progress: number) {
    this.aimingBar.clear()
    this.aimingBar.fillStyle(this.themeColor, 1)
    this.aimingBar.fillRect(10, 230, 140 * progress, 10)
    this.aimingBar.lineStyle(1, 0xffffff, 1)
    this.aimingBar.strokeRect(10, 230, 140, 10)
  }

  setVisible(visible: boolean) {
    this.container.setVisible(visible)
  }
}
