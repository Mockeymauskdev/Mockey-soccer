import SoccerPlayer from '../entities/SoccerPlayer'
import { TacticalAI } from './TacticalAI'
import type { Formation, TacticalState, Decision } from './TacticalAI'

export class TeamManager {
  private team: SoccerPlayer[]
  private tacticalAI: TacticalAI
  private formation: Formation = '4-3-3'
  private tacticalState: TacticalState = 'TRANSITION'
  // private score: number = 0
  // private possession: number = 50
  // private timeRemaining: number = 90 * 60

  constructor(players: SoccerPlayer[], fieldWidth: number) {
    this.team = players
    this.tacticalAI = new TacticalAI(fieldWidth)
  }

  /**
   * Update team state based on game situation
   */
  updateTeamState(score: number, opponentScore: number, possession: number, timeRemaining: number) {
    // this.score = score
    // this.possession = possession
    // this.timeRemaining = timeRemaining

    // Update tactical state
    this.tacticalState = this.tacticalAI.determineTacticalState(score, opponentScore, possession, timeRemaining)

    // Update formation
    this.formation = this.tacticalAI.selectFormation(this.tacticalState)
  }

  /**
   * Get decision for a specific player
   */
  getPlayerDecision(
    player: SoccerPlayer,
    ballOwner: SoccerPlayer,
    opponents: SoccerPlayer[],
    fieldX: number,
    fieldWidth: number
  ): Decision {
    const teammates = this.team.filter((p) => p !== player)

    if (player === ballOwner) {
      // Offensive decision
      return this.tacticalAI.getOffensiveDecision(player, ballOwner, teammates, opponents, fieldX, fieldWidth)
    } else {
      // Defensive decision
      return this.tacticalAI.getDefensiveDecision(player, ballOwner, teammates, opponents)
    }
  }

  /**
   * Get target position for player based on formation
   */
  getTargetPosition(playerIndex: number): { x: number; y: number } {
    const player = this.team[playerIndex]
    if (!player) return { x: 500, y: 300 }

    return this.tacticalAI.getFormationPosition(playerIndex, this.formation, player.team)
  }

  /**
   * Get position modifier for success rate calculation
   */
  getPositionModifier(player: SoccerPlayer, decision: Decision, fieldX: number, fieldWidth: number): number {
    return this.tacticalAI.getPositionModifier(player, decision, fieldX, fieldWidth)
  }

  /**
   * Get current formation
   */
  getFormation(): Formation {
    return this.formation
  }

  /**
   * Get current tactical state
   */
  getTacticalState(): TacticalState {
    return this.tacticalState
  }
}
