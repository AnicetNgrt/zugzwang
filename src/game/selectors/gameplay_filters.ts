import { type SelectableFilter, filter_as_pawns, filter_as_tiles } from "."
import { is_current_player, type Tile } from "../model"
import type { Modifier } from "../modifiers"
import type { GameSession } from "../session"

export const filter_pawns_owned_by_session_player_if_current: SelectableFilter = filter_as_pawns(
    (session, pawn) => session.player == pawn.owner && is_current_player(session.game, pawn.owner)
)

export const filter_pawns_owned_by_enemy_of_session_player_if_current: SelectableFilter = filter_as_pawns(
    (session, pawn) => session.player != pawn.owner && is_current_player(session.game, session.player)
)

export function filter_tiles_if_session_player_can_play(
    modifier_builder: (session: GameSession, tile: Tile) => Modifier
): SelectableFilter {
    return filter_as_tiles((session, tile) => {
        const modifier = modifier_builder(session, tile)
        return modifier.is_allowed(session.game) && modifier.is_playable(session.game, session.player)
    })
}