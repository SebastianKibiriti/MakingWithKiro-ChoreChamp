"use client";

import { useState, useEffect } from "react";
import { Database } from "../lib/supabase";
import Navigation from "./Navigation";
import Header from "./Header";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

interface DashboardLayoutProps {
  children: React.ReactNode;
  userRole: "parent" | "child";
  userProfile: Profile;
}

export default function DashboardLayout({
  children,
  userRole,
  userProfile,
}: DashboardLayoutProps) {
  // Sidebar state - collapsed by default on mobile
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Check if we're on mobile and set initial state
  useEffect(() => {
    const checkMobile = () => {
      const isMobile = window.innerWidth < 768; // md breakpoint
      setSidebarOpen(!isMobile); // Open on desktop, closed on mobile
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Mock signOut function for testing (auth disabled)
  const mockSignOut = async () => {
    console.log("Sign out clicked (auth disabled)");
    window.location.href = "/";
  };

  const backgroundClass =
    userRole === "child"
      ? "min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100"
      : "min-h-screen bg-gray-50";

  return (
    <div className={backgroundClass}>
      <Header 
        user={userProfile} 
        onLogout={mockSignOut}
        onMenuClick={() => setSidebarOpen(!sidebarOpen)}
      />
      <div className="flex">
        <Navigation 
          role={userRole} 
          currentPath="" 
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        {/* Main content area with responsive margin */}
        <main className={`flex-1 ${sidebarOpen ? 'md:ml-64' : 'md:ml-0 lg:ml-64'} transition-all duration-300`}>
          <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
