'use client';

import { useState } from 'react';
import { LogOut, Plus, Eye, Shield, Settings, Package } from 'lucide-react';
import SimRegistration from './sim-registration';
import ViewRegisteredSims from './view-registered-sims';
import SettingsComponent from './settings';
import TrackOrder from './track-order';

interface HomeProps {
  userData: { cnic: string; email: string };
  onLogout: () => void;
}

type CurrentView = 'menu' | 'register' | 'view' | 'settings' | 'track';

export default function Home({ userData, onLogout }: HomeProps) {
  const [currentView, setCurrentView] = useState<CurrentView>('menu');

  const handleMfaChange = () => {
    alert('MFA setup will be implemented when connected to backend. Redirect to MFA setup screen.');
    setCurrentView('menu');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card shadow-md sticky top-0 z-10 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
                <Shield className="text-primary-foreground" size={24} />
              </div>
              <div>
                <h1 className="text-lg sm:text-2xl font-bold text-foreground">
                  DIMS-SR
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground">SIM Registration</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => setCurrentView('settings')}
                className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-muted text-foreground rounded-lg hover:bg-primary hover:text-primary-foreground transition-colors"
                title="Settings"
              >
                <Settings size={20} />
              </button>
              <button
                onClick={onLogout}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-destructive text-primary-foreground rounded-lg hover:bg-destructive/90 transition-colors text-sm sm:text-base font-semibold"
              >
                <LogOut size={18} />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {currentView === 'menu' && (
          <>
            {/* Welcome Section */}
            <div className="bg-card rounded-2xl p-6 sm:p-8 shadow-lg mb-8 sm:mb-12 border border-border">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="text-5xl sm:text-6xl"></div>
                <div className="flex-1 text-center sm:text-left">
                  <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
                    Welcome to DIMS-SR
                  </h2>
                  <p className="text-muted-foreground text-sm sm:text-base mb-2">
                    CNIC: <span className="font-semibold text-foreground">{userData.cnic}</span>
                  </p>
                  <p className="text-muted-foreground text-sm sm:text-base">
                    Manage your SIM registrations securely
                  </p>
                </div>
              </div>
            </div>

            {/* Action Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
              {/* Register SIM Card */}
              <button
                onClick={() => setCurrentView('register')}
                className="bg-card rounded-2xl p-6 sm:p-8 shadow-lg hover:shadow-xl transition-shadow border border-border hover:border-primary group"
              >
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-primary/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <Plus className="text-primary" size={32} />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-foreground mb-2">
                  Register New SIM
                </h3>
                <p className="text-muted-foreground text-sm sm:text-base mb-4">
                  Register a new SIM card with your identity
                </p>
                <span className="text-primary hover:text-secondary font-semibold text-sm sm:text-base">
                  Get Started →
                </span>
              </button>

              {/* View SIMs Card */}
              <button
                onClick={() => setCurrentView('view')}
                className="bg-card rounded-2xl p-6 sm:p-8 shadow-lg hover:shadow-xl transition-shadow border border-border hover:border-primary group"
              >
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-secondary/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-secondary/20 transition-colors">
                  <Eye className="text-secondary" size={32} />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-foreground mb-2">
                  View Registered SIMs
                </h3>
                <p className="text-muted-foreground text-sm sm:text-base mb-4">
                  View all your previously registered SIMs
                </p>
                <span className="text-secondary hover:text-primary font-semibold text-sm sm:text-base">
                  View History →
                </span>
              </button>

              <button
                onClick={() => setCurrentView('track')}
                className="bg-card rounded-2xl p-6 sm:p-8 shadow-lg hover:shadow-xl transition-shadow border border-border hover:border-primary group"
              >
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-amber-100 dark:bg-amber-950 rounded-lg flex items-center justify-center mb-4 group-hover:bg-amber-200 dark:group-hover:bg-amber-900 transition-colors">
                  <Package className="text-amber-600 dark:text-amber-400" size={32} />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-foreground mb-2">
                  Track Order
                </h3>
                <p className="text-muted-foreground text-sm sm:text-base mb-4">
                  Track your SIM registration request status
                </p>
                <span className="text-amber-600 dark:text-amber-400 hover:text-primary font-semibold text-sm sm:text-base">
                  Track Now →
                </span>
              </button>
            </div>
          </>
        )}

        {currentView === 'register' && (
          <SimRegistration
            cnic={userData.cnic}
            onBack={() => setCurrentView('menu')}
          />
        )}

        {currentView === 'view' && (
          <ViewRegisteredSims
            cnic={userData.cnic}
            onBack={() => setCurrentView('menu')}
          />
        )}

        {currentView === 'track' && (
          <TrackOrder
            onBack={() => setCurrentView('menu')}
          />
        )}

        {currentView === 'settings' && (
          <SettingsComponent
            userData={userData}
            onBack={() => setCurrentView('menu')}
            onMfaChange={handleMfaChange}
          />
        )}
      </main>
    </div>
  );
}
