import type { Entity, Game, PawnBase, PawnPlaced, PawnStaging, Player, TileBase, TileEmpty, TileOccupied } from "./model"
import { is_current_player } from "./model"

export interface Modifier {
    apply(game: Game)
    rollback(game: Game)
    is_allowed(game: Game): boolean
    is_playable(game: Game, player: Player): boolean
}

export function can_play(game: Game, modifier: Modifier, player: Player): boolean {
    if (!is_current_player(game, player)) return false
    if (!modifier.is_allowed(game)) return false
    if (!modifier.is_playable(game, player)) return false
    return true
}

export class ModifierAddPawn implements Modifier {
    constructor(
        protected owner: Entity
    ) { }

    is_playable(_game: Game, _player: Player): boolean {
        return false
    }

    is_allowed(game: Game): boolean {
        return game.pawns.filter(p => p.owner == this.owner).length < game.rules.max_pawn_per_player
    }

    apply(game: Game) {
        game.pawns.push({ id: game.pawns.length, owner: this.owner, state: 'Staging' })
    }

    rollback(game: Game) {
        game.pawns.pop()
    }
}

export class ModifierPlacePawn implements Modifier {
    constructor(
        protected pawn_id: number,
        protected position: { x: number, y: number }
    ) { }

    is_playable(game: Game, player: Player): boolean {
        if (game.pawns[this.pawn_id].owner != player) return false
        return true
    }

    is_allowed(game: Game): boolean {
        if (game.board[this.position.y][this.position.x].state != 'Empty') return false
        if (game.pawns[this.pawn_id].state != 'Staging') return false
        return true
    }

    apply(game: Game) {
        let new_pawn: PawnBase & PawnPlaced = {
            state: 'Placed',
            id: this.pawn_id,
            owner: game.pawns[this.pawn_id].owner,
            ...this.position
        }
        game.pawns[this.pawn_id] = new_pawn

        let destination: TileBase & TileOccupied = {
            ...this.position,
            state: 'Occupied',
            pawn_id: this.pawn_id
        }
        game.board[this.position.y][this.position.x] = destination
    }

    rollback(game: Game) {
        let new_pawn: PawnBase & PawnStaging = {
            state: 'Staging',
            id: this.pawn_id,
            owner: game.pawns[this.pawn_id].owner
        }
        game.pawns[this.pawn_id] = new_pawn

        let destination: TileBase & TileEmpty = {
            ...this.position,
            state: 'Empty'
        }
        game.board[this.position.y][this.position.x] = destination
    }
}

export class ModifierMovePawn implements Modifier {
    protected previous_state: PawnPlaced

    constructor(
        protected pawn_id: number,
        protected position: { x: number, y: number }
    ) { }

    is_playable(_game: Game, _player: Player): boolean {
        return false
    }

    is_allowed(game: Game): boolean {
        if (game.board[this.position.y][this.position.x].state != 'Empty') return false
        if (game.pawns[this.pawn_id].state != 'Placed') return false
        return true
    }

    apply(game: Game) {
        this.previous_state = { ...game.pawns[this.pawn_id] as PawnPlaced }

        let new_pawn: PawnBase & PawnPlaced = {
            state: 'Placed',
            id: this.pawn_id,
            owner: game.pawns[this.pawn_id].owner,
            ...this.position
        }
        game.pawns[this.pawn_id] = new_pawn

        let destination: TileBase & TileOccupied = {
            ...this.position,
            state: 'Occupied',
            pawn_id: this.pawn_id
        }
        game.board[this.position.y][this.position.x] = destination

        let origin: TileBase & TileEmpty = {
            x: this.previous_state.x,
            y: this.previous_state.y,
            state: 'Empty'
        }
        game.board[this.previous_state.y][this.previous_state.x] = origin
    }

    rollback(game: Game) {
        const modifier = new ModifierMovePawn(this.pawn_id, {
            x: this.previous_state.x,
            y: this.previous_state.y
        })

        modifier.apply(game)
    }
}