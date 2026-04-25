import SoccerPlayer from '../entities/SoccerPlayer'

export interface ActionChoice {
  name: string
  description: string
  baseSuccessRate: number
  icon: string
}

export interface ContestedBallEvent {
  ballHolderTeam: 'blue' | 'red'
  ballHolder: SoccerPlayer
  defender: SoccerPlayer
  distance: number
  timeLimit: number
  offensiveActions: ActionChoice[]
  defensiveActions: ActionChoice[]
  isGKEvent: boolean
  isSetPiece?: 'throw_in' | 'corner' | 'goal_kick'
}

export class ContestedBallSystem {
  createContestedBallEvent(
    ballHolder: SoccerPlayer,
    defender: SoccerPlayer,
    distance: number,
    setPieceType?: 'throw_in' | 'corner' | 'goal_kick'
  ): ContestedBallEvent {
    const isGKEvent = defender.role === 'GK' && !setPieceType
    const timeLimit = 3000

    let offensiveActions: ActionChoice[] = [
      { name: 'Dribble', description: 'Evade defender', baseSuccessRate: 0.65, icon: '◆' },
      { name: 'Pass', description: 'Short pass', baseSuccessRate: 0.8, icon: '→' },
      { name: 'Shoot', description: 'Power shot', baseSuccessRate: 0.5, icon: '⚽' },
      { name: 'Through Ball', description: 'Pass into space', baseSuccessRate: 0.6, icon: '↗' },
      { name: 'Chip Shot', description: 'Lob over GK', baseSuccessRate: 0.4, icon: '⬆' },
    ]

    let defensiveActions: ActionChoice[] = [
      { name: 'Tackle', description: 'Win ball', baseSuccessRate: 0.6, icon: '✕' },
      { name: 'Press', description: 'Pressure', baseSuccessRate: 0.7, icon: '⊕' },
      { name: 'Block', description: 'Block lanes', baseSuccessRate: 0.65, icon: '■' },
      { name: 'Jockey', description: 'Contain', baseSuccessRate: 0.55, icon: '◇' },
      { name: 'Intercept', description: 'Read pass', baseSuccessRate: 0.5, icon: '↙' },
    ]

    if (isGKEvent) {
        offensiveActions = [
            { name: 'Power Shot', description: 'Blast it past GK', baseSuccessRate: 0.45, icon: '🔥' },
            { name: 'Placement', description: 'Aim for the corner', baseSuccessRate: 0.6, icon: '🎯' },
            { name: 'Chip Shot', description: 'Lob the keeper', baseSuccessRate: 0.5, icon: '⬆' },
            { name: 'Dribble GK', description: 'Round the keeper', baseSuccessRate: 0.35, icon: '◆' },
            { name: 'Fake Shot', description: 'Trick the keeper', baseSuccessRate: 0.55, icon: '✨' },
        ]
        defensiveActions = [
            { name: 'Diving Save', description: 'Full stretch save', baseSuccessRate: 0.55, icon: '🧤' },
            { name: 'Close Angle', description: 'Rush the striker', baseSuccessRate: 0.65, icon: '🏃' },
            { name: 'Punch Out', description: 'Clear the danger', baseSuccessRate: 0.6, icon: '👊' },
            { name: 'Stay Line', description: 'Wait for the shot', baseSuccessRate: 0.5, icon: '🧱' },
            { name: 'Anticipate', description: 'Read the striker', baseSuccessRate: 0.45, icon: '👁️' },
        ]
    } else if (setPieceType === 'throw_in') {
        offensiveActions = [
            { name: 'Short Throw', description: 'Safe nearby pass', baseSuccessRate: 0.85, icon: '👐' },
            { name: 'Long Bomb', description: 'Throw into the box', baseSuccessRate: 0.5, icon: '🚀' },
            { name: 'Fake Throw', description: 'Trick the marker', baseSuccessRate: 0.7, icon: '✨' },
        ]
        defensiveActions = [
            { name: 'Mark Tight', description: 'Stick to receiver', baseSuccessRate: 0.7, icon: '👤' },
            { name: 'Intercept', description: 'Read the throw', baseSuccessRate: 0.6, icon: '↙' },
            { name: 'Zonal Cover', description: 'Protect space', baseSuccessRate: 0.75, icon: '🛡️' },
        ]
    } else if (setPieceType === 'corner') {
        offensiveActions = [
            { name: 'Near Post', description: 'Cross to near post', baseSuccessRate: 0.55, icon: '📐' },
            { name: 'Far Post', description: 'Cross to far post', baseSuccessRate: 0.5, icon: '🏹' },
            { name: 'Short Corner', description: 'Pass to teammate', baseSuccessRate: 0.8, icon: '→' },
        ]
        defensiveActions = [
            { name: 'Man Mark', description: 'Tight marking', baseSuccessRate: 0.6, icon: '👤' },
            { name: 'Zonal Mark', description: 'Cover the area', baseSuccessRate: 0.65, icon: '🛡️' },
            { name: 'GK Punch', description: 'Keeper clears it', baseSuccessRate: 0.7, icon: '👊' },
        ]
    }

    return {
      ballHolderTeam: ballHolder.team as 'blue' | 'red',
      ballHolder,
      defender,
      distance,
      timeLimit,
      offensiveActions,
      defensiveActions,
      isGKEvent,
      isSetPiece: setPieceType
    }
  }

  calculateDynamicSuccess(
    action: ActionChoice,
    isOffense: boolean,
    player: SoccerPlayer,
    opponent: SoccerPlayer,
    allPlayers: SoccerPlayer[]
  ): number {
    let rate = action.baseSuccessRate
    const goalX = player.team === 'blue' ? 1000 : 50
    const distToGoal = Math.abs(player.x - goalX)
    
    if (action.name === 'Shoot' || action.name === 'Power Shot') {
        rate += (1 - distToGoal / 1000) * 0.3
    }

    const nearbyOpponents = allPlayers.filter(p => 
        p.team !== player.team && 
        p !== opponent && 
        Math.sqrt(Math.pow(p.x - player.x, 2) + Math.pow(p.y - player.y, 2)) < 150
    ).length
    
    rate -= nearbyOpponents * 0.05
    return Math.max(0.1, Math.min(0.95, rate))
  }

  resolveAction(
    offAction: ActionChoice,
    defAction: ActionChoice,
    offRate: number,
    defRate: number
  ): { success: boolean; offFinal: number; defFinal: number } {
    let offFinal = offRate
    let defFinal = defRate

    // GK Specific Clash Logic
    if (defAction.name === 'Diving Save' && offAction.name === 'Power Shot') defFinal += 0.1
    if (defAction.name === 'Close Angle' && offAction.name === 'Chip Shot') offFinal += 0.2
    
    // Set Piece Logic
    if (offAction.name === 'Long Bomb' && defAction.name === 'Intercept') defFinal += 0.15
    if (offAction.name === 'Short Throw' && defAction.name === 'Mark Tight') defFinal += 0.1
    
    const success = Math.random() * offFinal > Math.random() * defFinal
    return { success, offFinal, defFinal }
  }
}
