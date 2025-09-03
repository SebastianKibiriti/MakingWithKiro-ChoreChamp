export interface Rank {
  id: string;
  name: string;
  pointsRequired: number;
  description: string;
  color: string;
  icon: string;
  privileges: string[];
}

export const ARMY_RANKS: Rank[] = [
  {
    id: "recruit-rascal",
    name: "Recruit Rascal",
    pointsRequired: 0,
    description:
      "Every new member of the Chore Champion squad starts here! Learning the ropes and focusing on completing basic chores.",
    color: "bg-gray-500",
    icon: "🎖️",
    privileges: [
      "Access to the app and personalized chore list",
      "Opportunity to earn points for completed tasks",
      "Choose one small, fun sticker for profile each week"
    ]
  },
  {
    id: "task-trooper",
    name: "Task Trooper",
    pointsRequired: 500,
    description:
      "Consistently completing initial chores and becoming a reliable team member.",
    color: "bg-green-500",
    icon: "🪖",
    privileges: [
      "All privileges of Recruit Rascal",
      "Choose one extra playtime slot (15 minutes of screen time) per week"
    ]
  },
  {
    id: "chore-corporal",
    name: "Chore Corporal",
    pointsRequired: 1500,
    description:
      "Skilled at tasks and can handle a wider variety of chores. Might help younger family members.",
    color: "bg-blue-500",
    icon: "⭐",
    privileges: [
      "All privileges of Task Trooper",
      "Pick the family movie for one movie night per month (with parental approval)"
    ]
  },
  {
    id: "duty-sergeant",
    name: "Duty Sergeant",
    pointsRequired: 3000,
    description:
      "Reliable and responsible. Can manage complex chores and take on leadership roles.",
    color: "bg-purple-500",
    icon: "⭐⭐",
    privileges: [
      "All privileges of Chore Corporal",
      "Have a say in the menu for one family meal per month"
    ]
  },
  {
    id: "lieutenant-leader",
    name: "Lieutenant Leader",
    pointsRequired: 5000,
    description:
      "Taking on significant responsibilities and demonstrating leadership within the family.",
    color: "bg-orange-500",
    icon: "⭐⭐⭐",
    privileges: [
      "All privileges of Duty Sergeant",
      "Get an extra allowance or small treat once a month"
    ]
  },
  {
    id: "captain-commander",
    name: "Captain Commander",
    pointsRequired: 7500,
    description:
      "Strong leaders within the family unit. Highly responsible and trusted with important tasks.",
    color: "bg-red-500",
    icon: "🎖️⭐",
    privileges: [
      "All privileges of Lieutenant Leader",
      "Choose a fun family outing once every two months (within budget and with parental approval)"
    ]
  },
  {
    id: "major-master",
    name: "Major Master",
    pointsRequired: 10500,
    description:
      "Exceptional dedication and mastery of chores. Highly reliable and plays a significant role.",
    color: "bg-indigo-500",
    icon: "🎖️⭐⭐",
    privileges: [
      "All privileges of Captain Commander",
      "Get a special 'helper' for one chore each week (another family member assists)"
    ]
  },
  {
    id: "colonel-captain",
    name: "Colonel Captain",
    pointsRequired: 14000,
    description:
      "Top-tier chore performers and leaders. Role models for other family members.",
    color: "bg-yellow-500",
    icon: "🎖️⭐⭐⭐",
    privileges: [
      "All privileges of Major Master",
      "Extended privilege: extra hour of screen time or later bedtime on one weekend night per month"
    ]
  },
  {
    id: "general-genius",
    name: "General Genius",
    pointsRequired: 18000,
    description:
      "The pinnacle of chore accomplishment! Ultimate Chore Champions with consistent commitment.",
    color: "bg-gradient-to-r from-purple-500 to-pink-500",
    icon: "👑",
    privileges: [
      "All privileges of Colonel Captain",
      "Choose a special family activity or treat of choice once every three months (within reason and with parental agreement)"
    ]
  },
];

export function getRankByPoints(points: number): Rank {
  const sortedRanks = [...ARMY_RANKS].sort(
    (a, b) => b.pointsRequired - a.pointsRequired
  );
  return (
    sortedRanks.find((rank) => points >= rank.pointsRequired) || ARMY_RANKS[0]
  );
}

export function getNextRank(currentPoints: number): Rank | null {
  const sortedRanks = [...ARMY_RANKS].sort(
    (a, b) => a.pointsRequired - b.pointsRequired
  );
  return (
    sortedRanks.find((rank) => currentPoints < rank.pointsRequired) || null
  );
}

export function getAllPrivilegesForRank(rank: Rank): string[] {
  const allPrivileges: string[] = [];
  const sortedRanks = [...ARMY_RANKS].sort((a, b) => a.pointsRequired - b.pointsRequired);
  
  // Get all ranks up to and including the current rank
  const ranksUpToCurrent = sortedRanks.filter(r => r.pointsRequired <= rank.pointsRequired);
  
  // Collect unique privileges, excluding "All privileges of..." entries
  ranksUpToCurrent.forEach(r => {
    r.privileges.forEach(privilege => {
      if (!privilege.startsWith("All privileges of") && !allPrivileges.includes(privilege)) {
        allPrivileges.push(privilege);
      }
    });
  });
  
  return allPrivileges;
}
