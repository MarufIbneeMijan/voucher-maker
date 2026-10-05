const fs = require('fs');

let db = fs.readFileSync('e:/TravelLedger/client/src/components/Dashboard.jsx', 'utf8');

// 1. Add date range state
db = db.replace('const [error, setError] = useState(null);', `const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');`);

// 2. Update fetch logic
db = db.replace("const res = await fetch('/api/dashboard/summary');", `
      let query = '';
      if (dateRange !== 'all') {
        const today = new Date();
        let start = new Date();
        let end = new Date();
        if (dateRange === 'today') {
          // today
        } else if (dateRange === 'week') {
          start.setDate(today.getDate() - today.getDay());
        } else if (dateRange === 'month') {
          start.setDate(1);
        } else if (dateRange === 'last-month') {
          start.setMonth(today.getMonth() - 1);
          start.setDate(1);
          end.setMonth(today.getMonth());
          end.setDate(0);
        } else if (dateRange === 'year') {
          start.setMonth(0);
          start.setDate(1);
        } else if (dateRange === 'custom' && customStart && customEnd) {
          start = new Date(customStart);
          end = new Date(customEnd);
        }
        
        if (dateRange !== 'custom' || (customStart && customEnd)) {
          const sDate = start.toISOString().split('T')[0];
          const eDate = end.toISOString().split('T')[0];
          query = \`?startDate=\${sDate}&endDate=\${eDate}\`;
        }
      }
      const res = await fetch('/api/dashboard/summary' + query);`);

// 3. Add useEffect dependency
db = db.replace('useEffect(() => {', 'useEffect(() => {');
db = db.replace('fetchDashboardData();\n  }, [refreshTrigger]);', 'fetchDashboardData();\n  }, [refreshTrigger, dateRange, customStart, customEnd]);');

// 4. Remove payment clearance button block
db = db.replace(/<button\s+onClick=\{onOpenPaymentModal\}[\s\S]*?<\/button>/, '');

// 5. Add Date Filter UI above the welcome message
const dateFilterUI = `
      {/* Date Range Filter */}
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-zinc-800 mb-6 flex flex-wrap items-center gap-3">
        <span className="text-sm font-semibold text-slate-700 dark:text-zinc-300">Time Range:</span>
        <select 
          value={dateRange} 
          onChange={(e) => setDateRange(e.target.value)}
          className="p-2 text-sm bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-slate-700 dark:text-zinc-300 outline-none focus:ring-2 focus:ring-teal-500"
        >
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="last-month">Last Month</option>
          <option value="year">This Year</option>
          <option value="all">All Time (সর্বকালীন)</option>
          <option value="custom">Custom Range</option>
        </select>
        {dateRange === 'custom' && (
          <div className="flex items-center space-x-2">
            <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="p-2 text-sm bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-slate-700 dark:text-zinc-300" />
            <span className="text-slate-500">to</span>
            <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="p-2 text-sm bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-slate-700 dark:text-zinc-300" />
          </div>
        )}
      </div>
`;
db = db.replace('<div className="flex items-center justify-between mb-6">', dateFilterUI + '\n      <div className="flex items-center justify-between mb-6">');

// 6. Replace KPI 3 (Saudi) with Period Sales Volume
db = db.replace(/সৌদি কোম্পানি পাওনা \(KSA Exposure\)/, 'পিরিয়ড ভিত্তিক মোট বিক্রি (Period Sales)');
db = db.replace(/SAR \{kpis\.saudiPayableSAR\?\.toLocaleString\('en-IN'\) \|\| 0\}/, '৳ {kpis.periodSalesVolume?.toLocaleString(\'en-IN\') || 0}');
db = db.replace(/≈ ৳ \{Math\.round\(kpis\.saudiPayableBDT \|\| 0\)\.toLocaleString\('en-IN'\)\} \(Rate: 32\.50 BDT\)/, 'Total Sales in selected period');
// Also change the onClick link for this card to report-flow so it goes to daily flow for period sales
db = db.replace("onClick={() => setActiveTab('report-ksa')}", "onClick={() => setActiveTab('report-flow')}");


fs.writeFileSync('e:/TravelLedger/client/src/components/Dashboard.jsx', db, 'utf8');
console.log('Dashboard updated.');
