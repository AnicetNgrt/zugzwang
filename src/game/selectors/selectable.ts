import type { Card } from "../cards"
import type { Pawn, Tile } from "../model"

export type SelectableObject = null | Tile | Pawn | Card
export type SelectableType = 'null' | 'Tile' | 'Pawn' | 'Card'

export type SelectedTree = SelectedTreeLeaf | SelectedTreeRoot

export interface SelectedTreeLeaf { type: 'Leaf', items: Selectable[] }
export interface SelectedTreeRoot { type: 'Root', children: SelectedTree[] }

export class Selectable {
    constructor(
        protected object: SelectableObject,
        protected type: SelectableType
    ) {}

    get_type(): SelectableType {
        return this.type
    }

    as_tile(): Tile {
        return this.type == 'Tile' ? this.object as Tile : null
    }

    as_pawn(): Pawn {
        return this.type == 'Pawn' ? this.object as Pawn : null
    }

    as_card() {
        return this.type == 'Card' ? this.object as Card : null
    }

    equals(selectable: Selectable): boolean {
        if (selectable.type != this.type) return false
        if (this.type == 'Card') return (this.object as Card).id == (selectable.object as Card).id
        if (this.type == 'Pawn') return (this.object as Pawn).id == (selectable.object as Pawn).id
        if (this.type == 'Tile') {
            const { x: xA, y: yA } = this.object as Tile
            const { x: xB, y: yB } = selectable.object as Tile
            return xA == xB && yA == yB
        }
    }
}