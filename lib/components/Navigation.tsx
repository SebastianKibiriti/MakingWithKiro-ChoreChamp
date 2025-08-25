'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  HomeIcon, 
  ClipboardDocumentListIcon, 
  UserGroupIcon, 
  GiftIcon, 
  ChartBarIcon, 
  CheckCircleIcon,
  MapIcon,
  TrophyIcon,
  StarIcon
} from '@heroicons/react/24/outline'

interface NavigationProps {
  role: 'parent' | 'child'
  currentPath: string
}

const parentNavItems = [
  { name: 'Dashboard', href: '/parent/dashboard', icon: HomeIcon },
  { name: 'Chores', href: '/parent/chores', icon: ClipboardDocumentListIcon },
  { name: 'Children', href: '/parent/children', icon: UserGroupIcon },
  { name: 'Approvals', href: '/parent/approvals', icon: CheckCircleIcon },
  { name: 'Rewards', href: '/parent/rewards', icon: GiftIcon },
  { name: 'Analytics', href: '/parent/analytics', icon: ChartBarIcon },
]

const childNavItems = [
  { name: 'Mission Hub', href: '/child/dashboard', icon: HomeIcon },
  { name: 'Missions', href: '/child/missions', icon: MapIcon },
  { name: 'Progress', href: '/child/progress', icon: TrophyIcon },
  { name: 'Rewards', href: '/child/rewards', icon: StarIcon },
]

export default function Navigation({ role }: NavigationProps) {
  const pathname = usePathname()
  const navItems = role === 'parent' ? parentNavItems : childNavItems

  const navBgClass = role === 'child' 
    ? 'bg-white/80 backdrop-blur-sm border-r border-indigo-200'
    : 'bg-white border-r border-gray-200'

  return (
    <nav className={`w-64 ${navBgClass} shadow-sm`}>
      <div className="p-4">
        <div className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`
                  group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors
                  ${isActive
                    ? role === 'child'
                      ? 'bg-indigo-100 text-indigo-700 border-r-2 border-indigo-500'
                      : 'bg-gray-100 text-gray-900 border-r-2 border-gray-500'
                    : role === 'child'
                      ? 'text-gray-700 hover:bg-indigo-50 hover:text-indigo-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }
                `}
              >
                <Icon
                  className={`
                    mr-3 h-5 w-5 flex-shrink-0
                    ${isActive
                      ? role === 'child' ? 'text-indigo-500' : 'text-gray-500'
                      : role === 'child' ? 'text-gray-400 group-hover:text-indigo-500' : 'text-gray-400 group-hover:text-gray-500'
                    }
                  `}
                />
                {item.name}
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}