import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, useScroll, useMotionValueEvent } from 'framer-motion';
import { 
  LayoutDashboard, 
  Users, 
  FileEdit, 
  BookOpen, 
  BarChart3, 
  CircleDollarSign, 
  PlusCircle, 
  Palette, 
  Sun, 
  Moon, 
  ShieldCheck, 
  MoreVertical, 
  X, 
  LogOut 
} from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, onQuickEntryClick, currentTheme, onThemeChange, user, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [hidden, setHidden] = useState(false);

  const { scrollY } = useScroll();

  // Dynamic Scroll Listener: hides navbar when scrolling down past 80px, shows when scrolling up
  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = scrollY.getPrevious() || 0;
    if (latest > previous && latest > 80) {
      setHidden(true); // User scrolling down
    } else {
      setHidden(false); // User scrolling up
    }
  });

  const navItems = [
    { id: 'dashboard', path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'entry', path: '/entry', label: 'New Voucher', icon: FileEdit },
    { id: 'statements', path: '/statements', label: 'Statements', icon: BookOpen },
    { id: 'agents', path: '/agents', label: 'Agents', icon: Users },
    { id: 'receivables', path: '/reports/receivables', label: 'Reports', icon: BarChart3 },
    { id: 'daily-flow', path: '/reports/daily-flow', label: 'Daily Cash Register', icon: CircleDollarSign }
  ];

  const themes = [
    { id: 'arafa-teal', name: 'Arafa Teal', icon: Sun, bgClass: 'bg-teal-600' },
    { id: 'midnight-onyx', name: 'Midnight Onyx', icon: Moon, bgClass: 'bg-zinc-950' },
    { id: 'executive-navy', name: 'Executive Navy', icon: ShieldCheck, bgClass: 'bg-blue-600' }
  ];

  const isItemActive = (item) => {
    if (item.id === 'dashboard') {
      return location.pathname === '/' || location.pathname === '/dashboard' || activeTab === 'dashboard';
    }
    if (item.id === 'receivables') {
      return location.pathname.startsWith('/reports') && location.pathname !== '/reports/daily-flow';
    }
    return location.pathname.startsWith(item.path) || activeTab === item.id;
  };

  const handleNav = (item) => {
    if (setActiveTab) setActiveTab(item.id);
    navigate(item.path);
    setIsMobileMenuOpen(false);
  };

  return (
    <motion.header
      variants={{
        visible: { y: 0, opacity: 1 },
        hidden: { y: "-100%", opacity: 0 }
      }}
      animate={hidden ? "hidden" : "visible"}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50 }}
      className="w-full bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-b border-slate-200 dark:border-zinc-800 py-3 px-4 sm:px-8 shadow-xs"
    >
      <div className="w-full flex items-center justify-between">
        
        {/* 1. Left Section (Brand & Logo) */}
        <div
          className="flex items-center space-x-3 cursor-pointer group shrink-0"
          onClick={() => {
            if (setActiveTab) setActiveTab('dashboard');
            navigate('/dashboard');
            setIsMobileMenuOpen(false);
          }}
        >
          <img
            src="/logo.png"
            alt="Arafa Hafiz Ltd."
            onError={(e) => {
              e.target.style.display = 'none';
              if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
            }}
            className="h-9 w-9 sm:h-10 sm:w-10 rounded-full object-cover border border-teal-500/20 shadow-sm group-hover:scale-105 transition-transform"
          />
          <div className="hidden h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-teal-600 text-white font-black text-sm items-center justify-center border border-teal-500/20 shadow-sm">
            AH
          </div>

          <div className="flex flex-col">
            <div className="flex items-center space-x-2">
              <span className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-zinc-100 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                Arafa Hafiz Ltd.
              </span>
              <span className="text-[10px] sm:text-xs font-semibold tracking-wide bg-teal-500/10 text-teal-600 dark:text-teal-400 px-2.5 py-0.5 rounded-full border border-teal-500/20">
                Agency Portal
              </span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-zinc-400 font-medium hidden sm:block">
              Umrah & Travel Ledger Management
            </p>
          </div>
        </div>

        {/* 2. Center Section (Desktop Navigation Links) */}
        <nav className="hidden lg:flex items-center space-x-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isItemActive(item);
            return (
              <button
                key={item.id}
                onClick={() => handleNav(item)}
                className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                  active
                    ? 'bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 font-bold border border-teal-500/20'
                    : 'text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800'
                }`}
              >
                <Icon className={`w-5 h-5 sm:w-5.5 sm:h-5.5 stroke-[1.8] ${active ? 'text-teal-600 dark:text-teal-400' : 'text-slate-500 dark:text-zinc-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* 3. Right Section (Controls & Profile) */}
        <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
          
          {/* Theme Dropdown Toggle */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsThemeOpen(!isThemeOpen)}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 transition-colors flex items-center space-x-2 text-xs sm:text-sm cursor-pointer"
              title="Change Color Theme"
            >
              <Palette className="w-5 h-5 sm:w-5.5 sm:h-5.5 stroke-[1.8] text-teal-600 dark:text-teal-400" />
              <span className="capitalize text-xs font-semibold hidden sm:inline">
                {currentTheme ? currentTheme.replace('-', ' ') : 'Theme'}
              </span>
            </button>

            {isThemeOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-2xl py-1.5 z-50 text-xs animate-in zoom-in-95 duration-100">
                <div className="px-3.5 py-1 text-[10px] uppercase font-bold text-slate-400 dark:text-zinc-500 border-b border-slate-100 dark:border-zinc-800">
                  Select Theme:
                </div>
                {themes.map((t) => {
                  const TIcon = t.icon;
                  const isSelected = currentTheme === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => {
                        onThemeChange(t.id);
                        setIsThemeOpen(false);
                      }}
                      className={`w-full text-left px-3.5 py-2 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-zinc-800/60 transition cursor-pointer ${
                        isSelected ? 'font-bold text-teal-600 dark:text-teal-400 bg-teal-50/50 dark:bg-teal-950/30' : 'text-slate-700 dark:text-zinc-300'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <TIcon className="w-4 h-4 stroke-[1.8] text-slate-400" />
                        <span>{t.name}</span>
                      </div>
                      <span className={`w-2.5 h-2.5 rounded-full ${t.bgClass} shadow-2xs`}></span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* New Entry Quick Action */}
          <button
            onClick={() => {
              if (onQuickEntryClick) onQuickEntryClick();
              navigate('/entry');
            }}
            className="bg-teal-600 hover:bg-teal-700 text-white text-xs sm:text-sm font-bold px-3.5 sm:px-4 py-2 rounded-xl flex items-center space-x-2 shadow-sm transition-all cursor-pointer"
          >
            <PlusCircle className="w-5 h-5 stroke-[2]" />
            <span className="hidden sm:inline">New Voucher</span>
            <span className="sm:hidden">New Voucher</span>
          </button>

          {/* Operator Badge & Logout (Desktop) */}
          <div className="hidden sm:flex items-center space-x-3 pl-3 border-l border-slate-200 dark:border-zinc-800">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-tr from-teal-600 to-emerald-500 text-white flex items-center justify-center font-bold text-xs sm:text-sm shadow-xs">
                {user?.username?.[0]?.toUpperCase() || 'A'}
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-zinc-200 leading-tight">
                  {user?.fullName || user?.username || 'Admin'}
                </span>
                <span className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold leading-none">
                  {user?.role || 'Operator'}
                </span>
              </div>
            </div>

            <button
              onClick={onLogout}
              className="p-2 rounded-xl border border-slate-200 dark:border-zinc-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-500 hover:text-rose-600 dark:text-zinc-400 dark:hover:text-rose-400 transition-colors cursor-pointer"
              title="Log Out"
            >
              <LogOut className="w-5 h-5 stroke-[1.8]" />
            </button>
          </div>

          {/* Mobile 3-Dot (Kebab) Menu Button (lg:hidden) */}
          <div className="lg:hidden">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 transition-colors focus:outline-none cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6 stroke-[2] text-teal-600 dark:text-teal-400" />
              ) : (
                <MoreVertical className="w-6 h-6 stroke-[2] text-teal-600 dark:text-teal-400" />
              )}
            </button>
          </div>
        </div>

      </div>

      {/* Mobile Dropdown Menu (Absolute positioning) */}
      {isMobileMenuOpen && (
        <div className="lg:hidden absolute inset-x-3 sm:inset-x-6 top-full mt-2 z-50 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-slate-200 dark:border-zinc-800 rounded-3xl p-5 shadow-2xl space-y-4 animate-in slide-in-from-top-3 duration-200">
          
          {/* Mobile User Profile Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-teal-600 to-emerald-500 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                {user?.username?.[0]?.toUpperCase() || 'A'}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">{user?.fullName || user?.username || 'Admin'}</p>
                <p className="text-xs text-teal-600 dark:text-teal-400 font-semibold">{user?.role || 'Operator'}</p>
              </div>
            </div>

            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                onLogout();
              }}
              className="flex items-center space-x-1.5 text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 px-3 py-1.5 rounded-xl font-bold transition cursor-pointer"
            >
              <LogOut className="w-4 h-4 stroke-[2]" />
              <span>Logout</span>
            </button>
          </div>

          {/* Navigation Links Grid */}
          <div className="space-y-1">
            <div className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider px-2 pb-1">
              Menu Navigation:
            </div>
            <div className="grid grid-cols-2 gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isItemActive(item);
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNav(item)}
                    className={`flex items-center space-x-2.5 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                      active
                        ? 'bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 font-bold border border-teal-500/20'
                        : 'text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <Icon className="w-5 h-5 stroke-[1.8] text-teal-600 dark:text-teal-400 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color Themes */}
          <div className="pt-2 border-t border-slate-100 dark:border-zinc-800">
            <div className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider px-2 pb-1.5">
              Color Theme:
            </div>
            <div className="grid grid-cols-3 gap-2">
              {themes.map((t) => {
                const isSelected = currentTheme === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => onThemeChange(t.id)}
                    className={`py-2 px-2 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 border transition cursor-pointer ${
                      isSelected
                        ? 'border-teal-500/50 bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 font-bold'
                        : 'border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full ${t.bgClass}`}></span>
                    <span className="truncate text-xs">{t.name.split(' ')[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>

        </div>
      )}
    </motion.header>
  );
}
