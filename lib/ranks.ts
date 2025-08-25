export interface Rank {
  id: string
  name: string
  pointsRequired: number
  description: string
  color: string
  icon: string
}

export const ARMY_RANKS: Rank[] = [
  {
    id: 'recruit-rascal',
    name: 'Recruit Rascal',
    pointsRequired: 0,
    description: 'Just starting your chore journey!',
    color: 'bg-gray-500',
    icon: '🎖️'
  },
  {
    id: 'task-trooper',
    name: 'Task Trooper',
    pointsRequired: 50,
    description: 'Getting the hang of helping out!',
    color: 'bg-green-500',
    icon: '⭐'
  },
  {
    id: 'chore-corporal',
    name: 'Chore Corporal',
    pointsRequired: 150,
    description: 'A reliable helper around the house!',
    color: 'bg-blue-500',
    icon: '🏅'
  },
  {
    id: 'duty-sergeant',
    name: 'Duty Sergeant',
    pointsRequired: 300,
    description: 'Leading by example in responsibility!',
    color: 'bg-purple-500',
    icon: '🎗️'
  },
  {
    id: 'mission-major',
    name: 'Mission Major',
    pointsRequired: 500,
    description: 'A true household hero!',
    color: 'bg-orange-500',
    icon: '🏆'
  },
  {
    id: 'captain-clean',
    name: 'Captain Clean',
    pointsRequired: 750,
    description: 'Master of maintaining order!',
    color: 'bg-red-500',
    icon: '👑'
  },
  {
    id: 'colonel-capable',
    name: 'Colonel Capable',
    pointsRequired: 1000,
    description: 'Exceptionally skilled and dependable!',
    color: 'bg-indigo-500',
    icon: '💎'
  },
  {
    id: 'general-great',
    name: 'General Great',
    pointsRequired: 1500,
    description: 'A legendary household leader!',
    color: 'bg-yellow-500',
    icon: '⚡'
  },
  {
    id: 'supreme-commander',
    name: 'Supreme Commander',
    pointsRequired: 2000,
    description: 'The ultimate chore champion!',
    color: 'bg-gradient-to-r from-purple-500 to-pink-500',
    icon: '🌟'
  }
]

export function getRankByPoints(points: number): Rank {
  const sortedRanks = [...ARMY_RANKS].sort((a, b) => b.pointsRequired - a.pointsRequired)
  return sortedRanks.find(rank => points >= rank.pointsRequired) || ARMY_RANKS[0]
}

export function getNextRank(currentPoints: number): Rank | null {
  const sortedRanks = [...ARMY_RANKS].sort((a, b) => a.pointsRequired - b.pointsRequired)
  return sortedRanks.find(rank => currentPoints < rank.pointsRequired) || null
}