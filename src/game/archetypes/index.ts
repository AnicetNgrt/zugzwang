import { ArchetypeDisplacement, ArchetypeStack } from "../cards";


const SmallRivers = new ArchetypeDisplacement(
    "Small Rivers", 1, 
    [
        { x: 0, y: 1 },
        { x: 1, y: 0 },
        { x: 0, y: -1 },
        { x: -1, y: 0 }
    ]
)

export const StackSmallRivers = new ArchetypeStack([
    SmallRivers,
    SmallRivers,
    SmallRivers,
    SmallRivers
], 0)

const Knight = new ArchetypeDisplacement(
    "Knight", 2, 
    [
        { x: 1, y: 2 },
        { x: 1, y: -2 },
        { x: -1, y: 2 },
        { x: -1, y: -2 },
        { x: 2, y: 1 },
        { x: -2, y: 1 },
        { x: 2, y: -1 },
        { x: -2, y: -1 },
    ]
)

export const StackKnight = new ArchetypeStack([
    Knight,
], 0)