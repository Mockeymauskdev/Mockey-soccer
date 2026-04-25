import SoccerPlayer from '../entities/SoccerPlayer'

export type Formation = '4-3-3' | '4-4-2' | '5-4-1'
export type TacticalState = 'ATTACK' | 'DEFEND' | 'TRANSITION'
export type PlayerRole = 'GK' | 'DEF' | 'MID' | 'FWD'
export type Decision = 'SHOOT' | 'PASS_FORWARD' | 'PASS_WIDE' | 'PASS_BACK' | 'DRIBBLE' | 'PRESS' | 'COVER' | 'HOLD' | 'MARK' | 'INTERCEPT'

interface FormationSlot {
  x: number
  y: number
  role: PlayerRole
}

// interface TeamState {
//   formation: Formation
//   tacticalState: TacticalState
//   score: number
//   possession: number
//   timeRemaining: number
// }

export class TacticalAI {
  private formations: Record<Formation, FormationSlot[]> = {
    '4-3-3': [
      { x: 120, y: 300, role: 'GK' },
      { x: 250, y: 120, role: 'DEF' },
      { x: 250, y: 240, role: 'DEF' },
      { x: 250, y: 360, role: 'DEF' },
      { x: 250, y: 480, role: 'DEF' },
      { x: 420, y: 150, role: 'MID' },
      { x: 420, y: 300, role: 'MID' },
      { x: 420, y: 450, role: 'MID' },
      { x: 650, y: 120, role: 'FWD' },
      { x: 650, y: 300, role: 'FWD' },
      { x: 650, y: 480, role: 'FWD' },
    ],
    '4-4-2': [
      { x: 120, y: 300, role: 'GK' },
      { x: 250, y: 100, role: 'DEF' },
      { x: 250, y: 250, role: 'DEF' },
      { x: 250, y: 350, role: 'DEF' },
      { x: 250, y: 500, role: 'DEF' },
      { x: 420, y: 120, role: 'MID' },
      { x: 420, y: 240, role: 'MID' },
      { x: 420, y: 360, role: 'MID' },
      { x: 420, y: 480, role: 'MID' },
      { x: 650, y: 200, role: 'FWD' },
      { x: 650, y: 400, role: 'FWD' },
    ],
    '5-4-1': [
      { x: 120, y: 300, role: 'GK' },
      { x: 250, y: 80, role: 'DEF' },
      { x: 250, y: 180, role: 'DEF' },
      { x: 250, y: 300, role: 'DEF' },
      { x: 250, y: 420, role: 'DEF' },
      { x: 250, y: 520, role: 'DEF' },
      { x: 420, y: 150, role: 'MID' },
      { x: 420, y: 300, role: 'MID' },
      { x: 420, y: 450, role: 'MID' },
      { x: 550, y: 225, role: 'MID' },
      { x: 650, y: 300, role: 'FWD' },
    ],
  }

  private fieldWidth: number = 1000

  constructor(fieldWidth: number = 1000) {
    this.fieldWidth = fieldWidth
  }

  /**
   * Determine tactical state based on game situation
   */
  determineTacticalState(
    score: number,
    opponentScore: number,
    possession: number,
    timeRemaining: number
  ): TacticalState {
    const scoreDelta = score - opponentScore
    const timePercentage = timeRemaining / (90 * 60)

    // Late game adjustments
    if (timePercentage < 0.1) {
      if (scoreDelta > 0) return 'DEFEND'
      if (scoreDelta < 0) return 'ATTACK'
    }

    // Score-based decisions
    if (scoreDelta > 1) return 'DEFEND'
    if (scoreDelta < -1) return 'ATTACK'

    // Possession-based decisions
    if (possession > 60) return 'ATTACK'
    if (possession < 40) return 'DEFEND'

    return 'TRANSITION'
  }

  /**
   * Select formation based on tactical state
   */
  selectFormation(tacticalState: TacticalState): Formation {
    switch (tacticalState) {
      case 'ATTACK':
        return '4-3-3'
      case 'DEFEND':
        return '5-4-1'
      case 'TRANSITION':
        return '4-4-2'
      default:
        return '4-3-3'
    }
  }

