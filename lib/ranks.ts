export interface Rank {
  name: string
  points: number
  icon: string
  description: string
}

export const ARMY_RANKS: Rank[] = [
  { name: 'Recruit', points: 0, icon: '🎖️', description: 'Just starting your journey!' },
  { name: 'Private', points: 50, icon: '🪖', description: 'Learning the basics' },
  { name: 'Corporal', points: 150, icon: '⭐', description: 'Showing leadership' },
  { name: 'Sergeant', points: 300, icon: '⭐⭐', description: 'Reliable and skilled' },
  { name: 'Lieutenant', points: 500, icon: '⭐⭐⭐', description: 'Leading by example' },
  { name: 'Captain', points: 750, icon: '🎖️⭐', description: 'Commanding respect' },
  { name: 'Major', points: 1000, icon: '🎖️⭐⭐', description: 'Strategic thinker' },
  { name: 'Colonel', points: 1500, icon: '🎖️⭐⭐⭐', description: 'Exceptional leader' },
  { name: 'General', points: 2000, icon: '👑', description: 'Master of all tasks!' }
]

export function getRankByPoints(points: number): Rank {
  for (let i = ARMY_RANKS.length - 1; i >= 0; i--) {
    if (points >= ARMY_RANKS[i].points) {
      return ARMY_RANKS[i]
    }
  }
  return ARMY_RANKS[0]
}

export function getNextRank(currentPoints: number): Rank | null {
  const currentRank = getRankByPoints(currentPoints)
  const currentIndex = ARMY_RANKS.findIndex(rank => rank.name === currentRank.name)
  
  if (currentIndex < ARMY_RANKS.length - 1) {
    return ARMY_RANKS[currentIndex + 1]
  }
  
  return null // Already at highest rank
}