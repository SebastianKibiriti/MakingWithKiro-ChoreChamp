'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
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
  isOpen: boolean
  onClose: () => void
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

function NavigationContent({ role, onLinkClick, isMobileFooter = false }: { role: 'parent' | 'child', onLinkClick?: () => void, isMobileFooter?: boolean }) {
  const pathname = usePathname()
  const navItems = role === 'parent' ? parentNavItems : childNavItems

  if (isMobileFooter && role === 'child') {
    // Mobile footer layout for child
    return (
      <div className="flex justify-around items-center">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onLinkClick}
              className={`
                flex flex-col items-center px-1 py-2 text-xs font-medium transition-all duration-200 min-w-0 flex-1
                ${isActive
                  ? 'text-white transform scale-110'
                  : 'text-white/70 hover:text-white hover:scale-105'
                }
              `}
            >
              <Icon className="h-5 w-5 mb-1 flex-shrink-0" />
              <span className="text-[9px] leading-tight text-center truncate w-full">{item.name}</span>
            </Link>
          )
        })}
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {navItems.map((item) => {
        const isActive = pathname === item.href
        const Icon = item.icon
        
        return (
          <Link
            key={item.name}
            href={item.href}
            onClick={onLinkClick}
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
  )
}

export default function Navigation({ role, isOpen, onClose }: NavigationProps) {
  const navBgClass = role === 'child' 
    ? 'bg-white/80 backdrop-blur-sm border-r border-indigo-200'
    : 'bg-white border-r border-gray-200'

  return (
    <>
      {/* Mobile floating footer for child role */}
      {role === 'child' && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 pb-safe">
          <div 
            className="mx-2 mb-2 rounded-2xl shadow-2xl border-2 backdrop-blur-sm"
            style={{ backgroundColor: '#FF9933', borderColor: '#FF8C00' }}
          >
            <nav className="px-2 py-2">
              <NavigationContent role={role} isMobileFooter={true} />
            </nav>
          </div>
        </div>
      )}

      {/* Mobile sidebar for parent role */}
      {role === 'parent' && (
        <Transition.Root show={isOpen} as={Fragment}>
          <Dialog as="div" className="relative z-50 md:hidden" onClose={onClose}>
            <Transition.Child
              as={Fragment}
              enter="transition-opacity ease-linear duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="transition-opacity ease-linear duration-300"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-gray-900/80" />
            </Transition.Child>

            <div className="fixed inset-0 flex">
              <Transition.Child
                as={Fragment}
                enter="transition ease-in-out duration-300 transform"
                enterFrom="-translate-x-full"
                enterTo="translate-x-0"
                leave="transition ease-in-out duration-300 transform"
                leaveFrom="translate-x-0"
                leaveTo="-translate-x-full"
              >
                <Dialog.Panel className={`relative mr-16 flex w-full max-w-xs flex-1 ${navBgClass}`}>
                  <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
                    <button type="button" className="-m-2.5 p-2.5" onClick={onClose}>
                      <span className="sr-only">Close sidebar</span>
                      <XMarkIcon className="h-6 w-6 text-white" aria-hidden="true" />
                    </button>
                  </div>

                  <div className="flex grow flex-col gap-y-5 overflow-y-auto px-6 pb-4">
                    <div className="flex h-16 shrink-0 items-center">
                      <h2 className="text-lg font-semibold text-gray-900">
                        {role === 'child' ? 'Mission Control' : 'Command Center'}
                      </h2>
                    </div>
                    <nav className="flex flex-1 flex-col">
                      <NavigationContent role={role} onLinkClick={onClose} />
                    </nav>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </Dialog>
        </Transition.Root>
      )}

      {/* Desktop sidebar */}
      <div className={`hidden md:fixed md:inset-y-0 md:z-40 md:flex md:w-64 md:flex-col ${isOpen ? 'md:block' : 'md:hidden lg:block'}`}>
        <div className={`flex grow flex-col gap-y-5 overflow-y-auto ${navBgClass} px-6 pb-4 shadow-sm`}>
          <div className="flex h-16 shrink-0 items-center">
            <h2 className="text-lg font-semibold text-gray-900">
              {role === 'child' ? 'Mission Control' : 'Command Center'}
            </h2>
          </div>
          <nav className="flex flex-1 flex-col">
            <NavigationContent role={role} />
          </nav>
        </div>
      </div>
    </>
  )
}