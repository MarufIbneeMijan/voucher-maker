import React, { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  FileEdit, 
  Building, 
  Palmtree, 
  Hotel, 
  Bus, 
  Receipt, 
  CreditCard, 
  CheckCircle, 
  ChevronDown, 
  ChevronUp,
  MapPin,
  Calendar,
  Wallet,
  Sparkles
} from 'lucide-react';
import { formatCurrency, formatSAR } from '../utils/formatters';
import BottomCalculatorDock from './BottomCalculatorDock';

// Strict Zod Validation Schema
export const voucherSchema = z.object({
  bdAgent: z.string().min(1, "Please select a sub-agent"),
  saudiAgent: z.string().min(1, "Please select a Saudi supplier"),
  passengerRef: z.string().optional(),
  date: z.string().min(1, "Travel date is required"),
  globalExchangeRate: z.coerce.number().min(1).default(32.5),

  // Visa
  visaType: z.string().default('Umrah Visa'),
  visaPax: z.coerce.number().min(0).default(0),
  visaCostSAR: z.coerce.number().min(0).default(0),
  visaRate: z.coerce.number().min(1).default(32.5),

  // Makkah Hotel
  makkahHotelName: z.string().optional(),
  makkahRoomType: z.string().default('Quad'),
  makkahCheckIn: z.string().optional(),
  makkahCheckOut: z.string().optional(),
  makkahNights: z.coerce.number().min(0).default(0),
  makkahBookingRef: z.string().optional(),
  makkahCostSAR: z.coerce.number().min(0).default(0),
  makkahRate: z.coerce.number().min(1).default(32.5),

  // Madinah Hotel
  madinahHotelName: z.string().optional(),
  madinahRoomType: z.string().default('Quad'),
  madinahCheckIn: z.string().optional(),
  madinahCheckOut: z.string().optional(),
  madinahNights: z.coerce.number().min(0).default(0),
  madinahBookingRef: z.string().optional(),
  madinahCostSAR: z.coerce.number().min(0).default(0),
  madinahRate: z.coerce.number().min(1).default(32.5),

  // BRN & CRN
  makkahBrnCode: z.string().optional(),
  makkahBrnDays: z.coerce.number().min(0).default(0),
  makkahBrnCostSAR: z.coerce.number().min(0).default(0),
  madinahBrnCode: z.string().optional(),
  madinahBrnDays: z.coerce.number().min(0).default(0),
  madinahBrnCostSAR: z.coerce.number().min(0).default(0),
  crnCostSAR: z.coerce.number().min(0).default(0),
  brnRate: z.coerce.number().min(1).default(32.5),

  // Transport & Fines
  routeSector: z.string().default('Jeddah - Makkah - Madinah'),
  vehicleType: z.string().default('Bus'),
  transportCostSAR: z.coerce.number().min(0).default(0),
  penaltyCostSAR: z.coerce.number().min(0).default(0),
  transportRate: z.coerce.number().min(1).default(32.5),

  // Settlement & Immediate Payments
  nowPaying: z.coerce.number().min(0).default(0),
  paymentMode: z.string().default('Cash (BDT)'),
  trxId: z.string().optional(),
  note: z.string().optional()
});

