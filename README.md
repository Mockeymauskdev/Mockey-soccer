# ⚽ Soccer RPG Game

A turn-based soccer RPG built with **Phaser 3** where AI players make strategic decisions, execute actions with aiming mechanics, and the narrative unfolds in real-time.

![Soccer RPG Game](https://img.shields.io/badge/Built%20with-Phaser%203-blue)
![Status](https://img.shields.io/badge/Status-Production%20Ready-green)

---

## 🎮 Game Features

### Core Gameplay
- **Auto-Playing AI** - Watch AI players make decisions automatically
- **Turn-Based Actions** - Pass, Shoot, Dribble, Juggle, Run
- **Aiming Mechanic** - 3-second timing window to improve accuracy
- **Success Probability** - Actions succeed/fail based on aiming accuracy and action type
- **Ball Possession** - Track which player has the ball
- **Turnovers** - Failed actions result in possession change

### Visual Features
- **Soccer Field** - Realistic field layout with goal boxes
- **10 Players** - 5v5 team setup (5 blue vs 5 red)
- **Real-Time Mini-Map** - Shows all player positions
- **Player Highlighting** - Yellow circle highlights who has the ball
- **Trajectory Arrows** - Yellow arrows show action direction
- **Success Percentage** - Displays success chance for each action
- **Action Indicators** - Menu highlights current action being performed

### UI/UX
- **Timer Display** - Shows elapsed time
- **Ball Owner Info** - Displays player name, number, and team
- **Action Menu** - JRPG-style menu with 5 actions
- **Live Commentary** - Narrative updates with match events
- **Aiming Bar** - Visual feedback during aiming phase

---

## 🕹️ How to Play

### Controls
- **↑/↓ Arrow Keys** - Navigate menu
- **Space** - Select action / Start aiming
- **Esc** - Cancel aiming

### Gameplay Loop
1. AI selects a random action (Pass, Shoot, Dribble, Juggle, Run)
2. Aiming bar appears for 3 seconds
3. Action resolves based on aiming accuracy
4. Narrative updates with result
5. Ball transfers or turnover occurs
6. Next player's turn begins

### Success Rates (Base)
- **Pass** - 75% success
- **Shoot** - 50% success
- **Dribble** - 60% success
- **Juggle** - 40% success
- **Run** - 90% success

*Actual success = Base Rate × (0.5 + Aiming Accuracy)*

---

## 🚀 Quick Start

### Local Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Open http://localhost:5173
```

### Production Build

```bash
# Build for production
npm run build

# Serve dist folder
cd dist
python3 -m http.server 8000
```

---

## 📦 Project Structure

```
soccer-rpg-game/
├── src/
│   ├── entities/
│   │   ├── SoccerPlayer.ts    # Player sprite with movement
│   │   └── Ball.ts             # Ball sprite with physics
│   ├── ui/
│   │   ├── ActionMenu.ts       # JRPG-style action menu
│   │   ├── MiniMap.ts          # Real-time mini-map
│   │   └── Narrative.ts        # Match commentary
│   ├── scenes/
│   │   └── GameScene.ts        # Main game logic
│   ├── App.tsx                 # React wrapper
│   └── main.tsx                # Entry point
├── dist/                       # Production build
├── index.html                  # HTML template
├── package.json                # Dependencies
└── tsconfig.json              # TypeScript config
```

---

## 🛠️ Technology Stack

- **Phaser 3** - Game engine
- **React** - UI wrapper
- **TypeScript** - Type safety
- **Vite** - Build tool
- **TailwindCSS** - Styling

---

## 📱 Deployment

### **Easiest: Netlify (Recommended)**

1. Push to GitHub
2. Connect to Netlify
3. Done! Automatic deployments on every push

See **[QUICK_DEPLOY.md](./QUICK_DEPLOY.md)** for step-by-step instructions.

### Other Options
- **Vercel** - Similar to Netlify
- **GitHub Pages** - Free, GitHub-hosted
- **Traditional Hosting** - FTP/SSH upload

See **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** for detailed instructions.

---

## 🎯 Game Mechanics

### Action Resolution

```
Success Rate = Base Rate × (0.5 + Aiming Accuracy)

Example:
- Pass (75% base)
- Aiming accuracy: 80%
- Final success: 75% × (0.5 + 0.8) = 75% × 1.3 = 97.5%
```

### Ball Possession
- Ball owner is highlighted with yellow circle
- Player name and number displayed above
- Mini-map shows real-time position
- Ball follows player on field

### Turnovers
- Failed actions result in turnover
- Nearest opponent gains possession
- Narrative announces turnover

---

## 🔧 Customization

### Change Success Rates

Edit `src/scenes/GameScene.ts`:

```typescript
const baseSuccessRate: Record<string, number> = {
  pass: 0.75,      // Change these values
  shoot: 0.5,
  dribble: 0.6,
  juggle: 0.4,
  run: 0.9,
}
```

### Change Team Colors

Edit `src/entities/SoccerPlayer.ts`:

```typescript
const color = team === 'blue' ? 0x0066ff : 0xff0000
// Change 0x0066ff for blue, 0xff0000 for red
```

### Change Field Dimensions

Edit `src/scenes/GameScene.ts`:

```typescript
private fieldX: number = 50
private fieldY: number = 100
private fieldWidth: number = 1000
private fieldHeight: number = 600
```

---

## 📊 Game Statistics

- **Players:** 10 (5v5)
- **Actions:** 5 types
- **Field Size:** 1000×600 pixels
- **Aiming Duration:** 3 seconds
- **Action Resolution:** 2 seconds

---

## 🐛 Known Issues

- None currently! Report issues on GitHub.

---

## 🤝 Contributing

Want to improve the game? Fork it and submit a pull request!

Ideas for improvements:
- Player stats and attributes
- Multiple match scenarios
- Replay system
- Sound effects
- Animation improvements
- Mobile responsive design

---

## 📄 License

MIT License - Feel free to use this for personal or commercial projects.

---

## 🙏 Credits

- Built with **Phaser 3**
- Inspired by JRPG turn-based systems
- Soccer strategy mechanics

---

## 📞 Support

- **Documentation:** See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
- **Quick Deploy:** See [QUICK_DEPLOY.md](./QUICK_DEPLOY.md)
- **Issues:** Report on GitHub

---

**Ready to deploy? See [QUICK_DEPLOY.md](./QUICK_DEPLOY.md) for 5-minute deployment! 🚀**