  /**
   * Get target position for a player based on formation
   */
  getFormationPosition(playerIndex: number, formation: Formation, team: 'blue' | 'red'): { x: number; y: number } {
    const slots = this.formations[formation]
    if (playerIndex >= slots.length) {
      return { x: 500, y: 300 }
    }

    let slot = slots[playerIndex]

    // Mirror for red team
    if (team === 'red') {
      slot = {
        ...slot,
        x: this.fieldWidth - slot.x + 50,
      }
    }

    return { x: slot.x, y: slot.y }
  }

  /**
   * Offensive decision tree: Find best action for attacking player
   */
  getOffensiveDecision(
    player: SoccerPlayer,
    ballOwner: SoccerPlayer,
    teammates: SoccerPlayer[],
    opponents: SoccerPlayer[],
    fieldX: number,
    fieldWidth: number
  ): Decision {   // Only ball owner makes offensive decisions
    if (player !== ballOwner) return 'MARK'

    const goalX = player.team === 'blue' ? fieldX + fieldWidth : fieldX
    // fieldY and fieldHeight are not needed for offensive decisions
    const distanceToGoal = Math.abs(player.x - goalX)
    const inFinalThird = player.team === 'blue' ? player.x > fieldX + (fieldWidth * 2) / 3 : player.x < fieldX + fieldWidth / 3

    // Decision 1: Can I shoot?
    if (inFinalThird && distanceToGoal < 200) {
      const defendersNearby = opponents.filter((o) => {
        const dist = this.distance(player.x, player.y, o.x, o.y)
        return dist < 100
      }).length

      if (defendersNearby < 2) {
        return 'SHOOT'
      }
    }

    // Decision 2: Can I play forward?
    const forwardPass = this.findForwardPass(player, teammates)
    if (forwardPass) {
      return 'PASS_FORWARD'
    }

    // Decision 3: Can I play wide?
    const widePass = this.findWidePass(player, teammates)
    if (widePass) {
      return 'PASS_WIDE'
    }

    // Decision 4: Keep possession (sideways/back)
    const backPass = this.findBackPass(player, teammates)
    if (backPass) {
      return 'PASS_BACK'
    }

    // Default: Dribble if no good pass
    return 'DRIBBLE'
  }
  /**
   * Defensive decision tree: Find best action for defending player
   */
  getDefensiveDecision(
    player: SoccerPlayer,
    ballOwner: SoccerPlayer,
    teammates: SoccerPlayer[],
    opponents: SoccerPlayer[]
  ): Decision {
    const distanceToBall = this.distance(player.x, player.y, ballOwner.x, ballOwner.y)

    // Decision 1: Am I closest? Press the ball
    const closestDefender = this.findClosestPlayer(ballOwner, [player, ...teammates.filter((t) => t.team === player.team)])
    if (closestDefender === player && distanceToBall < 150) {
      return 'PRESS'
    }

    // Decision 2: Am I second closest? Cover
    const secondClosest = this.findSecondClosestPlayer(ballOwner, [player, ...teammates.filter((t) => t.team === player.team)])
    if (secondClosest === player && distanceToBall < 200) {
      return 'COVER'
    }

    // Decision 3: Mark my man
    const assignedOpponent = this.findMarkingTarget(player, opponents)
    if (assignedOpponent) {
      return 'MARK'
    }

    // Decision 4: Hold shape
    return 'HOLD'
  }

  /**
   * Find forward pass option
   */
  private findForwardPass(player: SoccerPlayer, teammates: SoccerPlayer[]): SoccerPlayer | null {
    const forwardTeammates = teammates.filter((t) => {
      if (player.team === 'blue') {
        return t.x > player.x && Math.abs(t.y - player.y) < 150
      } else {
        return t.x < player.x && Math.abs(t.y - player.y) < 150
      }
    })

    if (forwardTeammates.length === 0) return null

    // Find unmarked teammate
    for (const teammate of forwardTeammates) {
      if (forwardTeammates.length > 0) {
        return teammate
      }
    }

    return forwardTeammates[0]
  }

