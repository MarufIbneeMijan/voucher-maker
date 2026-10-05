const fs = require('fs');
let app = fs.readFileSync('e:/TravelLedger/client/src/App.jsx', 'utf8');

if (!app.includes('import Login from')) {
  app = app.replace('import Dashboard from', 'import Login from \'./components/Login\';\nimport Dashboard from');
}

if (!app.includes('const [user, setUser] = useState(null)')) {
  app = app.replace('const [activeTab, setActiveTab] = useState(\'dashboard\');', 
`const [activeTab, setActiveTab] = useState('dashboard');
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('traveledger_auth');
    if (storedUser) setUser(JSON.parse(storedUser));
  }, []);`);
}

if (!app.includes('if (!user) return')) {
  app = app.replace('return (', 'if (!user) return <Login onLogin={setUser} />;\n\n  return (');
}

app = app.replace(/max-w-7xl mx-auto/g, 'w-full');
app = app.replace(/<DataEntryForm\n/g, '<DataEntryForm\n            user={user}\n');
app = app.replace(/<Navbar /g, '<Navbar user={user} onLogout={() => { localStorage.removeItem(\'traveledger_auth\'); setUser(null); }} ');

fs.writeFileSync('e:/TravelLedger/client/src/App.jsx', app, 'utf8');
console.log('App.jsx updated.');
