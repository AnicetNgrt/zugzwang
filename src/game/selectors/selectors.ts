import type { SelectedTree, SelectableFilter, Selectable, SelectedTreeRoot } from "."
import { filters, filter_pawns, filter_tiles  } from "."
import type { Tile, Pawn } from "../model"
import type { GameSession } from "../session"

export interface Selector {
    on_finished(callback: (selected: SelectedTree) => void, first?: boolean): void
    is_finished(): boolean
    is_empty(): boolean
    is_candidate: SelectableFilter
    is_selected(session: GameSession, el: Selectable): boolean
    toggle(session: GameSession, el: Selectable): boolean
}

export class InlineSelector implements Selector {
    constructor(
        public on_finished: (callback: (selected: SelectedTree) => void) => void,
        public get_callback: () => (selected: SelectedTree) => void,
        public is_finished: () => boolean,
        public is_empty: () => boolean,
        public is_candidate: (session: GameSession, el: Selectable) => boolean,
        public is_selected: (session: GameSession, el: Selectable) => boolean,
        public toggle: (session: GameSession, el: Selectable) => boolean
    ) {}
}

export class AmountSelector implements Selector {
    protected selected: Selectable[]
    protected callbacks: ((selected: SelectedTree) => void)[]

    constructor(
        protected max: number,
        callback: (selected: SelectedTree) => void,
        public is_candidate: SelectableFilter
    ) {
        this.selected = []
        this.callbacks = [callback]
    }

    is_empty(): boolean {
        return this.selected.length == 0
    }

    on_finished(callback: (selected: SelectedTree) => void, first?: boolean) {
        if (first) {
            this.callbacks = [callback, ...this.callbacks]
        } else {
            this.callbacks.push(callback)
        }
    }

    is_finished(): boolean {
        return this.selected.length >= this.max
    }

    is_selected(_session: GameSession, el: Selectable): boolean {
        return this.selected.some(selected_el => selected_el.equals(el))
    }

    toggle(session: GameSession, el: Selectable): boolean {
        if (this.is_selected(session, el)) {
            this.selected = this.selected
                .filter(selected_el => !selected_el.equals(el))
        } else {
            if (this.selected.length >= this.max) {
                this.selected.pop()
            }
            this.selected.push(el)
            if (this.is_finished()) {
                this.callbacks.forEach(
                    callback => callback({ type: "Leaf", items: this.selected })
                )
            }
            return true
        }
        return false
    }
}

export class OnceSelector extends AmountSelector {
    constructor(
        callback: (selected: SelectedTree) => void,
        is_candidate: SelectableFilter
    ) {
        super(1, callback, is_candidate)
    }
}

export class DummySelector extends AmountSelector {
    constructor() {
        super(0, _ => {}, (_a, _b) => false)
    }

    is_finished(): boolean {
        return false
    }
}

export class OrSelector implements Selector {
    protected currents: number[]

    constructor(
        protected selectors: Selector[],
        callback: (selected_tree: SelectedTree) => void
    ) {
        this.currents = [...selectors.keys()]
        this.on_finished(callback)
    }

    on_finished(callback: (selected: SelectedTree) => void, first?: boolean): void {
        this.selectors.forEach(
            selector => selector.on_finished(selected_tree => {
                callback(selected_tree)
            }, first)
        )
    }

    is_finished(): boolean {
        return this.currents.length == 1 && this.selectors[this.currents[0]].is_finished()
    }

    is_empty(): boolean {
        return this.currents.every(i => this.selectors[i].is_empty())
    }

    is_candidate(session: GameSession, el: Selectable): boolean {
        return this.currents.some(i => this.selectors[i].is_candidate(session, el))
    }

    is_selected(session: GameSession, el: Selectable): boolean {
        return this.currents.length == 1 && this.selectors[this.currents[0]].is_selected(session, el)
    }

    toggle(session: GameSession, el: Selectable): boolean {
        if (this.currents.length == 1) {
            let toggled = this.selectors[this.currents[0]].toggle(session, el)
            if (this.selectors[this.currents[0]].is_empty()) {
                this.currents = [...this.selectors.keys()]
            }
            return toggled
        } else {
            let id = this.currents.find(i => this.selectors[i].is_candidate(session, el))
            if (id !== undefined) {
                this.currents = [id]
                return this.toggle(session, el)
            }
            return false
        }
    }
}

export class MergeSelector implements Selector {

