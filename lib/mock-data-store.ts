'use client'

// Shared mock data store to simulate real-time synchronization
interface MockChore {
  id: string
  title: string
  description: string
  points: number
  assigned_to?: string
  recurring: boolean
}

interface MockCompletion {
  id: string
  chore_id: string
  child_name: string
  status: 'pending' | 'approved' | 'rejected'
  completed_at: string
  chore: {
    title: string
    description: string
    points: number
  }
}

interface MockMission {
  id: string
  title: string
  description: string
  points: number
  status: 'pending' | 'approved' | 'rejected' | null
}

// Initial mock data
const initialChores: MockChore[] = [
  {
    id: '1',
    title: 'Clean Kitchen',
    description: 'Wipe counters and load dishwasher',
    points: 25,
    assigned_to: 'Alex',
    recurring: false
  },
  {
    id: '2',
    title: 'Take Out Trash',
    description: 'Empty all trash cans and take to curb',
    points: 15,
    assigned_to: undefined,
    recurring: true
  },
  {
    id: '3',
    title: 'Feed the Dog',
    description: 'Fill food and water bowls',
    points: 10,
    assigned_to: 'Sam',
    recurring: true
  }
]

const initialCompletions: MockCompletion[] = [
  {
    id: '1',
    chore_id: 'chore-1',
    child_name: 'Alex',
    status: 'pending',
    completed_at: new Date().toISOString(),
    chore: {
      title: 'Clean Kitchen',
      description: 'Wipe counters and load dishwasher',
      points: 25
    }
  },
  {
    id: '2',
    chore_id: 'chore-2',
    child_name: 'Sam',
    status: 'pending',
    completed_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    chore: {
      title: 'Feed the Dog',
      description: 'Fill food and water bowls',
      points: 10
    }
  }
]

const initialMissions: MockMission[] = [
  {
    id: 'mission-1',
    title: 'Clean Your Room',
    description: 'Make bed, organize toys, vacuum floor',
    points: 25,
    status: null
  },
  {
    id: 'mission-2',
    title: 'Take Out Trash',
    description: 'Empty all trash cans and take to curb',
    points: 15,
    status: null
  },
  {
    id: 'mission-3',
    title: 'Feed the Dog',
    description: 'Fill food and water bowls',
    points: 10,
    status: 'pending'
  },
  {
    id: 'mission-4',
    title: 'Load Dishwasher',
    description: 'Put dirty dishes in dishwasher',
    points: 20,
    status: 'approved'
  }
]

// Global state
let chores = [...initialChores]
let completions = [...initialCompletions]
let missions = [...initialMissions]
let childPoints = 150

// Subscribers for real-time updates
const subscribers: (() => void)[] = []

// Subscribe to changes
export function subscribe(callback: () => void) {
  subscribers.push(callback)
  return () => {
    const index = subscribers.indexOf(callback)
    if (index > -1) {
      subscribers.splice(index, 1)
    }
  }
}

// Notify all subscribers
function notifySubscribers() {
  subscribers.forEach(callback => callback())
}

// Chore management
export function getChores(): MockChore[] {
  return [...chores]
}

export function addChore(chore: Omit<MockChore, 'id'>): void {
  const newChore = {
    ...chore,
    id: Date.now().toString()
  }
  chores = [newChore, ...chores]
  
  // Also add to missions if it's available to children
  const newMission: MockMission = {
    id: `mission-${Date.now()}`,
    title: newChore.title,
    description: newChore.description,
    points: newChore.points,
    status: null
  }
  missions = [newMission, ...missions]
  
  notifySubscribers()
}

export function deleteChore(choreId: string): void {
  chores = chores.filter(c => c.id !== choreId)
  notifySubscribers()
}

// Completion management
export function getCompletions(): MockCompletion[] {
  return [...completions]
}

export function approveCompletion(completionId: string): void {
  const completion = completions.find(c => c.id === completionId)
  if (completion) {
    // Update completion status
    completions = completions.map(c => 
      c.id === completionId 
        ? { ...c, status: 'approved' as const }
        : c
    )
    
    // Update mission status
    const missionTitle = completion.chore.title
    missions = missions.map(m => 
      m.title === missionTitle && m.status === 'pending'
        ? { ...m, status: 'approved' as const }
        : m
    )
    
    // Award points
    childPoints += completion.chore.points
    
    notifySubscribers()
  }
}

export function rejectCompletion(completionId: string): void {
  const completion = completions.find(c => c.id === completionId)
  if (completion) {
    // Update completion status
    completions = completions.map(c => 
      c.id === completionId 
        ? { ...c, status: 'rejected' as const }
        : c
    )
    
    // Update mission status - make it available again
    const missionTitle = completion.chore.title
    missions = missions.map(m => 
      m.title === missionTitle && m.status === 'pending'
        ? { ...m, status: 'rejected' as const }
        : m
    )
    
    notifySubscribers()
  }
}

// Mission management
export function getMissions(): MockMission[] {
  return [...missions]
}

export function completeMission(missionId: string): void {
  const mission = missions.find(m => m.id === missionId)
  if (mission) {
    // Update mission status
    missions = missions.map(m => 
      m.id === missionId 
        ? { ...m, status: 'pending' as const }
        : m
    )
    
    // Add to completions
    const newCompletion: MockCompletion = {
      id: Date.now().toString(),
      chore_id: missionId,
      child_name: 'Test Child',
      status: 'pending',
      completed_at: new Date().toISOString(),
      chore: {
        title: mission.title,
        description: mission.description,
        points: mission.points
      }
    }
    completions = [newCompletion, ...completions]
    
    notifySubscribers()
  }
}

// Stats
export function getChildPoints(): number {
  return childPoints
}

export function getStats() {
  const pendingCompletions = completions.filter(c => c.status === 'pending')
  const availableMissions = missions.filter(m => !m.status || m.status === 'rejected')
  const approvedToday = completions.filter(c => {
    const today = new Date().toDateString()
    return c.status === 'approved' && new Date(c.completed_at).toDateString() === today
  })
  
  return {
    parent: {
      totalChildren: 2,
      pendingApprovals: pendingCompletions.length,
      completedToday: approvedToday.length,
      activeChores: chores.length
    },
    child: {
      currentPoints: childPoints,
      availableMissions: availableMissions.length,
      completedToday: approvedToday.length,
      pendingApprovals: pendingCompletions.length
    }
  }
}