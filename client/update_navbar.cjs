const fs = require('fs');
let nav = fs.readFileSync('e:/TravelLedger/client/src/components/Navbar.jsx', 'utf8');

nav = nav.replace('export default function Navbar({ activeTab, setActiveTab, onQuickEntryClick, onTagadaClick, currentTheme, onThemeChange }) {', 'export default function Navbar({ activeTab, setActiveTab, onQuickEntryClick, onTagadaClick, currentTheme, onThemeChange, user, onLogout }) {');
nav = nav.replace('max-w-7xl mx-auto px-4 sm:px-6 lg:px-8', 'w-full px-4 sm:px-6 lg:px-8');

const userSection = `
            {/* User Profile & Logout */}
            <div className="flex items-center space-x-3 pl-3 border-l border-slate-700">
              <div className="flex items-center space-x-1.5 text-slate-300">
                <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center border border-slate-600">
                  <span className="text-xs font-bold text-teal-400">{user?.username?.[0]?.toUpperCase() || 'U'}</span>
                </div>
                <span className="text-sm font-semibold hidden sm:block">{user?.username || 'User'}</span>
              </div>
              <button
                onClick={onLogout}
                className="text-xs text-rose-400 hover:text-rose-300 hover:bg-slate-800 px-2 py-1.5 rounded transition"
              >
                লগআউট / Logout
              </button>
            </div>
`;

nav = nav.replace('<span>নতুন ভাউচার / New Entry</span>\n            </button>', '<span>নতুন ভাউচার / New Entry</span>\n            </button>\n' + userSection);

fs.writeFileSync('e:/TravelLedger/client/src/components/Navbar.jsx', nav, 'utf8');
console.log('Navbar.jsx updated');
