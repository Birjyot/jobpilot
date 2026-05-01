'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, LogIn, LogOut, Check } from 'lucide-react';
import { signIn, signOut } from 'next-auth/react';
import { RefObject } from 'react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  session: any;
  activeName: string;
  activeEmail: string;
  activeImage?: string;
  impersonatedUser: any;
  setImpersonatedUser: (user: any) => void;
  showProfileMenu: boolean;
  setShowProfileMenu: (val: boolean) => void;
  profileMenuRef: RefObject<HTMLDivElement | null>;
}

export default function Header({
  activeTab,
  setActiveTab,
  session,
  activeName,
  activeEmail,
  activeImage,
  impersonatedUser,
  setImpersonatedUser,
  showProfileMenu,
  setShowProfileMenu,
  profileMenuRef,
}: HeaderProps) {
  return (
    <header
      className="sticky top-0 z-50"
      style={{
        backdropFilter: 'blur(50px) saturate(100%)',
        WebkitBackdropFilter: 'blur(50px) saturate(100%)',
      }}
    >
      <div className="max-w-9xl mx-auto px-6">
        <div className="flex justify-between items-center h-20">
          {/* Left: Logo */}
          <div className="flex items-center group cursor-pointer">
            <div className="flex items-center">
              <span className="text-3xl font-bold tracking-tight text-white">Career</span>
              <span className="text-3xl font-black tracking-tight text-[#0F52BA]">OS</span>
            </div>
          </div>
          {/* Center: Navigation */}
          <nav className="hidden md:flex items-center gap-10">
            {['dashboard', 'applications', 'ai-tools', 'analytics'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="relative px-4 py-2 group transition-colors cursor-pointer"
              >
                <span
                  className={`relative z-10 text-base font-semibold transition-colors capitalize ${
                    activeTab === tab
                      ? 'text-[#FFF]'
                      : 'text-white'
                  }`}
                >
                  {tab.replace('-', ' ')}
                </span>

                {/* Glass active underline */}
                {activeTab === tab && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FFF] rounded-full"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
            ))}
          </nav>

          {/* Right: Profile */}
          <div className="flex items-center gap-4">
            {session ? (
              <div className="relative" ref={profileMenuRef}>
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center gap-3 cursor-pointer px-2 py-1.5 rounded-2xl transition-all duration-200"
                >
                  <div className="text-right leading-tight">
                    <p className="text-sm font-semibold text-white">{activeName}</p>
                    <p className="text-xs text-white/60">
                      {activeEmail}
                    </p>
                  </div>
                  {/* Avatar */}
                  <div className="relative">
                    {activeImage ? (
                      <img
                        src={activeImage}
                        alt="Profile"
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
                        style={{
                          background: 'linear-gradient(135deg, #0F52BA, #3B82F6)',
                        }}
                      >
                        {activeName?.split(' ').map(n => n[0]).join('')}
                      </div>
                    )}
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                  </div>
                  <ChevronDown
                    size={16}
                    className={`text-white transition-transform duration-200 ${
                      showProfileMenu ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {/* DROPDOWN */}
                <AnimatePresence>
                  {showProfileMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 12, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 12, scale: 0.96 }}
                      transition={{ duration: 0.18 }}
                      className="absolute right-0 mt-4 w-72 rounded-3xl overflow-hidden"
                      style={{
                        background: '#0a0f1eff',
                        backdropFilter: 'blur(30px) saturate(160%)',
                        WebkitBackdropFilter: 'blur(30px) saturate(160%)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        boxShadow: '0 25px 80px rgba(0,0,0,0.6)',
                      }}
                    >
                      {/* HEADER */}
                      <div className="p-5 border-b border-white/10">
                        <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-2 opacity-70">
                          Current Identity
                        </p>
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            {activeImage ? (
                              <img
                                src={activeImage}
                                className="w-10 h-10 rounded-full object-cover"
                                style={{ border: '1px solid rgba(255,255,255,0.2)' }}
                              />
                            ) : (
                              <div
                                className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
                                style={{
                                  background: 'linear-gradient(135deg, #0F52BA, #3B82F6)',
                                }}
                              >
                                {activeName?.charAt(0)}
                              </div>
                            )}
                            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border border-black" />
                          </div>

                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{activeName}</p>
                            <p className="text-xs text-white/60 font-mono truncate">{activeEmail}</p>
                          </div>
                        </div>
                      </div>

                      {/* SWITCH USERS */}
                      <div className="p-3">
                        <p className="px-3 pt-2 pb-2 text-[10px] font-bold text-white/60 uppercase tracking-widest">
                          Switch Test Account
                        </p>
                        {[
                          { name: 'You', email: '' },
                          { name: 'Alex River', email: 'alex.river@example.com' },
                          { name: 'Sam Smith', email: 'sam.smith@tech.io' },
                          { name: 'Jordan Lee', email: 'jlee@dev.com' }
                        ].map((user) => {
                          const isActive =
                            (impersonatedUser && user.email === impersonatedUser.email) ||
                            (!user.email && !impersonatedUser);
                          return (
                            <button
                              key={user.email}
                              onClick={() => {
                                setImpersonatedUser(user.email === '' ? null : user);
                                setShowProfileMenu(false);
                              }}
                              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
                              style={{
                                background: isActive ? 'rgba(15,82,186,0.25)' : 'transparent',
                                color: isActive ? '#60A5FA' : 'rgba(255,255,255)',
                              }}
                              onMouseEnter={(e) => {
                                if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                              }}
                              onMouseLeave={(e) => {
                                if (!isActive) e.currentTarget.style.background = 'transparent';
                              }}
                            >
                              {user.name}
                              {isActive && <Check size={16} className="text-blue-400" />}
                            </button>
                          );
                        })}
                      </div>

                      {/* LOGOUT */}
                      <div className="p-3 border-t border-white/10">
                        <button
                          onClick={() => signOut()}
                          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all"
                          style={{
                            background: 'rgba(255, 0, 0, 0.08)',
                            color: '#f87171',
                            border: '1px solid rgba(255,0,0,0.2)',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 0, 0, 0.18)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 0, 0, 0.08)';
                          }}
                        >
                          <LogOut size={16} /> Sign Out
                        </button>
                      </div>

                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <button
                onClick={() => signIn('google')}
                className="flex items-center gap-2 px-5 py-2 rounded-[10px] font-medium text-[13.5px] cursor-pointer transition-all duration-200 text-white bg-[#27222266] hover:bg-[#0F52BA]"
                style={{
                  backdropFilter: 'blur(20px)',
                }}
              >
                <LogIn size={15} /> Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}