    constructor(
        protected selectors: Selector[],
        callback: (selected_tree: SelectedTree) => void
    ) {
        this.on_finished(callback)
    }

    on_finished(callback: (selected: SelectedTree) => void, first?: boolean): void {
        this.selectors.forEach((selector, i) => {
            selector.on_finished(selected_tree => {
                callback(selected_tree)
            }, first)
        })
    }

    is_finished(): boolean {
        return this.selectors.some(selector => selector.is_finished())
    }

    is_empty(): boolean {
        return this.selectors.every(selector => selector.is_empty())
    }

    is_candidate(session: GameSession, el: Selectable): boolean {
        return this.selectors.some(selector => selector.is_candidate(session, el))
    }

    is_selected(session: GameSession, el: Selectable): boolean {
        return this.selectors.some(selector => selector.is_selected(session, el))
    }

    toggle(session: GameSession, el: Selectable): boolean {
        let toggled_once = false
        
        this.selectors.forEach(selector => {
            if (selector.is_candidate(session, el)) {
                if (selector.toggle(session, el)) {
                    toggled_once = true
                    if (selector.is_finished()) {
                        return true
                    }
                }
            }
        })

        return toggled_once
    }
}

export class ChainedSelector implements Selector {
    protected previous: Selector
    protected current: Selector
    protected current_id: number
    protected selected_tree: SelectedTreeRoot

    constructor(
        protected chain: Selector[],
        callback: (selected_tree: SelectedTree) => void
    ) {
        this.previous = null
        this.current = chain[0]
        this.current_id = 0
        this.selected_tree = {
            type: 'Root',
            children: chain.map(_ => ({
                type: 'Leaf',
                items: []
            }))
        }
        
        for (let i = 0; i < chain.length-1; i++) {
            chain[i].on_finished(selected_tree => {
                if (i == this.current_id) {
                    this.previous = chain[i]
                    this.current = chain[i+1]
                    this.current_id = i+1
                }
                this.selected_tree.children[i] = selected_tree
            })
        }
        this.on_finished(callback)
    }

    is_empty(): boolean {
        return this.current_id == 0 && this.current.is_empty()
    }

    is_candidate(session: GameSession, el: Selectable): boolean {
        if (
            this.previous 
            && this.current.is_empty() 
            && !this.current.is_candidate(session, el)
        ) {
            return this.previous.is_candidate(session, el)
        }
        return this.current.is_candidate(session, el)
    }

    on_finished(callback: (selected_tree: SelectedTree) => void, first?: boolean) {
        this.chain[this.chain.length-1].on_finished(selected_tree => {
            this.selected_tree.children[this.chain.length-1] = selected_tree
            callback(this.selected_tree)
        }, first)
    }

    is_finished(): boolean {
        return this.current == this.chain[this.chain.length-1]
            && this.current.is_finished()
    }

    is_selected(session: GameSession, el: Selectable): boolean {
        if (!this.current.is_selected(session, el) && this.current.is_candidate(session, el)) return false
        return this.chain.some(c => c.is_selected(session, el))
    }

    toggle(session: GameSession, el: Selectable): boolean {
        if (
            this.previous
            && this.current.is_empty()
            && !this.current.is_candidate(session, el)
            && this.previous.is_candidate(session, el)
        ) {
            const result = this.previous.toggle(session, el)
            if (!result && this.previous.is_empty() && this.current_id > 0) {
                this.current = this.previous
                this.previous = this.current_id >= 2 ? this.chain[this.current_id-2] : null
                this.current_id -= 1
            }
            return result
        }

        return this.current.toggle(session, el)
    }
}

export class OneTileSelector extends OnceSelector {
    constructor(
        callback: (selected_tile: Tile) => void,
        tile_filter: SelectableFilter
    ) {
        super((selected_tree: SelectedTree) => {
            if (selected_tree.type != 'Leaf') return
            callback(selected_tree.items[0].as_tile())
        }, filters([
            filter_tiles,
            tile_filter
        ]))
    }
}

export class OnePawnSelector extends OnceSelector {
    constructor(
        callback: (selected_pawn: Pawn) => void,
        pawn_filter: SelectableFilter
    ) {
        super((selected_tree: SelectedTree) => {
            if (selected_tree.type != 'Leaf') return
            callback(selected_tree.items[0].as_pawn())
        }, filters([
            filter_pawns,
            pawn_filter
        ]))
    }
}
