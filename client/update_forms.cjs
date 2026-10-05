const fs = require('fs');

let def = fs.readFileSync('e:/TravelLedger/client/src/components/DataEntryForm.jsx', 'utf8');
def = def.replace('export default function DataEntryForm({ selectedAgent, refreshTrigger, showToast }) {', 'export default function DataEntryForm({ selectedAgent, refreshTrigger, showToast, user }) {');
def = def.replace('const payload = {', 'const payload = {\n      createdBy: user?.username || \'admin\',');
fs.writeFileSync('e:/TravelLedger/client/src/components/DataEntryForm.jsx', def, 'utf8');
console.log('DataEntryForm updated');

let vm = fs.readFileSync('e:/TravelLedger/client/src/components/VoucherModal.jsx', 'utf8');
const signatureHtml = `
          {/* Signatures & Metadata */}
          <div className="mt-8 pt-4 border-t border-slate-200 grid grid-cols-2 text-[10px] text-slate-500">
            <div>
              <p>Prepared & Cleared By: <span className="font-bold text-slate-800">{voucher.createdBy || 'admin'}</span></p>
              <p>Print Date & Time: {new Date().toLocaleString('en-GB')}</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-teal-800 uppercase tracking-widest">Arafa Hafiz Ltd.</p>
              <p>Digital Verification Stamp</p>
            </div>
          </div>
`;
vm = vm.replace('{/* End of Printable Invoice */}', signatureHtml + '\n          {/* End of Printable Invoice */}');
fs.writeFileSync('e:/TravelLedger/client/src/components/VoucherModal.jsx', vm, 'utf8');
console.log('VoucherModal updated');