export default function DataEntryForm({ 
  agents = [], 
  showToast, 
  onEntryCreated, 
  editingVoucher, 
  onCancelEdit, 
  user 
}) {
  const bdAgents = useMemo(() => (agents || []).filter((a) => a.type === 'BD_AGENT'), [agents]);
  const saudiAgents = useMemo(() => (agents || []).filter((a) => a.type === 'SAUDI_AGENT'), [agents]);

  // Accordion Section Visibility
  const [openSections, setOpenSections] = useState({
    visa: true,
    hotel: true,
    transport: true,
    brnCharge: true,
    payment: true
  });

  const toggleSection = (key) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // React Hook Form Setup
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(voucherSchema),
    defaultValues: {
      bdAgent: '',
      saudiAgent: '',
      passengerRef: '',
      date: new Date().toISOString().split('T')[0],
      globalExchangeRate: 32.5,

      visaType: 'Umrah Visa',
      visaPax: 0,
      visaCostSAR: 0,
      visaRate: 32.5,

      makkahHotelName: 'Makkah Clock Tower Hotel',
      makkahRoomType: 'Quad',
      makkahCheckIn: '',
      makkahCheckOut: '',
      makkahNights: 0,
      makkahBookingRef: '',
      makkahCostSAR: 0,
      makkahRate: 32.5,

      madinahHotelName: 'Pullman Zamzam Madinah',
      madinahRoomType: 'Quad',
      madinahCheckIn: '',
      madinahCheckOut: '',
      madinahNights: 0,
      madinahBookingRef: '',
      madinahCostSAR: 0,
      madinahRate: 32.5,

      routeSector: 'Jeddah - Makkah - Madinah',
      vehicleType: 'Bus',
      transportCostSAR: 0,
      penaltyCostSAR: 0,
      transportRate: 32.5,

      makkahBrnCode: '',
      makkahBrnDays: 0,
      makkahBrnCostSAR: 0,
      madinahBrnCode: '',
      madinahBrnDays: 0,
      madinahBrnCostSAR: 0,
      crnCostSAR: 0,
      brnRate: 32.5,

      nowPaying: 0,
      paymentMode: 'Cash (BDT)',
      trxId: '',
      note: ''
    }
  });

  // Watch form fields live to derive HUD values
  const formValues = watch();

  // Pre-select first available agents when loaded
  useEffect(() => {
    if (!editingVoucher) {
      if (bdAgents.length > 0 && !formValues.bdAgent) {
        setValue('bdAgent', bdAgents[0]._id || bdAgents[0].id || '');
      }
      if (saudiAgents.length > 0 && !formValues.saudiAgent) {
        setValue('saudiAgent', saudiAgents[0]._id || saudiAgents[0].id || '');
      }
    }
  }, [bdAgents, saudiAgents, editingVoucher, formValues.bdAgent, formValues.saudiAgent, setValue]);

  // Synchronize Hotel Nights automatically when check-in & check-out dates change
  useEffect(() => {
    if (formValues.makkahCheckIn && formValues.makkahCheckOut) {
      const d1 = new Date(formValues.makkahCheckIn);
      const d2 = new Date(formValues.makkahCheckOut);
      const diffDays = Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays > 0 && diffDays !== Number(formValues.makkahNights)) {
        setValue('makkahNights', diffDays);
      }
    }
  }, [formValues.makkahCheckIn, formValues.makkahCheckOut, formValues.makkahNights, setValue]);

  useEffect(() => {
    if (formValues.madinahCheckIn && formValues.madinahCheckOut) {
      const d1 = new Date(formValues.madinahCheckIn);
      const d2 = new Date(formValues.madinahCheckOut);
      const diffDays = Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays > 0 && diffDays !== Number(formValues.madinahNights)) {
        setValue('madinahNights', diffDays);
      }
    }
  }, [formValues.madinahCheckIn, formValues.madinahCheckOut, formValues.madinahNights, setValue]);

  // Populate fields if in Edit Mode
  useEffect(() => {
    if (editingVoucher) {
      const b = editingVoucher.breakdown || {};
      reset({
        bdAgent: editingVoucher.bdAgentId || editingVoucher.bdAgent || '',
        saudiAgent: editingVoucher.saudiAgentId || editingVoucher.saudiAgent || '',
        passengerRef: editingVoucher.passengerRef || '',
        date: editingVoucher.date ? editingVoucher.date.split('T')[0] : new Date().toISOString().split('T')[0],
        globalExchangeRate: b.umrahVisa?.rate || 32.5,

        visaType: b.umrahVisa?.type || 'Umrah Visa',
        visaPax: b.umrahVisa?.pax || 0,
        visaCostSAR: b.umrahVisa?.costSAR || 0,
        visaRate: b.umrahVisa?.rate || 32.5,

        makkahHotelName: b.hotel?.makkah?.hotelName || '',
        makkahRoomType: b.hotel?.makkah?.roomType || 'Quad',
        makkahCheckIn: b.hotel?.makkah?.checkIn ? b.hotel.makkah.checkIn.split('T')[0] : '',
        makkahCheckOut: b.hotel?.makkah?.checkOut ? b.hotel.makkah.checkOut.split('T')[0] : '',
        makkahNights: b.hotel?.makkah?.nights || 0,
        makkahBookingRef: b.hotel?.makkah?.bookingRef || '',
        makkahCostSAR: b.hotel?.makkah?.costSAR || 0,
        makkahRate: b.hotel?.rate || 32.5,

        madinahHotelName: b.hotel?.madinah?.hotelName || '',
        madinahRoomType: b.hotel?.madinah?.roomType || 'Quad',
        madinahCheckIn: b.hotel?.madinah?.checkIn ? b.hotel.madinah.checkIn.split('T')[0] : '',
        madinahCheckOut: b.hotel?.madinah?.checkOut ? b.hotel.madinah.checkOut.split('T')[0] : '',
        madinahNights: b.hotel?.madinah?.nights || 0,
        madinahBookingRef: b.hotel?.madinah?.bookingRef || '',
        madinahCostSAR: b.hotel?.madinah?.costSAR || 0,
        madinahRate: b.hotel?.rate || 32.5,

        routeSector: b.transport?.details?.route || 'Jeddah - Makkah - Madinah',
        vehicleType: b.transport?.details?.vehicleType || 'Bus',
        transportCostSAR: b.transport?.costSAR || 0,
        penaltyCostSAR: b.naqabaFine?.costSAR || 0,
        transportRate: b.transport?.rate || 32.5,

        makkahBrnCode: b.brnCharge?.makkah?.code || '',
        makkahBrnDays: b.brnCharge?.makkah?.days || 0,
        makkahBrnCostSAR: b.brnCharge?.makkah?.costSAR || 0,
        madinahBrnCode: b.brnCharge?.madinah?.code || '',
        madinahBrnDays: b.brnCharge?.madinah?.days || 0,
        madinahBrnCostSAR: b.brnCharge?.madinah?.costSAR || 0,
        crnCostSAR: b.crnCharge?.costSAR || 0,
        brnRate: b.brnCharge?.rate || 32.5,

        nowPaying: editingVoucher.nowPaying || editingVoucher.paymentReceived?.amountBDT || 0,
        paymentMode: editingVoucher.paymentDetails?.mode || editingVoucher.paymentReceived?.mode || 'Cash (BDT)',
        trxId: editingVoucher.paymentDetails?.trxId || editingVoucher.paymentReceived?.trxId || '',
        note: editingVoucher.note || ''
      });
    }
  }, [editingVoucher, reset]);

  // Dynamic Line-Items Derivation for the BottomCalculatorDock
  const activeItems = useMemo(() => {
    const list = [];
    const gRate = Number(formValues.globalExchangeRate) || 32.5;

    // 1. Visa calculation
    const vPax = Number(formValues.visaPax) || 0;
    const vCost = Number(formValues.visaCostSAR) || 0;
    const vRate = Number(formValues.visaRate) || gRate;
    const visaBDT = vPax * vCost * vRate;
    if (visaBDT > 0) {
      list.push({
        id: 'visa',
        name: formValues.visaType || 'Umrah Visa',
        detail: `${vPax} Pax @ SAR ${vCost} (Rate: ${vRate})`,
        amountBDT: visaBDT
      });
    }

    // 2. Makkah Hotel
    const mkNights = Number(formValues.makkahNights) || 0;
    const mkCost = Number(formValues.makkahCostSAR) || 0;
    const mkRate = Number(formValues.makkahRate) || gRate;
    const makkahBDT = mkNights * mkCost * mkRate;
    if (makkahBDT > 0) {
      list.push({
        id: 'makkah-hotel',
        name: `Makkah Hotel (${formValues.makkahHotelName || 'Hotel'})`,
        detail: `${mkNights} Nights (${formValues.makkahRoomType || 'Room'}) @ SAR ${mkCost}`,
        amountBDT: makkahBDT
      });
    }

    // 3. Madinah Hotel
    const mdNights = Number(formValues.madinahNights) || 0;
    const mdCost = Number(formValues.madinahCostSAR) || 0;
    const mdRate = Number(formValues.madinahRate) || gRate;
    const madinahBDT = mdNights * mdCost * mdRate;
    if (madinahBDT > 0) {
      list.push({
        id: 'madinah-hotel',
        name: `Madinah Hotel (${formValues.madinahHotelName || 'Hotel'})`,
        detail: `${mdNights} Nights (${formValues.madinahRoomType || 'Room'}) @ SAR ${mdCost}`,
        amountBDT: madinahBDT
      });
    }

    // 4. Makkah BRN
    const mkBrnDays = Number(formValues.makkahBrnDays) || 0;
    const mkBrnCost = Number(formValues.makkahBrnCostSAR) || 0;
    const brnRate = Number(formValues.brnRate) || gRate;
    const makkahBrnBDT = mkBrnDays * mkBrnCost * brnRate;
    if (makkahBrnBDT > 0) {
      list.push({
        id: 'makkah-brn',
        name: 'Makkah BRN',
        detail: `${mkBrnDays} Days @ SAR ${mkBrnCost}`,
        amountBDT: makkahBrnBDT
      });
    }

    // 5. Madinah BRN
    const mdBrnDays = Number(formValues.madinahBrnDays) || 0;
    const mdBrnCost = Number(formValues.madinahBrnCostSAR) || 0;
    const madinahBrnBDT = mdBrnDays * mdBrnCost * brnRate;
    if (madinahBrnBDT > 0) {
      list.push({
        id: 'madinah-brn',
        name: 'Madinah BRN',
        detail: `${mdBrnDays} Days @ SAR ${mdBrnCost}`,
        amountBDT: madinahBrnBDT
      });
    }

    // 6. CRN Charges
    const crnCost = Number(formValues.crnCostSAR) || 0;
    const crnBDT = crnCost * brnRate;
    if (crnBDT > 0) {
      list.push({
        id: 'crn',
        name: 'CRN Charges',
        detail: `SAR ${crnCost} @ ${brnRate}`,
        amountBDT: crnBDT
      });
    }

    // 7. Transport
    const transCost = Number(formValues.transportCostSAR) || 0;
    const transRate = Number(formValues.transportRate) || gRate;
    const transportBDT = transCost * transRate;
    if (transportBDT > 0) {
      list.push({
        id: 'transport',
        name: 'Transport Service',
        detail: `${formValues.routeSector || 'Sector'} (${formValues.vehicleType || 'Vehicle'})`,
        amountBDT: transportBDT
      });
    }

    // 8. Penalties / Fines
    const penCost = Number(formValues.penaltyCostSAR) || 0;
    const penaltyBDT = penCost * transRate;
    if (penaltyBDT > 0) {
      list.push({
        id: 'penalty',
        name: 'Penalties / Naqaba Charges',
        detail: `SAR ${penCost} @ ${transRate}`,
        amountBDT: penaltyBDT
      });
    }

    return list;
  }, [formValues]);

  // Simplified Pure Voucher Arithmetic: Total Bill = Total Active Services
  const servicesTotal = useMemo(() => activeItems.reduce((acc, curr) => acc + curr.amountBDT, 0), [activeItems]);
  const totalBillable = servicesTotal;
  const netBalance = totalBillable - (Number(formValues.nowPaying) || 0);

  // Form Submission Handler
  const onFormSubmit = async (data) => {
    try {
      const dueAdjustment = Number(data?.dueAdjustment || 0);
      const gRate = Number(data.globalExchangeRate) || 32.5;
      const vPax = Number(data.visaPax) || 0;
      const vCost = Number(data.visaCostSAR) || 0;
      const vRate = Number(data.visaRate) || gRate;
      const visaBDT = vPax * vCost * vRate;

      const mkNights = Number(data.makkahNights) || 0;
      const mkCost = Number(data.makkahCostSAR) || 0;
      const mkRate = Number(data.makkahRate) || gRate;
      const makkahBDT = mkNights * mkCost * mkRate;

      const mdNights = Number(data.madinahNights) || 0;
      const mdCost = Number(data.madinahCostSAR) || 0;
      const mdRate = Number(data.madinahRate) || gRate;
      const madinahBDT = mdNights * mdCost * mdRate;

      const transCost = Number(data.transportCostSAR) || 0;
      const transRate = Number(data.transportRate) || gRate;
      const transportBDT = transCost * transRate;

      const penCost = Number(data.penaltyCostSAR) || 0;
      const penaltyBDT = penCost * transRate;

      const mkBrnDays = Number(data.makkahBrnDays) || 0;
      const mkBrnCost = Number(data.makkahBrnCostSAR) || 0;
      const brnRate = Number(data.brnRate) || gRate;
      const makkahBrnBDT = mkBrnDays * mkBrnCost * brnRate;

      const mdBrnDays = Number(data.madinahBrnDays) || 0;
      const mdBrnCost = Number(data.madinahBrnCostSAR) || 0;
      const madinahBrnBDT = mdBrnDays * mdBrnCost * brnRate;

      const crnCost = Number(data.crnCostSAR) || 0;
      const crnBDT = crnCost * brnRate;

      const sTotal = visaBDT + makkahBDT + madinahBDT + transportBDT + penaltyBDT + makkahBrnBDT + madinahBrnBDT + crnBDT;
      const tBillable = sTotal;
      const nPaying = Number(data.nowPaying) || 0;
      const nBalance = tBillable - nPaying;

      const payload = {
        bdAgentId: data.bdAgent,
        saudiAgentId: data.saudiAgent,
        date: data.date,
        passengerRef: data.passengerRef || '',
        dueAdjustment: 0,
        nowPaying: nPaying,
        breakdown: {
          umrahVisa: {
            type: data.visaType,
            pax: vPax,
            costSAR: vCost,
            rate: vRate,
            totalBDT: visaBDT
          },
          hotel: {
            makkah: {
              hotelName: data.makkahHotelName || '',
              roomType: data.makkahRoomType || 'Quad',
              checkIn: data.makkahCheckIn || null,
              checkOut: data.makkahCheckOut || null,
              nights: mkNights,
              bookingRef: data.makkahBookingRef || '',
              costSAR: mkCost,
              totalBDT: makkahBDT
            },
            madinah: {
              hotelName: data.madinahHotelName || '',
              roomType: data.madinahRoomType || 'Quad',
              checkIn: data.madinahCheckIn || null,
              checkOut: data.madinahCheckOut || null,
              nights: mdNights,
              bookingRef: data.madinahBookingRef || '',
              costSAR: mdCost,
              totalBDT: madinahBDT
            },
            totalSAR: mkCost + mdCost,
            rate: gRate,
            totalBDT: makkahBDT + madinahBDT
          },
          transport: {
            costSAR: transCost,
            rate: transRate,
            totalBDT: transportBDT,
            details: { route: data.routeSector, vehicleType: data.vehicleType }
          },
          naqabaFine: {
            costSAR: penCost,
            rate: transRate,
            totalBDT: penaltyBDT,
            details: {}
          },
          brnCharge: {
            makkah: {
              code: data.makkahBrnCode || '',
              days: mkBrnDays,
              costSAR: mkBrnCost
            },
            madinah: {
              code: data.madinahBrnCode || '',
              days: mdBrnDays,
              costSAR: mdBrnCost
            },
            totalSAR: mkBrnCost + mdBrnCost,
            rate: brnRate,
            totalBDT: makkahBrnBDT + madinahBrnBDT
          },
          crnCharge: {
            costSAR: crnCost,
            rate: brnRate,
            totalBDT: crnBDT
          },
          escapedFine: {
            costSAR: 0,
            rate: gRate,
            totalBDT: 0,
            details: {}
          },
          previousDues: 0
        },
        paymentReceived: {
          mode: data.paymentMode,
          amountSAR: 0,
          amountBDT: nPaying,
          trxId: data.trxId || ''
        },
        totals: {
          grossAmountSAR: 0,
          grossAmountBDT: tBillable,
          servicesTotalBDT: sTotal,
          paidAmountBDT: nPaying,
          netDueAdded: Math.max(0, nBalance),
          dueAdjustment: 0,
          totalBillable: tBillable
        },
        note: data.note || ''
      };

      const isEditing = Boolean(editingVoucher);
      const url = isEditing
        ? `/api/entries/batch/${editingVoucher.voucherNo || editingVoucher.id}`
        : '/api/entries/batch';

      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const resData = await res.json();
      if (resData.success) {
        showToast(
          isEditing 
            ? `Voucher ${editingVoucher.voucherNo || editingVoucher.id} updated successfully!` 
            : `Voucher created successfully! (${resData.voucherNo || 'New Voucher'})`,
          'success'
        );
        reset();
        if (onCancelEdit) onCancelEdit();
        if (onEntryCreated) onEntryCreated();
      } else {
        showToast(resData.message || 'Error saving billing voucher', 'error');
      }
    } catch (err) {
      showToast('Server connection error', 'error');
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-36 px-3 sm:px-4">
      {/* Edit Mode Alert Banner */}
      {editingVoucher && (
        <div className="bg-amber-500 text-slate-950 p-4 rounded-2xl font-bold flex items-center justify-between shadow-md">
          <div className="flex items-center space-x-2">
            <FileEdit className="w-5 h-5 stroke-current" />
            <span>Editing Voucher: Modifying {editingVoucher.voucherNo || editingVoucher.id}</span>
          </div>
          <button
            type="button"
            onClick={onCancelEdit}
            className="px-3.5 py-1.5 bg-slate-900 text-white rounded-xl text-xs hover:bg-slate-800 transition cursor-pointer font-bold"
          >
            Cancel Edit
          </button>
        </div>
      )}

      {/* Main Header Banner */}
      <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md p-6 rounded-3xl shadow-sm border border-slate-200/80 dark:border-zinc-800/80 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
              <FileEdit className="w-5 h-5 stroke-[2]" />
            </div>
            <span>BD Sub-Agency Batch Billing Voucher Engine</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
            Create and manage B2B billing vouchers with live itemized calculation
          </p>
        </div>
        <div className="flex items-center space-x-2 bg-slate-100 dark:bg-zinc-800 text-teal-600 dark:text-teal-400 font-mono text-xs px-4 py-2 rounded-2xl border border-slate-200 dark:border-zinc-700 font-bold self-start sm:self-auto">
          <Sparkles className="w-3.5 h-3.5" />
          <span>1 SAR = {formValues.globalExchangeRate || 32.5} BDT</span>
        </div>
      </div>

      {/* Single-Column Centered Form */}
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">

        {/* SECTION 1: TOP AGENCY SELECTION & METADATA */}
        <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md rounded-3xl border border-slate-200/80 dark:border-zinc-800/80 p-6 shadow-sm space-y-4">
          <h2 className="text-xs font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wider border-b border-slate-100 dark:border-zinc-800 pb-3 flex items-center space-x-2">
            <Building className="w-4 h-4 text-teal-600 dark:text-teal-400 stroke-[2]" />
            <span>1. Agency & Voucher Details</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Select BD Sub-Agency */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
                Select Sub-Agent *
              </label>
              <select
                {...register('bdAgent')}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/50 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-semibold text-xs text-slate-800 dark:text-zinc-100"
              >
                <option value="">-- Select Sub-Agent --</option>
                {bdAgents.map((a) => {
                  const idVal = a._id || a.id;
                  return (
                    <option key={idVal} value={idVal}>
                      {a.name} ({a.agencyCode}) - Current Balance: {formatCurrency(a.currentBalance || 0)}
                    </option>
                  );
                })}
              </select>
              {errors.bdAgent && (
                <p className="text-[11px] text-rose-500 font-semibold mt-1">{errors.bdAgent.message}</p>
              )}
            </div>

            {/* Select Saudi Supplier */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
                Saudi Supplier *
              </label>
              <select
                {...register('saudiAgent')}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/50 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-semibold text-xs text-slate-800 dark:text-zinc-100"
              >
                <option value="">-- Select Saudi Supplier --</option>
                {saudiAgents.map((a) => {
                  const idVal = a._id || a.id;
                  return (
                    <option key={idVal} value={idVal}>
                      {a.name} ({a.agencyCode})
                    </option>
                  );
                })}
              </select>
              {errors.saudiAgent && (
                <p className="text-[11px] text-rose-500 font-semibold mt-1">{errors.saudiAgent.message}</p>
              )}
            </div>

            {/* Entry / Travel Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
                Travel Date *
              </label>
              <input
                type="date"
                {...register('date')}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/50 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium text-xs text-slate-800 dark:text-zinc-100"
              />
              {errors.date && (
                <p className="text-[11px] text-rose-500 font-semibold mt-1">{errors.date.message}</p>
              )}
            </div>

            {/* Passenger / Group Reference */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
                Passenger / Group Name
              </label>
              <input
                type="text"
                {...register('passengerRef')}
                placeholder="e.g. MD RAHIM & 5 PAX GROUP"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/50 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium text-xs text-slate-800 dark:text-zinc-100 placeholder:text-slate-400"
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: UMRAH VISA CHARGES */}
        <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md rounded-3xl border border-slate-200/80 dark:border-zinc-800/80 shadow-sm overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('visa')}
            className="w-full p-5 flex items-center justify-between bg-slate-50/50 dark:bg-zinc-800/40 hover:bg-slate-100/60 dark:hover:bg-zinc-800/60 transition cursor-pointer"
          >
            <div className="flex items-center space-x-2.5">
              <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400">
                <Palmtree className="w-4 h-4 stroke-[2]" />
              </div>
              <span className="font-bold text-sm text-slate-800 dark:text-zinc-100">2. Umrah Visa</span>
            </div>
            {openSections.visa ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {openSections.visa && (
            <div className="p-6 space-y-4 border-t border-slate-100 dark:border-zinc-800">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">Visa Category</label>
                  <select
                    {...register('visaType')}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/50 text-xs font-semibold"
                  >
                    <option value="Umrah Visa">Umrah Visa</option>
                    <option value="Saudi Tourist / Multiple Visa">Saudi Tourist / Multiple Visa</option>
                    <option value="Family Visit Visa">Family Visit Visa</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">Number of Visas (Pax)</label>
                  <input
                    type="number"
                    min="0"
                    {...register('visaPax')}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/50 text-xs font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">Cost in SAR (Per Pax)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    {...register('visaCostSAR')}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/50 text-xs font-mono font-bold"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* SECTION 3: HOTEL BOOKINGS (MAKKAH & MADINAH) */}
        <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md rounded-3xl border border-slate-200/80 dark:border-zinc-800/80 shadow-sm overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('hotel')}
            className="w-full p-5 flex items-center justify-between bg-slate-50/50 dark:bg-zinc-800/40 hover:bg-slate-100/60 dark:hover:bg-zinc-800/60 transition cursor-pointer"
          >
            <div className="flex items-center space-x-2.5">
              <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400">
                <Hotel className="w-4 h-4 stroke-[2]" />
              </div>
              <span className="font-bold text-sm text-slate-800 dark:text-zinc-100">3. Hotel Bookings (Makkah & Madinah)</span>
            </div>
            {openSections.hotel ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {openSections.hotel && (
            <div className="p-6 space-y-6 border-t border-slate-100 dark:border-zinc-800">
              {/* Makkah Hotel Block */}
              <div className="p-4 rounded-2xl bg-teal-50/30 dark:bg-zinc-800/30 border border-teal-500/10 space-y-3">
                <h3 className="text-xs font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wide flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" /> Makkah Hotel Booking
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-zinc-300 mb-1">Hotel Name</label>
                    <input
                      type="text"
                      {...register('makkahHotelName')}
                      placeholder="e.g. Makkah Clock Tower Hotel"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-zinc-300 mb-1">Room Type</label>
                    <select
                      {...register('makkahRoomType')}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-semibold"
                    >
                      <option value="Single">Single</option>
                      <option value="Double">Double</option>
                      <option value="Triple">Triple</option>
                      <option value="Quad">Quad</option>
                      <option value="Quint">Quint</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-zinc-300 mb-1">Total Nights</label>
                    <input
                      type="number"
                      min="0"
                      {...register('makkahNights')}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-zinc-300 mb-1">Check-in</label>
                    <input
                      type="date"
                      {...register('makkahCheckIn')}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-zinc-300 mb-1">Check-out</label>
                    <input
                      type="date"
                      {...register('makkahCheckOut')}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-zinc-300 mb-1">Total Cost (SAR)</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      {...register('makkahCostSAR')}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Madinah Hotel Block */}
              <div className="p-4 rounded-2xl bg-purple-50/30 dark:bg-zinc-800/30 border border-purple-500/10 space-y-3">
                <h3 className="text-xs font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wide flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" /> Madinah Hotel Booking
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-zinc-300 mb-1">Hotel Name</label>
                    <input
                      type="text"
                      {...register('madinahHotelName')}
                      placeholder="e.g. Pullman Zamzam Madinah"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-zinc-300 mb-1">Room Type</label>
                    <select
                      {...register('madinahRoomType')}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-semibold"
                    >
                      <option value="Single">Single</option>
                      <option value="Double">Double</option>
                      <option value="Triple">Triple</option>
                      <option value="Quad">Quad</option>
                      <option value="Quint">Quint</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-zinc-300 mb-1">Total Nights</label>
                    <input
                      type="number"
                      min="0"
                      {...register('madinahNights')}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-zinc-300 mb-1">Check-in</label>
                    <input
                      type="date"
                      {...register('madinahCheckIn')}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-zinc-300 mb-1">Check-out</label>
                    <input
                      type="date"
                      {...register('madinahCheckOut')}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-zinc-300 mb-1">Total Cost (SAR)</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      {...register('madinahCostSAR')}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-mono font-bold"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* SECTION 4: BRN & CRN CHARGES */}
        <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md rounded-3xl border border-slate-200/80 dark:border-zinc-800/80 shadow-sm overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('brnCharge')}
            className="w-full p-5 flex items-center justify-between bg-slate-50/50 dark:bg-zinc-800/40 hover:bg-slate-100/60 dark:hover:bg-zinc-800/60 transition cursor-pointer"
          >
            <div className="flex items-center space-x-2.5">
              <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400">
                <Receipt className="w-4 h-4 stroke-[2]" />
              </div>
              <span className="font-bold text-sm text-slate-800 dark:text-zinc-100">4. BRN & CRN Charges</span>
            </div>
            {openSections.brnCharge ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {openSections.brnCharge && (
            <div className="p-6 space-y-4 border-t border-slate-100 dark:border-zinc-800">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">Makkah BRN (SAR)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    {...register('makkahBrnCostSAR')}
                    placeholder="SAR Amount"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/50 text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">Madinah BRN (SAR)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    {...register('madinahBrnCostSAR')}
                    placeholder="SAR Amount"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/50 text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">CRN Charges (SAR)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    {...register('crnCostSAR')}
                    placeholder="SAR Amount"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/50 text-xs font-mono font-bold"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* SECTION 5: TRANSPORT & PENALTIES */}
        <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md rounded-3xl border border-slate-200/80 dark:border-zinc-800/80 shadow-sm overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('transport')}
            className="w-full p-5 flex items-center justify-between bg-slate-50/50 dark:bg-zinc-800/40 hover:bg-slate-100/60 dark:hover:bg-zinc-800/60 transition cursor-pointer"
          >
            <div className="flex items-center space-x-2.5">
              <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400">
                <Bus className="w-4 h-4 stroke-[2]" />
              </div>
              <span className="font-bold text-sm text-slate-800 dark:text-zinc-100">5. Transport & Naqaba Charges</span>
            </div>
            {openSections.transport ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {openSections.transport && (
            <div className="p-6 space-y-4 border-t border-slate-100 dark:border-zinc-800">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">Transport Cost (SAR)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    {...register('transportCostSAR')}
                    placeholder="0.00"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/50 text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">Penalties / Extra Fees (SAR)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    {...register('penaltyCostSAR')}
                    placeholder="0.00"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/50 text-xs font-mono font-bold"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* SECTION 6: PAYMENT COLLECTION (NO PREVIOUS DUE INPUT) */}
        <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md rounded-3xl border border-slate-200/80 dark:border-zinc-800/80 shadow-sm p-6 space-y-4">
          <h2 className="text-xs font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wider border-b border-slate-100 dark:border-zinc-800 pb-3 flex items-center space-x-2">
            <Wallet className="w-4 h-4 text-teal-600 dark:text-teal-400 stroke-[2]" />
            <span>6. Payment Collection</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
                Amount Paying Now (BDT)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                {...register('nowPaying')}
                placeholder="0.00"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/50 text-xs font-mono font-bold text-teal-600 dark:text-teal-400"
              />
              <p className="text-[11px] text-slate-400 mt-1">Leave 0 if unpaid, or enter immediate payment amount</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">Payment Method</label>
              <select
                {...register('paymentMode')}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/50 text-xs font-semibold"
              >
                <option value="Cash (BDT)">Cash (BDT)</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="bKash / Nagad / MFS">bKash / Nagad / MFS</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">Transaction ID / Reference Note</label>
              <input
                type="text"
                {...register('trxId')}
                placeholder="TRX-123456 or Bank Ref"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/50 text-xs font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">Voucher Remarks / Notes</label>
              <input
                type="text"
                {...register('note')}
                placeholder="Sub-agency batch remarks or audit note"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/50 text-xs font-medium"
              />
            </div>
          </div>
        </div>

        {/* Dedicated Bottom Dock */}
        <BottomCalculatorDock 
          items={activeItems}
          servicesTotal={servicesTotal}
          totalBillable={totalBillable}
          nowPaying={Number(formValues.nowPaying) || 0}
          netBalance={netBalance}
          onSubmit={handleSubmit(onFormSubmit)}
          isSubmitting={isSubmitting}
          editingVoucher={editingVoucher}
        />
      </form>
    </div>
  );
}
