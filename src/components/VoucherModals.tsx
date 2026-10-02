import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  UserPlus,
  ShoppingBag,
  Sparkles,
  CheckCircle2,
  Calendar,
  Wallet,
  Receipt,
  PackagePlus,
  Lock,
} from 'lucide-react';
import {
  Booking,
  BookingLineItem,
  CatalogItem,
  Customer,
  Purchase,
  Sale,
  StaffMember,
  Supplier,
} from '../types.ts';
import { formatTZS } from '../utils/format.ts';

interface SaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  catalog: CatalogItem[];
  customers: Customer[];
  staff: StaffMember[];
  defaultStaffName: string;
  initialItemId?: number | null;
  onSubmitSale: (payload: any) => Promise<void>;
  onQuickCreateCustomer: (payload: { name: string; phone: string; email: string }) => Promise<Customer>;
  isDark: boolean;
}

export const SaleVoucherModal: React.FC<SaleModalProps> = ({
  isOpen,
  onClose,
  catalog,
  customers,
  staff,
  defaultStaffName,
  initialItemId,
  onSubmitSale,
  onQuickCreateCustomer,
  isDark,
}) => {
  const today = new Date().toISOString().split('T')[0];
  const [saleDate, setSaleDate] = useState(today);
  const [customerId, setCustomerId] = useState<string>('');
  const [staffName, setStaffName] = useState(defaultStaffName);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mobile_money' | 'card' | 'credit'>('cash');
  const [amountPaid, setAmountPaid] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<Array<{ itemId: number; quantity: number; unitPrice: number }>>([]);

  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      const active = catalog.filter((c) => !c.isDeleted);
      const chosen =
        (initialItemId ? active.find((c) => c.id === initialItemId) : null) || active[0];
      if (chosen) {
        setLines([{ itemId: chosen.id, quantity: 1, unitPrice: Number(chosen.sellingPrice) }]);
      }
      setStaffName(defaultStaffName);
      setError('');
    }
  }, [isOpen, initialItemId, catalog, defaultStaffName]);

  if (!isOpen) return null;

  const activeCatalog = catalog.filter((c) => !c.isDeleted);
  const totalAmount = lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);
  const effectivePaid =
    paymentMethod === 'credit'
      ? Math.min(totalAmount, Math.max(0, Number(amountPaid || 0)))
      : totalAmount;
  const balanceDue = Math.max(0, totalAmount - effectivePaid);

  const handleAddLine = (filterType?: 'product' | 'service') => {
    const candidate =
      activeCatalog.find((c) => (filterType ? c.itemType === filterType : true)) || activeCatalog[0];
    if (!candidate) return;
    setLines((prev) => [
      ...prev,
      { itemId: candidate.id, quantity: 1, unitPrice: Number(candidate.sellingPrice) },
    ]);
  };

  const handleItemChange = (index: number, newItemId: number) => {
    const found = activeCatalog.find((c) => c.id === newItemId);
    if (!found) return;
    setLines((prev) =>
      prev.map((l, idx) =>
        idx === index ? { ...l, itemId: found.id, unitPrice: Number(found.sellingPrice) } : l
      )
    );
  };

  const handleCreateQuickCustomer = async () => {
    if (!newCustName.trim()) return;
    try {
      const created = await onQuickCreateCustomer({
        name: newCustName.trim(),
        phone: newCustPhone.trim(),
        email: '',
      });
      setCustomerId(String(created.id));
      setNewCustName('');
      setNewCustPhone('');
      setShowNewCustomer(false);
    } catch (e: any) {
      setError(e.message || 'Could not add customer');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (lines.length === 0) {
      setError('Please add at least one product or service.');
      return;
    }
    if (paymentMethod === 'credit' && !customerId) {
      setError('Please choose or add a Customer Name when selling on Credit.');
      return;
    }
    setSubmitting(true);
    try {
      const selectedCustomer = customers.find((c) => String(c.id) === customerId);
      await onSubmitSale({
        saleDate,
        customerId: customerId ? Number(customerId) : null,
        customerName: selectedCustomer ? selectedCustomer.name : 'Walk-in Customer',
        staffName,
        paymentMethod,
        amountPaid: effectivePaid,
        notes,
        items: lines,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save sale');
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = `w-full rounded-xl border px-3.5 py-2.5 text-sm transition focus:outline-none focus:ring-2 focus:ring-emerald-500/40 ${
    isDark ? 'bg-[#0F1217] border-[#252B37] text-slate-100' : 'bg-[#FAF8F5] border-[#E8E4DD] text-slate-900'
  }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div
        className={`w-full max-w-3xl rounded-2xl border shadow-2xl overflow-hidden ${
          isDark ? 'bg-[#171B22] border-[#252B37] text-slate-100' : 'bg-white border-[#E8E4DD] text-slate-900'
        }`}
      >
        <div className="flex items-center justify-between border-b border-emerald-800 px-6 py-5 bg-emerald-700 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-xl font-semibold">Record a New Sale</h2>
              <p className="text-xs text-emerald-100">
                Sell products or services in TZS • Automatically updates your cash and stock
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 hover:bg-emerald-800 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 max-h-[82vh] overflow-y-auto space-y-6">
          {error && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-4 text-sm font-medium text-red-500">
              {error}
            </div>
          )}

          {/* Customer, Staff & Date */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-semibold">Who is buying?</label>
                <button
                  type="button"
                  onClick={() => setShowNewCustomer(!showNewCustomer)}
                  className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  {showNewCustomer ? 'Cancel' : '+ New Customer'}
                </button>
              </div>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className={inputCls}
              >
                <option value="">Walk-in Customer (Cash Sale)</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}{' '}
                    {Number(c.outstandingBalance) > 0
                      ? `(Owes ${formatTZS(c.outstandingBalance)})`
                      : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1.5">Served By (Staff)</label>
              <select
                value={staffName}
                onChange={(e) => setStaffName(e.target.value)}
                className={inputCls}
              >
                {staff.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1.5">Date of Sale</label>
              <input
                type="date"
                value={saleDate}
                onChange={(e) => setSaleDate(e.target.value)}
                className={`${inputCls} font-mono-num`}
                required
              />
            </div>
          </div>

          {showNewCustomer && (
            <div
              className={`rounded-xl border p-4 flex flex-wrap items-end gap-3 ${
                isDark
                  ? 'bg-emerald-950/20 border-emerald-800/40'
                  : 'bg-emerald-50/70 border-emerald-200'
              }`}
            >
              <div className="flex-1 min-w-[180px]">
                <label className="block text-xs font-semibold mb-1">New Customer Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Halima Mwinyi"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div className="flex-1 min-w-[150px]">
                <label className="block text-xs font-semibold mb-1">Phone Number</label>
                <input
                  type="text"
                  placeholder="+255 7..."
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  className={inputCls}
                />
              </div>
              <button
                type="button"
                onClick={handleCreateQuickCustomer}
                className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 cursor-pointer"
              >
                Save Customer
              </button>
            </div>
          )}

          {/* Items Being Sold */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-sm font-semibold">
                Items & Services Sold ({lines.length})
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleAddLine('product')}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Product
                </button>
                <button
                  type="button"
                  onClick={() => handleAddLine('service')}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 px-3.5 py-2 text-xs font-semibold text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Add Service
                </button>
              </div>
            </div>

            <div className="space-y-2.5">
              {lines.map((line, index) => {
                const selectedItem = activeCatalog.find((c) => c.id === line.itemId);
                const isService = selectedItem?.itemType === 'service';
                return (
                  <div
                    key={index}
                    className={`grid grid-cols-12 gap-3 items-center rounded-xl border p-3.5 ${
                      isDark ? 'bg-[#0F1217] border-[#252B37]' : 'bg-[#FAF8F5] border-[#E8E4DD]'
                    }`}
                  >
                    <div className="col-span-12 sm:col-span-5">
                      <label className="block text-xs opacity-65 mb-1">
                        {isService ? 'Service / Consultation' : 'Retail Product'}
                      </label>
                      <select
                        value={line.itemId}
                        onChange={(e) => handleItemChange(index, Number(e.target.value))}
                        className={`w-full rounded-lg border px-3 py-2 text-sm font-medium ${
                          isDark ? 'bg-[#171B22] border-[#252B37]' : 'bg-white border-slate-300'
                        }`}
                      >
                        <optgroup label="Retail Products">
                          {activeCatalog
                            .filter((c) => c.itemType === 'product')
                            .map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.name} ({item.currentStock} in stock) —{' '}
                                {formatTZS(item.sellingPrice)}
                              </option>
                            ))}
                        </optgroup>
                        <optgroup label="Services & Consultations">
                          {activeCatalog
                            .filter((c) => c.itemType === 'service')
                            .map((item) => (
                              <option key={item.id} value={item.id}>
                                [Service] {item.name} — {formatTZS(item.sellingPrice)}
                              </option>
                            ))}
                        </optgroup>
                      </select>
                    </div>

                    <div className="col-span-4 sm:col-span-2">
                      <label className="block text-xs opacity-65 mb-1">Qty</label>
                      <input
                        type="number"
                        min={1}
                        value={line.quantity}
                        onChange={(e) =>
                          setLines((prev) =>
                            prev.map((l, idx) =>
                              idx === index
                                ? { ...l, quantity: Math.max(1, Number(e.target.value)) }
                                : l
                            )
                          )
                        }
                        className={`w-full rounded-lg border px-3 py-2 text-sm font-mono-num text-center ${
                          isDark ? 'bg-[#171B22] border-[#252B37]' : 'bg-white border-slate-300'
                        }`}
                      />
                    </div>

                    <div className="col-span-5 sm:col-span-3">
                      <label className="block text-xs opacity-65 mb-1">Price Each (TZS)</label>
                      <input
                        type="number"
                        min={0}
                        value={line.unitPrice}
                        onChange={(e) =>
                          setLines((prev) =>
                            prev.map((l, idx) =>
                              idx === index
                                ? { ...l, unitPrice: Math.max(0, Number(e.target.value)) }
                                : l
                            )
                          )
                        }
                        className={`w-full rounded-lg border px-3 py-2 text-sm font-mono-num ${
                          isDark ? 'bg-[#171B22] border-[#252B37]' : 'bg-white border-slate-300'
                        }`}
                      />
                    </div>

                    <div className="col-span-3 sm:col-span-2 flex items-center justify-end gap-2 pt-4">
                      <span className="font-mono-num text-sm font-bold">
                        {formatTZS(line.quantity * line.unitPrice)}
                      </span>
                      {lines.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setLines((prev) => prev.filter((_, idx) => idx !== index))}
                          className="text-rose-500 hover:bg-rose-500/10 p-1.5 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Payment Method & Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2 border-t border-slate-200 dark:border-[#252B37]">
            <div className="space-y-3">
              <label className="block text-sm font-semibold">How is the customer paying?</label>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { id: 'cash', label: 'Cash (TZS)' },
                  { id: 'mobile_money', label: 'M-Pesa / Mobile' },
                  { id: 'card', label: 'Bank / POS Card' },
                  { id: 'credit', label: 'On Credit (Pay Later)' },
                ].map((pm) => (
                  <button
                    key={pm.id}
                    type="button"
                    onClick={() => setPaymentMethod(pm.id as any)}
                    className={`rounded-xl border px-3.5 py-2.5 text-sm font-semibold transition cursor-pointer ${
                      paymentMethod === pm.id
                        ? pm.id === 'credit'
                          ? 'bg-amber-600 text-white border-amber-600'
                          : 'bg-emerald-700 text-white border-emerald-700'
                        : isDark
                        ? 'bg-[#0F1217] border-[#252B37] text-slate-300'
                        : 'bg-[#FAF8F5] border-[#E8E4DD] text-slate-700'
                    }`}
                  >
                    {pm.label}
                  </button>
                ))}
              </div>

              {paymentMethod === 'credit' && (
                <div className="pt-2">
                  <label className="block text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1">
                    Deposit Paid Now (TZS) — Leave 0 if paying later
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={totalAmount}
                    placeholder="0"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    className={`${inputCls} font-mono-num`}
                  />
                </div>
              )}
            </div>

            <div
              className={`rounded-2xl border p-5 flex flex-col justify-between ${
                isDark ? 'bg-[#0F1217] border-[#252B37]' : 'bg-[#FAF8F5] border-[#E8E4DD]'
              }`}
            >
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="opacity-75">Total Bill:</span>
                  <span className="font-mono-num font-bold text-lg">{formatTZS(totalAmount)}</span>
                </div>
                <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
                  <span>Amount Paid Now:</span>
                  <span className="font-mono-num font-semibold">{formatTZS(effectivePaid)}</span>
                </div>
                {balanceDue > 0 && (
                  <div className="flex justify-between text-amber-600 dark:text-amber-400 font-semibold pt-2 border-t border-slate-200 dark:border-[#252B37]">
                    <span>Customer Still Owes:</span>
                    <span className="font-mono-num">{formatTZS(balanceDue)}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200 dark:border-[#252B37] flex items-center gap-2 text-xs opacity-70">
                <Lock className="w-3.5 h-3.5 shrink-0" />
                <span>Saved sales are locked so staff cannot alter or delete them.</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-[#252B37]">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-5 py-2.5 text-sm font-semibold border border-slate-300 dark:border-slate-700 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-emerald-700 hover:bg-emerald-800 px-6 py-2.5 text-sm font-semibold text-white shadow-sm cursor-pointer"
            >
              {submitting ? 'Saving Sale...' : `Complete Sale (${formatTZS(totalAmount)})`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// 2. PURCHASE VOUCHER MODAL
interface PurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  catalog: CatalogItem[];
  suppliers: Supplier[];
  defaultStaffName: string;
  initialReorderItems?: Array<{ itemId: number; quantity: number; unitCost: number }> | null;
  onSubmitPurchase: (payload: any) => Promise<void>;
  onQuickCreateSupplier: (payload: { name: string; phone: string; email: string }) => Promise<Supplier>;
  isDark: boolean;
}

export const PurchaseVoucherModal: React.FC<PurchaseModalProps> = ({
  isOpen,
  onClose,
  catalog,
  suppliers,
  defaultStaffName,
  initialReorderItems,
  onSubmitPurchase,
  onQuickCreateSupplier,
  isDark,
}) => {
  const today = new Date().toISOString().split('T')[0];
  const [purchaseDate, setPurchaseDate] = useState(today);
  const [supplierId, setSupplierId] = useState<string>(suppliers[0] ? String(suppliers[0].id) : '');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mobile_money' | 'bank' | 'credit'>('cash');
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'partly_paid' | 'unpaid'>('paid');
  const [amountPaid, setAmountPaid] = useState<string>('');
  const [notes, setNotes] = useState('');

  const productCatalog = catalog.filter(
    (c) => !c.isDeleted && c.itemType === 'product'
  );
  const [lines, setLines] = useState<Array<{ itemId: number; quantity: number; unitCost: number }>>(() => {
    const first = productCatalog[0];
    return first ? [{ itemId: first.id, quantity: 10, unitCost: Number(first.costPrice) }] : [];
  });

  useEffect(() => {
    if (isOpen) {
      if (initialReorderItems && initialReorderItems.length > 0) {
        setLines(initialReorderItems);
        setNotes('Low-stock reorder restock');
      } else {
        const first = productCatalog[0];
        if (first && lines.length === 0) {
          setLines([{ itemId: first.id, quantity: 10, unitCost: Number(first.costPrice) }]);
        }
      }
    }
  }, [isOpen, initialReorderItems]);

  const [showNewSupplier, setShowNewSupplier] = useState(false);
  const [newSupName, setNewSupName] = useState('');
  const [newSupPhone, setNewSupPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const totalAmount = lines.reduce((sum, l) => sum + l.quantity * l.unitCost, 0);
  const effectivePaid =
    paymentStatus === 'paid'
      ? totalAmount
      : paymentStatus === 'unpaid'
      ? 0
      : Math.min(totalAmount, Math.max(0, Number(amountPaid || 0)));
  const balanceDue = Math.max(0, totalAmount - effectivePaid);

  const handleCreateQuickSupplier = async () => {
    if (!newSupName.trim()) return;
    try {
      const created = await onQuickCreateSupplier({
        name: newSupName.trim(),
        phone: newSupPhone.trim(),
        email: '',
      });
      setSupplierId(String(created.id));
      setNewSupName('');
      setNewSupPhone('');
      setShowNewSupplier(false);
    } catch (e: any) {
      setError(e.message || 'Failed to add supplier');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (lines.length === 0) {
      setError('Add at least one product to restock.');
      return;
    }
    setSubmitting(true);
    try {
      const sup = suppliers.find((s) => String(s.id) === supplierId);
      await onSubmitPurchase({
        purchaseDate,
        supplierId: supplierId ? Number(supplierId) : null,
        supplierName: sup ? sup.name : 'General Supplier',
        staffName: defaultStaffName,
        paymentMethod,
        paymentStatus,
        amountPaid: effectivePaid,
        notes,
        items: lines,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save purchase');
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = `w-full rounded-xl border px-3.5 py-2.5 text-sm ${
    isDark ? 'bg-[#0F1217] border-[#252B37] text-slate-100' : 'bg-[#FAF8F5] border-[#E8E4DD] text-slate-900'
  }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div
        className={`w-full max-w-3xl rounded-2xl border shadow-2xl overflow-hidden ${
          isDark ? 'bg-[#171B22] border-[#252B37] text-slate-100' : 'bg-white border-[#E8E4DD] text-slate-900'
        }`}
      >
        <div className="flex items-center justify-between border-b px-6 py-5 bg-emerald-800 text-white">
          <div className="flex items-center gap-3">
            <PackagePlus className="w-6 h-6" />
            <div>
              <h2 className="font-display text-xl font-semibold">
                Restock Retail Products from Supplier
              </h2>
              <p className="text-xs text-emerald-100">
                Record supplier restock purchases to automatically increase your product stock quantities
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 hover:bg-emerald-900 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 max-h-[82vh] overflow-y-auto space-y-6">
          {error && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-500">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-semibold">Supplier</label>
                <button
                  type="button"
                  onClick={() => setShowNewSupplier(!showNewSupplier)}
                  className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                >
                  {showNewSupplier ? 'Cancel' : '+ Add New Supplier'}
                </button>
              </div>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className={inputCls}
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1.5">Purchase Date</label>
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className={`${inputCls} font-mono-num`}
                required
              />
            </div>
          </div>

          {showNewSupplier && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[180px]">
                <label className="block text-xs font-semibold mb-1">Supplier Name *</label>
                <input
                  type="text"
                  value={newSupName}
                  onChange={(e) => setNewSupName(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div className="flex-1 min-w-[150px]">
                <label className="block text-xs font-semibold mb-1">Phone</label>
                <input
                  type="text"
                  value={newSupPhone}
                  onChange={(e) => setNewSupPhone(e.target.value)}
                  className={inputCls}
                />
              </div>
              <button
                type="button"
                onClick={handleCreateQuickSupplier}
                className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white cursor-pointer"
              >
                Save Supplier
              </button>
            </div>
          )}

          {/* Product Restock Lines */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold">
                Products Being Restocked
              </label>
              <button
                type="button"
                onClick={() => {
                  const first = productCatalog[0];
                  if (first) {
                    setLines((prev) => [
                      ...prev,
                      { itemId: first.id, quantity: 5, unitCost: Number(first.costPrice) },
                    ]);
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Another Product
              </button>
            </div>

            {lines.map((line, idx) => (
              <div
                key={idx}
                className={`grid grid-cols-12 gap-3 items-center rounded-xl border p-3.5 ${
                  isDark ? 'bg-[#0F1217] border-[#252B37]' : 'bg-[#FAF8F5] border-[#E8E4DD]'
                }`}
              >
                <div className="col-span-12 sm:col-span-6">
                  <label className="block text-xs opacity-65 mb-1">Retail Product</label>
                  <select
                    value={line.itemId}
                    onChange={(e) => {
                      const found = productCatalog.find((p) => p.id === Number(e.target.value));
                      if (found) {
                        setLines((prev) =>
                          prev.map((l, i) =>
                            i === idx
                              ? { ...l, itemId: found.id, unitCost: Number(found.costPrice) }
                              : l
                          )
                        );
                      }
                    }}
                    className={inputCls}
                  >
                    {productCatalog.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (Stock: {p.currentStock} {p.unit || 'pcs'})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-5 sm:col-span-2">
                  <label className="block text-xs opacity-65 mb-1">Qty Bought</label>
                  <input
                    type="number"
                    min={1}
                    value={line.quantity}
                    onChange={(e) =>
                      setLines((prev) =>
                        prev.map((l, i) =>
                          i === idx ? { ...l, quantity: Math.max(1, Number(e.target.value)) } : l
                        )
                      )
                    }
                    className={`${inputCls} font-mono-num text-center`}
                  />
                </div>
                <div className="col-span-7 sm:col-span-4">
                  <label className="block text-xs opacity-65 mb-1">Unit Buying Cost (TZS)</label>
                  <input
                    type="number"
                    min={0}
                    value={line.unitCost}
                    onChange={(e) =>
                      setLines((prev) =>
                        prev.map((l, i) =>
                          i === idx ? { ...l, unitCost: Math.max(0, Number(e.target.value)) } : l
                        )
                      )
                    }
                    className={`${inputCls} font-mono-num`}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-200 dark:border-[#252B37]">
            <div className="space-y-3">
              <label className="block text-sm font-semibold">Payment Status</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'paid', label: 'Paid in Full' },
                  { id: 'partly_paid', label: 'Partly Paid' },
                  { id: 'unpaid', label: 'Unpaid Credit' },
                ].map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setPaymentStatus(st.id as any)}
                    className={`rounded-xl border py-2.5 px-3 text-xs font-semibold cursor-pointer ${
                      paymentStatus === st.id
                        ? 'bg-emerald-700 text-white border-emerald-700'
                        : isDark
                        ? 'bg-[#0F1217] border-[#252B37]'
                        : 'bg-[#FAF8F5] border-[#E8E4DD]'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>

              {paymentStatus === 'partly_paid' && (
                <div>
                  <label className="block text-xs font-semibold mb-1">Amount Paid Now (TZS)</label>
                  <input
                    type="number"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    className={`${inputCls} font-mono-num`}
                  />
                </div>
              )}
            </div>

            <div
              className={`rounded-2xl border p-4 flex flex-col justify-center space-y-2 text-sm ${
                isDark ? 'bg-[#0F1217] border-[#252B37]' : 'bg-[#FAF8F5] border-[#E8E4DD]'
              }`}
            >
              <div className="flex justify-between">
                <span>Total Purchase Cost:</span>
                <span className="font-mono-num font-bold">{formatTZS(totalAmount)}</span>
              </div>
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                <span>Paid Today:</span>
                <span className="font-mono-num">{formatTZS(effectivePaid)}</span>
              </div>
              {balanceDue > 0 && (
                <div className="flex justify-between text-rose-500 font-semibold">
                  <span>Payable Owed to Supplier:</span>
                  <span className="font-mono-num">{formatTZS(balanceDue)}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-[#252B37]">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-5 py-2.5 text-sm font-semibold border border-slate-300 dark:border-slate-700 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-emerald-700 hover:bg-emerald-800 px-6 py-2.5 text-sm font-semibold text-white cursor-pointer"
            >
              {submitting ? 'Saving...' : 'Save Stock Purchase'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// 3. CUSTOMER RECEIPT / SUPPLIER PAYMENT MODAL
interface PartyPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode: 'customer_receipt' | 'supplier_payment';
  initialPartyId?: number | null;
  initialInvoiceId?: number | null;
  customers: Customer[];
  suppliers: Supplier[];
  sales: Sale[];
  purchases: Purchase[];
  onSubmitPayment: (payload: any) => Promise<void>;
  isDark: boolean;
}

export const PartyPaymentModal: React.FC<PartyPaymentModalProps> = ({
  isOpen,
  onClose,
  initialMode,
  initialPartyId,
  initialInvoiceId,
  customers,
  suppliers,
  sales,
  purchases,
  onSubmitPayment,
  isDark,
}) => {
  const today = new Date().toISOString().split('T')[0];
  const [mode, setMode] = useState<'customer_receipt' | 'supplier_payment'>(initialMode);
  const [partyId, setPartyId] = useState<string>('');
  const [invoiceId, setInvoiceId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mobile_money' | 'bank'>('cash');
  const [paymentDate, setPaymentDate] = useState(today);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      const pid =
        initialPartyId ||
        (initialMode === 'customer_receipt' ? customers[0]?.id : suppliers[0]?.id);
      setPartyId(pid ? String(pid) : '');
      setInvoiceId(initialInvoiceId ? String(initialInvoiceId) : '');
      if (initialInvoiceId) {
        if (initialMode === 'customer_receipt') {
          const inv = sales.find((s) => s.id === initialInvoiceId);
          if (inv) setAmount(String(inv.balanceDue));
        } else {
          const bill = purchases.find((p) => p.id === initialInvoiceId);
          if (bill) setAmount(String(bill.balanceDue));
        }
      } else {
        setAmount('');
      }
    }
  }, [isOpen, initialMode, initialPartyId, initialInvoiceId, customers, suppliers, sales, purchases]);

  if (!isOpen) return null;

  const isCustomer = mode === 'customer_receipt';
  const unpaidInvoices = isCustomer
    ? sales.filter(
        (s) => !s.isDeleted && Number(s.balanceDue) > 0 && (!partyId || String(s.customerId) === partyId)
      )
    : purchases.filter(
        (p) => !p.isDeleted && Number(p.balanceDue) > 0 && (!partyId || String(p.supplierId) === partyId)
      );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partyId || Number(amount) <= 0) return;
    setSubmitting(true);
    try {
      const partyObj = isCustomer
        ? customers.find((c) => String(c.id) === partyId)
        : suppliers.find((s) => String(s.id) === partyId);
      const refDoc = isCustomer
        ? sales.find((s) => String(s.id) === invoiceId)
        : purchases.find((p) => String(p.id) === invoiceId);

      await onSubmitPayment({
        paymentDate,
        paymentType: mode,
        partyId: Number(partyId),
        partyName: partyObj?.name || 'Account',
        referenceInvoiceId: invoiceId ? Number(invoiceId) : null,
        referenceInvoiceNo: refDoc
          ? isCustomer
            ? (refDoc as Sale).invoiceNo
            : (refDoc as Purchase).billNo
          : '',
        amount: Number(amount),
        paymentMethod,
        notes,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = `w-full rounded-xl border px-3.5 py-2.5 text-sm ${
    isDark ? 'bg-[#0F1217] border-[#252B37] text-slate-100' : 'bg-[#FAF8F5] border-[#E8E4DD] text-slate-900'
  }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div
        className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden ${
          isDark ? 'bg-[#171B22] border-[#252B37] text-slate-100' : 'bg-white border-[#E8E4DD] text-slate-900'
        }`}
      >
        <div
          className={`flex items-center justify-between px-6 py-5 text-white ${
            isCustomer ? 'bg-emerald-700' : 'bg-amber-700'
          }`}
        >
          <div className="flex items-center gap-3">
            <Wallet className="w-6 h-6" />
            <div>
              <h2 className="font-display text-xl font-semibold">
                {isCustomer ? 'Receive Customer Payment' : 'Pay Supplier Bill'}
              </h2>
              <p className="text-xs opacity-90">
                {isCustomer
                  ? 'Collect money owed by a customer and add to your cash balance'
                  : 'Pay off a supplier bill and update your account balance'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-xl p-1.5 hover:bg-black/20 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMode('customer_receipt')}
              className={`rounded-xl py-2.5 text-sm font-semibold border cursor-pointer ${
                isCustomer
                  ? 'bg-emerald-700 text-white border-emerald-700'
                  : 'border-slate-300 dark:border-slate-700 opacity-75'
              }`}
            >
              Customer Pays You
            </button>
            <button
              type="button"
              onClick={() => setMode('supplier_payment')}
              className={`rounded-xl py-2.5 text-sm font-semibold border cursor-pointer ${
                !isCustomer
                  ? 'bg-amber-700 text-white border-amber-700'
                  : 'border-slate-300 dark:border-slate-700 opacity-75'
              }`}
            >
              You Pay Supplier
            </button>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1.5">
              Select {isCustomer ? 'Customer' : 'Supplier'}
            </label>
            <select
              value={partyId}
              onChange={(e) => {
                setPartyId(e.target.value);
                setInvoiceId('');
              }}
              className={inputCls}
              required
            >
              <option value="">-- Choose Person --</option>
              {(isCustomer ? customers : suppliers).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (Balance: {formatTZS(p.outstandingBalance)})
                </option>
              ))}
            </select>
          </div>

          {unpaidInvoices.length > 0 && (
            <div>
              <label className="block text-sm font-semibold mb-1.5">
                Link to Unpaid Invoice / Bill (Optional)
              </label>
              <select
                value={invoiceId}
                onChange={(e) => {
                  setInvoiceId(e.target.value);
                  const doc = unpaidInvoices.find((u) => String(u.id) === e.target.value);
                  if (doc) setAmount(String(doc.balanceDue));
                }}
                className={inputCls}
              >
                <option value="">General Account Payment</option>
                {unpaidInvoices.map((u: any) => (
                  <option key={u.id} value={u.id}>
                    {u.invoiceNo || u.billNo} ({u.saleDate || u.purchaseDate}) — Due:{' '}
                    {formatTZS(u.balanceDue)}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1.5">Amount (TZS) *</label>
              <input
                type="number"
                required
                min={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 35000"
                className={`${inputCls} font-mono-num font-bold`}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1.5">Payment Channel</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className={inputCls}
              >
                <option value="cash">Cash (TZS)</option>
                <option value="mobile_money">M-Pesa / Mobile Money</option>
                <option value="bank">Bank Transfer</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-[#252B37]">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-5 py-2.5 text-sm font-semibold border border-slate-300 dark:border-slate-700 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`rounded-xl px-6 py-2.5 text-sm font-semibold text-white cursor-pointer ${
                isCustomer ? 'bg-emerald-700 hover:bg-emerald-800' : 'bg-amber-700 hover:bg-amber-800'
              }`}
            >
              {submitting ? 'Saving...' : 'Save Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// 4. EXPENSE MODAL
interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitExpense: (payload: any) => Promise<void>;
  isDark: boolean;
}

export const ExpenseVoucherModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  onClose,
  onSubmitExpense,
  isDark,
}) => {
  const today = new Date().toISOString().split('T')[0];
  const [expenseDate, setExpenseDate] = useState(today);
  const [category, setCategory] = useState('Rent & Shop Space');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mobile_money' | 'bank'>('cash');
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'unpaid'>('paid');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const inputCls = `w-full rounded-xl border px-3.5 py-2.5 text-sm ${
    isDark ? 'bg-[#0F1217] border-[#252B37] text-slate-100' : 'bg-[#FAF8F5] border-[#E8E4DD] text-slate-900'
  }`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;
    setSubmitting(true);
    try {
      await onSubmitExpense({
        expenseDate,
        category,
        description: description || category,
        amount: Number(amount),
        paymentMethod,
        paymentStatus,
      });
      setDescription('');
      setAmount('');
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div
        className={`w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden ${
          isDark ? 'bg-[#171B22] border-[#252B37] text-slate-100' : 'bg-white border-[#E8E4DD] text-slate-900'
        }`}
      >
        <div className="flex items-center justify-between px-6 py-5 bg-rose-700 text-white">
          <div className="flex items-center gap-3">
            <Receipt className="w-6 h-6" />
            <div>
              <h2 className="font-display text-xl font-semibold">Record a Shop Expense</h2>
              <p className="text-xs text-rose-100">Rent, electricity, laundry, towels, or supplies</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-xl p-1.5 hover:bg-black/20 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1.5">Expense Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={inputCls}
            >
              <option value="Rent & Shop Space">Rent & Shop Space</option>
              <option value="Electricity (LUKU) & Water">Electricity (LUKU) & Water</option>
              <option value="Cleaning, Laundry & Hygiene">Cleaning, Laundry & Hygiene</option>
              <option value="Staff Wages & Allowances">Staff Wages & Allowances</option>
              <option value="Transport & Delivery">Transport & Delivery</option>
              <option value="Marketing & Instagram Ads">Marketing & Instagram Ads</option>
              <option value="Other Shop Expense">Other Shop Expense</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1.5">Amount (TZS) *</label>
            <input
              type="number"
              required
              min={1}
              placeholder="e.g. 25000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={`${inputCls} font-mono-num font-bold`}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1.5">What was this for?</label>
            <input
              type="text"
              placeholder="e.g. LUKU electricity tokens for consultation room"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={inputCls}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold mb-1.5">Paid From</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className={inputCls}
              >
                <option value="cash">Cash Box</option>
                <option value="mobile_money">M-Pesa</option>
                <option value="bank">Bank</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1.5">Date</label>
              <input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className={`${inputCls} font-mono-num`}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-[#252B37]">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-5 py-2.5 text-sm font-semibold border border-slate-300 dark:border-slate-700 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-rose-700 hover:bg-rose-800 px-6 py-2.5 text-sm font-semibold text-white cursor-pointer"
            >
              {submitting ? 'Saving...' : 'Save Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// 5. MULTI-ITEM SERVICE & PRODUCT BOOKING MODAL
interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  catalog: CatalogItem[];
  customers: Customer[];
  staff: StaffMember[];
  onSubmitBooking: (payload: any) => Promise<void>;
  onQuickCreateCustomer: (payload: { name: string; phone: string; email: string }) => Promise<Customer>;
  isDark: boolean;
}

export const BookingAppointmentModal: React.FC<BookingModalProps> = ({
  isOpen,
  onClose,
  catalog,
  customers,
  staff,
  onSubmitBooking,
  onQuickCreateCustomer,
  isDark,
}) => {
  const today = new Date().toISOString().split('T')[0];
  const [appointmentDate, setAppointmentDate] = useState(today);
  const [appointmentTime, setAppointmentTime] = useState('14:00');
  const [customerId, setCustomerId] = useState<string>(customers[0] ? String(customers[0].id) : '');
  const [assignedStaff, setAssignedStaff] = useState(staff[0]?.name || 'Neema K.');
  const [notes, setNotes] = useState('');

  const activeCatalog = catalog.filter((c) => !c.isDeleted);
  const [lines, setLines] = useState<BookingLineItem[]>(() => {
    const firstSvc = activeCatalog.find((c) => c.itemType === 'service') || activeCatalog[0];
    return firstSvc
      ? [
          {
            itemId: firstSvc.id,
            itemName: firstSvc.name,
            itemType: firstSvc.itemType,
            quantity: 1,
            unitPrice: Number(firstSvc.sellingPrice),
            unitCost: Number(firstSvc.costPrice),
            lineTotal: Number(firstSvc.sellingPrice),
          },
        ]
      : [];
  });

  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const totalAmount = lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);

  const handleAddBookingLine = (filterType: 'service' | 'product') => {
    const candidate = activeCatalog.find((c) => c.itemType === filterType) || activeCatalog[0];
    if (!candidate) return;
    setLines((prev) => [
      ...prev,
      {
        itemId: candidate.id,
        itemName: candidate.name,
        itemType: candidate.itemType,
        quantity: 1,
        unitPrice: Number(candidate.sellingPrice),
        unitCost: Number(candidate.costPrice),
        lineTotal: Number(candidate.sellingPrice),
      },
    ]);
  };

  const handleCreateQuickCustomer = async () => {
    if (!newCustName.trim()) return;
    try {
      const created = await onQuickCreateCustomer({
        name: newCustName.trim(),
        phone: newCustPhone.trim(),
        email: '',
      });
      setCustomerId(String(created.id));
      setNewCustName('');
      setNewCustPhone('');
      setShowNewCustomer(false);
    } catch (e: any) {
      setError(e.message || 'Could not create customer');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lines.length === 0) {
      setError('Please add at least one service or product.');
      return;
    }
    setSubmitting(true);
    try {
      const cust = customers.find((c) => String(c.id) === customerId);
      await onSubmitBooking({
        appointmentDate,
        appointmentTime,
        customerId: customerId ? Number(customerId) : null,
        customerName: cust ? cust.name : 'Walk-in Client',
        customerPhone: cust ? cust.phone : '',
        assignedStaff,
        notes,
        items: lines.map((l) => ({
          ...l,
          lineTotal: l.quantity * l.unitPrice,
        })),
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save booking');
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = `w-full rounded-xl border px-3.5 py-2.5 text-sm ${
    isDark ? 'bg-[#0F1217] border-[#252B37] text-slate-100' : 'bg-[#FAF8F5] border-[#E8E4DD] text-slate-900'
  }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div
        className={`w-full max-w-3xl rounded-2xl border shadow-2xl overflow-hidden ${
          isDark ? 'bg-[#171B22] border-[#252B37] text-slate-100' : 'bg-white border-[#E8E4DD] text-slate-900'
        }`}
      >
        <div className="flex items-center justify-between px-6 py-5 bg-amber-700 text-white">
          <div className="flex items-center gap-3">
            <Calendar className="w-6 h-6" />
            <div>
              <h2 className="font-display text-xl font-semibold">New Booking</h2>
              <p className="text-xs text-amber-100">
                Combine multiple services, consultations, sessions & products in one booking
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-xl p-1.5 hover:bg-black/20 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 max-h-[82vh] overflow-y-auto space-y-6">
          {error && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-500">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-semibold">Client / Guest</label>
                <button
                  type="button"
                  onClick={() => setShowNewCustomer(!showNewCustomer)}
                  className="text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline cursor-pointer"
                >
                  {showNewCustomer ? 'Cancel' : '+ Add New Client'}
                </button>
              </div>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className={inputCls}
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.phone || 'No phone'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1.5">Date</label>
              <input
                type="date"
                value={appointmentDate}
                onChange={(e) => setAppointmentDate(e.target.value)}
                className={`${inputCls} font-mono-num`}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1.5">Time</label>
              <input
                type="time"
                value={appointmentTime}
                onChange={(e) => setAppointmentTime(e.target.value)}
                className={`${inputCls} font-mono-num`}
              />
            </div>
          </div>

          {showNewCustomer && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[180px]">
                <label className="block text-xs font-semibold mb-1">Client Full Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Zainab Hassan"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div className="flex-1 min-w-[150px]">
                <label className="block text-xs font-semibold mb-1">Phone Number</label>
                <input
                  type="text"
                  placeholder="+255 7..."
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  className={inputCls}
                />
              </div>
              <button
                type="button"
                onClick={handleCreateQuickCustomer}
                className="rounded-xl bg-amber-700 px-4 py-2.5 text-sm font-semibold text-white cursor-pointer"
              >
                Save Client
              </button>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-sm font-semibold">
                Services & Products ({lines.length})
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleAddBookingLine('service')}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 px-3.5 py-2 text-xs font-semibold text-amber-700 dark:text-amber-300 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" /> + Add Service
                </button>
                <button
                  type="button"
                  onClick={() => handleAddBookingLine('product')}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> + Add Retail Product
                </button>
              </div>
            </div>

            {lines.map((line, index) => (
              <div
                key={index}
                className={`grid grid-cols-12 gap-3 items-center rounded-xl border p-3.5 ${
                  isDark ? 'bg-[#0F1217] border-[#252B37]' : 'bg-[#FAF8F5] border-[#E8E4DD]'
                }`}
              >
                <div className="col-span-12 sm:col-span-6">
                  <select
                    value={line.itemId}
                    onChange={(e) => {
                      const found = activeCatalog.find((c) => c.id === Number(e.target.value));
                      if (found) {
                        setLines((prev) =>
                          prev.map((l, i) =>
                            i === index
                              ? {
                                  ...l,
                                  itemId: found.id,
                                  itemName: found.name,
                                  itemType: found.itemType,
                                  unitPrice: Number(found.sellingPrice),
                                  unitCost: Number(found.costPrice),
                                  lineTotal: l.quantity * Number(found.sellingPrice),
                                }
                              : l
                          )
                        );
                      }
                    }}
                    className={inputCls}
                  >
                    <optgroup label="Services & Consultations">
                      {activeCatalog
                        .filter((c) => c.itemType === 'service')
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            [Service] {s.name} — {formatTZS(s.sellingPrice)}
                          </option>
                        ))}
                    </optgroup>
                    <optgroup label="Retail Products">
                      {activeCatalog
                        .filter((c) => c.itemType === 'product')
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            [Product] {p.name} — {formatTZS(p.sellingPrice)}
                          </option>
                        ))}
                    </optgroup>
                  </select>
                </div>

                <div className="col-span-4 sm:col-span-2">
                  <input
                    type="number"
                    min={1}
                    value={line.quantity}
                    onChange={(e) => {
                      const q = Math.max(1, Number(e.target.value));
                      setLines((prev) =>
                        prev.map((l, i) =>
                          i === index ? { ...l, quantity: q, lineTotal: q * l.unitPrice } : l
                        )
                      );
                    }}
                    className={`${inputCls} font-mono-num text-center`}
                  />
                </div>

                <div className="col-span-8 sm:col-span-4 flex items-center justify-end gap-3">
                  <span className="font-mono-num text-sm font-bold">
                    {formatTZS(line.quantity * line.unitPrice)}
                  </span>
                  {lines.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setLines((prev) => prev.filter((_, i) => i !== index))}
                      className="text-rose-500 p-1.5 rounded-lg hover:bg-rose-500/10 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-200 dark:border-[#252B37]">
            <div>
              <label className="block text-xs opacity-70">Assigned Specialist / Staff</label>
              <select
                value={assignedStaff}
                onChange={(e) => setAssignedStaff(e.target.value)}
                className={`${inputCls} mt-1`}
              >
                {staff.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <span className="block text-xs opacity-70">Booking Total</span>
                <span className="font-mono-num text-xl font-bold text-amber-700 dark:text-amber-400">
                  {formatTZS(totalAmount)}
                </span>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-amber-700 hover:bg-amber-800 px-6 py-3 text-sm font-semibold text-white shadow-sm cursor-pointer"
              >
                {submitting ? 'Booking...' : 'Save Booking'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

// 6. COMPLETE BOOKING & CONVERT TO SALE MODAL
interface CompleteBookingModalProps {
  booking: Booking | null;
  onClose: () => void;
  onConfirmComplete: (payload: {
    bookingId: number;
    status: 'completed';
    convertToSale: boolean;
    paymentMethod: 'cash' | 'mobile_money' | 'card' | 'credit';
    amountPaid: number;
  }) => Promise<void>;
  isDark: boolean;
}

export const CompleteBookingModal: React.FC<CompleteBookingModalProps> = ({
  booking,
  onClose,
  onConfirmComplete,
  isDark,
}) => {
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mobile_money' | 'card' | 'credit'>('cash');
  const [amountPaid, setAmountPaid] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  if (!booking) return null;

  const total = Number(booking.totalAmount || 0);
  const paid =
    paymentMethod === 'credit'
      ? Math.min(total, Math.max(0, Number(amountPaid || 0)))
      : total;

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onConfirmComplete({
        bookingId: booking.id,
        status: 'completed',
        convertToSale: true,
        paymentMethod,
        amountPaid: paid,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div
        className={`w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden ${
          isDark ? 'bg-[#171B22] border-[#252B37] text-slate-100' : 'bg-white border-[#E8E4DD] text-slate-900'
        }`}
      >
        <div className="px-6 py-5 bg-emerald-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-6 h-6" />
            <div>
              <h3 className="font-display text-lg font-semibold">Complete & Checkout Appointment</h3>
              <p className="text-xs text-emerald-100">
                Moves this completed appointment directly into your Sales list
              </p>
            </div>
          </div>
          <button onClick={onClose} className="cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleConfirm} className="p-6 space-y-5">
          <div
            className={`rounded-xl border p-4 ${
              isDark ? 'bg-[#0F1217] border-[#252B37]' : 'bg-[#FAF8F5] border-[#E8E4DD]'
            }`}
          >
            <div className="text-sm font-semibold">{booking.customerName}</div>
            <div className="text-xs opacity-75 mt-0.5">
              Staff: {booking.assignedStaff} • {booking.appointmentDate}
            </div>
            <div className="text-xl font-bold font-mono-num text-emerald-700 dark:text-emerald-400 mt-2">
              Total: {formatTZS(total)}
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold">How did the guest pay?</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'cash', label: 'Cash (TZS)' },
                { id: 'mobile_money', label: 'M-Pesa / Mobile' },
                { id: 'card', label: 'Card / POS' },
                { id: 'credit', label: 'On Credit (Pay Later)' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPaymentMethod(m.id as any)}
                  className={`rounded-xl border py-2.5 px-3 text-sm font-semibold cursor-pointer ${
                    paymentMethod === m.id
                      ? 'bg-emerald-700 text-white border-emerald-700'
                      : isDark
                      ? 'bg-[#0F1217] border-[#252B37]'
                      : 'bg-[#FAF8F5] border-[#E8E4DD]'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {paymentMethod === 'credit' && (
            <div>
              <label className="block text-xs font-semibold mb-1">
                Deposit Paid Today (TZS) — Leave 0 if paying later
              </label>
              <input
                type="number"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                placeholder="0"
                className={`w-full rounded-xl border px-3.5 py-2.5 text-sm font-mono-num ${
                  isDark ? 'bg-[#0F1217] border-[#252B37]' : 'bg-[#FAF8F5] border-[#E8E4DD]'
                }`}
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold border border-slate-300 dark:border-slate-700 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-emerald-700 hover:bg-emerald-800 px-5 py-2.5 text-sm font-semibold text-white cursor-pointer"
            >
              {submitting ? 'Saving Sale...' : 'Confirm & Record Sale'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