  /**
   * Find wide pass option
   */
  private findWidePass(player: SoccerPlayer, teammates: SoccerPlayer[]): SoccerPlayer | null {
    const wideTeammates = teammates.filter((t) => {
      const yDiff = Math.abs(t.y - player.y)
      return yDiff > 150 && yDiff < 250 && Math.abs(t.x - player.x) < 200
    })

    if (wideTeammates.length === 0) return null

    // Find unmarked teammate
    for (const teammate of wideTeammates) {
      if (wideTeammates.length > 0) {
        return teammate
      }
    }

    return wideTeammates[0]
  }

  /**
   * Find back pass option
   */
  private findBackPass(player: SoccerPlayer, teammates: SoccerPlayer[]): SoccerPlayer | null {
    const backTeammates = teammates.filter((t) => {
      if (player.team === 'blue') {
        return t.x < player.x && Math.abs(t.y - player.y) < 200
      } else {
        return t.x > player.x && Math.abs(t.y - player.y) < 200
      }
    })

    if (backTeammates.length === 0) return null

    // Find safest option (closest to own goal)
    return backTeammates.reduce((prev, curr) => {
      const prevDist = player.team === 'blue' ? prev.x : 1000 - prev.x
      const currDist = player.team === 'blue' ? curr.x : 1000 - curr.x
      return currDist < prevDist ? curr : prev
    })
  }

  /**
   * Find marking target
   */
  private findMarkingTarget(player: SoccerPlayer, opponents: SoccerPlayer[]): SoccerPlayer | null {
    if (opponents.length === 0) return null

    // Find closest opponent
    return opponents.reduce((prev, curr) => {
      const prevDist = this.distance(player.x, player.y, prev.x, prev.y)
      const currDist = this.distance(player.x, player.y, curr.x, curr.y)
      return currDist < prevDist ? curr : prev
    })
  }

  /**
   * Find closest player to target
   */
  private findClosestPlayer(target: SoccerPlayer, players: SoccerPlayer[]): SoccerPlayer | null {
    if (players.length === 0) return null

    return players.reduce((prev, curr) => {
      const prevDist = this.distance(target.x, target.y, prev.x, prev.y)
      const currDist = this.distance(target.x, target.y, curr.x, curr.y)
      return currDist < prevDist ? curr : prev
    })
  }

  /**
   * Find second closest player to target
   */
  private findSecondClosestPlayer(target: SoccerPlayer, players: SoccerPlayer[]): SoccerPlayer | null {
    if (players.length < 2) return null

    const sorted = [...players].sort((a, b) => {
      const distA = this.distance(target.x, target.y, a.x, a.y)
      const distB = this.distance(target.x, target.y, b.x, b.y)
      return distA - distB
    })

    return sorted[1] || null
  }

  /**
   * Calculate distance between two points
   */
  private distance(x1: number, y1: number, x2: number, y2: number): number {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
  }

  /**
   * Get success rate modifier based on player position and role
   */
  getPositionModifier(player: SoccerPlayer, decision: Decision, fieldX: number, fieldWidth: number): number {
    const inDefensiveThird = player.team === 'blue' ? player.x < fieldX + fieldWidth / 3 : player.x > fieldX + (fieldWidth * 2) / 3
    const inMiddleThird = !inDefensiveThird && (player.team === 'blue' ? player.x < fieldX + (fieldWidth * 2) / 3 : player.x > fieldX + fieldWidth / 3)
    const inAttackingThird = player.team === 'blue' ? player.x > fieldX + (fieldWidth * 2) / 3 : player.x < fieldX + fieldWidth / 3

    switch (decision) {
      case 'SHOOT':
        return inAttackingThird ? 1.2 : inMiddleThird ? 0.8 : 0.4
      case 'PASS_FORWARD':
        return inDefensiveThird ? 0.7 : inMiddleThird ? 1.0 : 1.2
      case 'PASS_WIDE':
        return 0.9
      case 'PASS_BACK':
        return inDefensiveThird ? 1.2 : inMiddleThird ? 1.1 : 0.9
      case 'DRIBBLE':
        return inAttackingThird ? 1.1 : inMiddleThird ? 0.9 : 0.6
      default:
        return 1.0
    }
  }
}
