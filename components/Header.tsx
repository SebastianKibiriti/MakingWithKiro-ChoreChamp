'use client'

import { Database } from '../lib/supabase'
import { Menu, Transition } from '@headlessui/react'
import { Fragment } from 'react'
import { 
  UserCircleIcon, 
  ArrowRightOnRectangleIcon,
  Cog6ToothIcon,
  Bars3Icon
} from '@heroicons/react/24/outline'

type Profile = Database['public']['Tables']['profiles']['Row']

interface HeaderProps {
  user: Profile
  onLogout: () => void
  onMenuClick?: () => void
}

export default function Header({ user, onLogout, onMenuClick }: HeaderProps) {
  const isChild = user.role === 'child'
  
  const headerBgClass = isChild 
    ? 'bg-white/90 backdrop-blur-sm border-b border-indigo-200'
    : 'bg-white border-b border-gray-200'

  const titleText = isChild 
    ? '🏆 Mission Command Center'
    : 'Chore Champion - Family Dashboard'
  
  const mobileTitleText = isChild 
    ? '🏆 Mission Hub'
    : 'Chore Champion'

  const userDisplayName = isChild 
    ? `Agent ${user.name}`
    : user.name

  return (
    <header className={`${headerBgClass} shadow-sm sticky top-0 z-50`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Mobile menu button and Logo/Title */}
          <div className="flex items-center">
            {/* Mobile menu button - only show for parent users */}
            {onMenuClick && !isChild && (
              <button
                type="button"
                className="md:hidden -ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
                onClick={onMenuClick}
              >
                <span className="sr-only">Open sidebar</span>
                <Bars3Icon className="h-6 w-6" aria-hidden="true" />
              </button>
            )}
            <h1 className={`bungee-regular text-lg sm:text-xl ml-2 md:ml-0 ${
              isChild ? 'text-indigo-900' : 'text-gray-900'
            }`}>
              <span className="hidden sm:inline">{titleText}</span>
              <span className="sm:hidden">{mobileTitleText}</span>
            </h1>
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Points Display for Children - Mobile optimized */}
            {isChild && (
              <div className="flex items-center space-x-1 sm:space-x-2">
                {/* Mobile: Show only points */}
                <div className="sm:hidden" style={{ backgroundColor: '#FFDD00', borderColor: '#FFD700' }}>
                  <span className="text-xs font-medium px-2 py-1 rounded-full text-gray-800">
                    ⭐ {user.points}
                  </span>
                </div>
                {/* Desktop: Show both points and rank */}
                <div className="hidden sm:flex items-center space-x-2">
                  <div className="bg-yellow-100 px-3 py-1 rounded-full">
                    <span className="text-sm font-medium text-yellow-800">
                      ⭐ {user.points} Points
                    </span>
                  </div>
                  {user.rank && (
                    <div className="bg-indigo-100 px-3 py-1 rounded-full">
                      <span className="text-sm font-medium text-indigo-800">
                        🎖️ {user.rank}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* User Dropdown */}
            <Menu as="div" className="relative">
              <Menu.Button className="flex items-center space-x-1 sm:space-x-2 text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 p-1 sm:p-2 hover:bg-gray-50">
                <UserCircleIcon className="h-5 w-5 sm:h-6 sm:w-6 text-gray-400" />
                <span className="hidden sm:inline text-gray-700 font-medium">{userDisplayName}</span>
                <span className="sm:hidden text-gray-700 font-medium text-xs">{user.name}</span>
              </Menu.Button>

              <Transition
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
              >
                <Menu.Items className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                  <div className="py-1">
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          className={`${
                            active ? 'bg-gray-100' : ''
                          } flex items-center w-full px-4 py-2 text-sm text-gray-700`}
                        >
                          <Cog6ToothIcon className="mr-3 h-4 w-4" />
                          Settings
                        </button>
                      )}
                    </Menu.Item>
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          onClick={onLogout}
                          className={`${
                            active ? 'bg-gray-100' : ''
                          } flex items-center w-full px-4 py-2 text-sm text-gray-700`}
                        >
                          <ArrowRightOnRectangleIcon className="mr-3 h-4 w-4" />
                          Sign out
                        </button>
                      )}
                    </Menu.Item>
                  </div>
                </Menu.Items>
              </Transition>
            </Menu>
          </div>
        </div>
      </div>
    </header>
  )
}