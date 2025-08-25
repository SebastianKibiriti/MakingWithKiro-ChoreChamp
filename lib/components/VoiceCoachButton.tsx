'use client'

import React, { useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { Fragment } from 'react'
import { 
  MicrophoneIcon, 
  XMarkIcon,
  SpeakerWaveIcon 
} from '@heroicons/react/24/outline'
import VoiceCoach from './VoiceCoach'

interface VoiceCoachButtonProps {
  userId: string
  isEnabled?: boolean
  selectedCharacter?: string
  className?: string
}

/**
 * Voice Coach Button Component
 * Provides a floating action button that opens the voice coach in a modal
 * Perfect for integration into child dashboards
 */
export default function VoiceCoachButton({
  userId,
  isEnabled = true,
  selectedCharacter = 'friendly-guide',
  className = ''
}: VoiceCoachButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleInteractionComplete = (interaction: any) => {
    console.log('Voice interaction completed:', interaction)
    // Could trigger notifications, update UI, etc.
  }

  const handleError = (error: string) => {
    console.error('Voice coach error:', error)
    // Could show error notifications
  }

  if (!isEnabled) {
    return null
  }

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 w-16 h-16 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center z-40 ${className}`}
        aria-label="Open Voice Coach"
      >
        <MicrophoneIcon className="w-8 h-8" />
      </button>

      {/* Voice Coach Modal */}
      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={setIsOpen}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  {/* Modal Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                        <SpeakerWaveIcon className="w-5 h-5 text-indigo-600" />
                      </div>
                      <Dialog.Title
                        as="h3"
                        className="text-lg font-medium leading-6 text-gray-900"
                      >
                        Voice Coach
                      </Dialog.Title>
                    </div>
                    <button
                      type="button"
                      className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      onClick={() => setIsOpen(false)}
                    >
                      <span className="sr-only">Close</span>
                      <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                    </button>
                  </div>

                  {/* Voice Coach Component */}
                  <VoiceCoach
                    userId={userId}
                    isEnabled={isEnabled}
                    selectedCharacter={selectedCharacter}
                    onInteractionComplete={handleInteractionComplete}
                    onError={handleError}
                  />

                  {/* Modal Footer */}
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <div className="flex justify-between items-center">
                      <p className="text-xs text-gray-500">
                        Speak naturally about your chores and goals
                      </p>
                      <button
                        type="button"
                        className="text-sm text-indigo-600 hover:text-indigo-500 font-medium"
                        onClick={() => setIsOpen(false)}
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  )
}