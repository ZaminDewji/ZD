import React, { useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import {
  LayoutDashboard,
  ShoppingBag,
  Calendar,
  Package,
  Truck,
  Wallet,
  Receipt,
  Users,
  BarChart3,
  FileSpreadsheet,
  ShieldCheck,
  Sun,
  Moon,
  Plus,
  Minus,
  LogOut,
  Lock,
  CheckCircle2,
  Menu,
  X,
  Sparkles,
  Search,
  RotateCcw,
  Trash2,
  Clock,
  UserCheck,
  Coins,
  Printer,
  Bell,
  AlertTriangle,
  Cloud,
  HardDriveUpload,
  Download,
  CreditCard,
  ArrowRight,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { auth, googleAuthProvider } from './lib/firebase.ts';
import { ThemeProvider, useTheme } from './context/ThemeContext.tsx';
import {
  Booking,
  BookingLineItem,
  CatalogItem,
  CloudBackupRecord,
  Customer,
  RoleType,
  Sale,
  WorkspaceData,
} from './types.ts';
import { formatTZS, isWithinDateRange } from './utils/format.ts';
import {
  BookingAppointmentModal,
  CompleteBookingModal,
  ExpenseVoucherModal,
  PartyPaymentModal,
  PurchaseVoucherModal,
  SaleVoucherModal,
} from './components/VoucherModals.tsx';
import { ExcelImportView } from './components/ExcelImportView.tsx';
import { ReportsSuiteView } from './components/ReportsSuiteView.tsx';
import { FriendlyDashboardView } from './components/FriendlyDashboardView.tsx';
import { PrintReceiptModal } from './components/PrintReceiptModal.tsx';

type NavTab =
  | 'dashboard'
  | 'sales'
  | 'bookings'
  | 'inventory'
  | 'parties'
  | 'purchases'
  | 'expenses'
  | 'reports'
  | 'import'
  | 'audit_settings';

function TallyLiteShell() {
  const { isDark, toggleTheme, setTheme } = useTheme();
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [workspace, setWorkspace] = useState<WorkspaceData | null>(null);
  const [apiError, setApiError] = useState('');

  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [activeRole, setActiveRole] = useState<RoleType>('owner');
  const [activeStaffName, setActiveStaffName] = useState<string>('Owner');

  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [datePreset, setDatePreset] = useState<'all' | 'today' | 'month' | 'custom'>('all');
  const [showCustomDate, setShowCustomDate] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // POS & Checkout fast-action states
  const [salesSubTab, setSalesSubTab] = useState<'pos' | 'history'>('pos');
  const [posCategoryFilter, setPosCategoryFilter] = useState<string>('All');
  const [posSearchQuery, setPosSearchQuery] = useState<string>('');
  const [posCart, setPosCart] = useState<Array<{ item: CatalogItem; quantity: number }>>([]);
  const [posCustomerId, setPosCustomerId] = useState<string>('');
  const [posPaymentMethod, setPosPaymentMethod] = useState<'cash' | 'mobile_money' | 'card' | 'credit'>('cash');
  const [posAmountPaid, setPosAmountPaid] = useState<string>('');
  const [posNotes, setPosNotes] = useState<string>('');
  const [posSubmitting, setPosSubmitting] = useState<boolean>(false);
  const [posError, setPosError] = useState<string>('');

  // Sub-tabs for clean page organization
  const [inventorySubTab, setInventorySubTab] = useState<'all' | 'products' | 'services' | 'low_stock'>('all');
  const [inventorySearchQuery, setInventorySearchQuery] = useState<string>('');
  const [partiesSubTab, setPartiesSubTab] = useState<'customers' | 'receipts'>('customers');
  const [partiesSearchQuery, setPartiesSearchQuery] = useState<string>('');
  const [purchasesSubTab, setPurchasesSubTab] = useState<'bills' | 'suppliers' | 'payments'>('bills');
  const [purchasesSearchQuery, setPurchasesSearchQuery] = useState<string>('');

  const [saleModalOpen, setSaleModalOpen] = useState(false);
  const [preselectedSaleItemId, setPreselectedSaleItemId] = useState<number | null>(null);
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [preselectedReorderItems, setPreselectedReorderItems] = useState<Array<{
    itemId: number;
    quantity: number;
    unitCost: number;
  }> | null>(null);
  const [lowStockNotificationOpen, setLowStockNotificationOpen] = useState(false);
  const [lowStockBannerDismissed, setLowStockBannerDismissed] = useState(false);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [bookingToComplete, setBookingToComplete] = useState<Booking | null>(null);
  const [receiptToPrint, setReceiptToPrint] = useState<Sale | null>(null);
  const [paymentModalConfig, setPaymentModalConfig] = useState<{
    isOpen: boolean;
    mode: 'customer_receipt' | 'supplier_payment';
    partyId?: number | null;
    invoiceId?: number | null;
  }>({
    isOpen: false,
    mode: 'customer_receipt',
  });

  const [catalogModalOpen, setCatalogModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
  const [catalogSaving, setCatalogSaving] = useState(false);
  const [catalogError, setCatalogError] = useState('');
  const [itemForm, setItemForm] = useState({
    name: '',
    itemType: 'product' as 'product' | 'service',
    unit: 'pcs',
    sku: '',
    category: 'Skincare & Serums',
    costPrice: '',
    sellingPrice: '',
    openingStock: '10',
    adjustedQty: '0',
    reorderLevel: '5',
    durationMins: '45',
  });

  const [partyModalOpen, setPartyModalOpen] = useState(false);
  const [partyFormType, setPartyFormType] = useState<'customer' | 'supplier'>('customer');
  const [partyForm, setPartyForm] = useState({
    name: '',
    phone: '',
    email: '',
    openingBalance: '0',
    notes: '',
  });

  const [backupScheduleForm, setBackupScheduleForm] = useState({
    backupEnabled: true,
    backupFrequency: 'daily' as 'daily' | 'weekly',
    backupDayOfWeek: 'Sunday',
    backupTime: '02:00',
    backupBucketUri: 'gs://innate-protocol-6wh4c.firebasestorage.app/backups/tallylite-tzs',
    backupRetentionDays: 30,
  });
  const [backupActionLoading, setBackupActionLoading] = useState(false);
  const [backupStatusBanner, setBackupStatusBanner] = useState('');

  const authedFetch = useCallback(
    async (url: string, options: RequestInit = {}) => {
      if (!auth.currentUser) throw new Error('Not authenticated');
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-actor-name': activeStaffName,
          'x-actor-role': activeRole,
          ...(options.headers || {}),
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      return data;
    },
    [activeStaffName, activeRole]
  );

  const loadWorkspace = useCallback(async () => {
    if (!auth.currentUser) return;
    setApiError('');
    try {
      const data: WorkspaceData = await authedFetch('/api/workspace');
      setWorkspace(data);
      if (data.settings?.theme === 'dark' || data.settings?.theme === 'light') {
        setTheme(data.settings.theme);
      }
      if (data.settings) {
        setBackupScheduleForm({
          backupEnabled: data.settings.backupEnabled ?? true,
          backupFrequency: (data.settings.backupFrequency as 'daily' | 'weekly') || 'daily',
          backupDayOfWeek: data.settings.backupDayOfWeek || 'Sunday',
          backupTime: data.settings.backupTime || '02:00',
          backupBucketUri:
            data.settings.backupBucketUri ||
            'gs://innate-protocol-6wh4c.firebasestorage.app/backups/tallylite-tzs',
          backupRetentionDays: Number(data.settings.backupRetentionDays || 30),
        });
      }
      if (data.staff?.length > 0 && activeStaffName === 'Owner') {
        setActiveStaffName(data.staff[0].name);
      }
    } catch (err: any) {
      setApiError(err.message || 'Could not load workspace data');
    }
  }, [authedFetch, setTheme, activeStaffName]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setFirebaseUser(u);
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (firebaseUser) loadWorkspace();
    else setWorkspace(null);
  }, [firebaseUser]);

  useEffect(() => {
    if (activeRole === 'salesperson') {
      if (!['sales', 'bookings', 'inventory', 'parties'].includes(activeTab)) {
        setActiveTab('sales');
      }
    } else if (activeRole === 'receptionist') {
      if (!['bookings', 'sales', 'parties'].includes(activeTab)) {
        setActiveTab('bookings');
      }
    }
  }, [activeRole, activeTab]);

  const handleGoogleSignIn = async () => {
    setApiError('');
    try {
      await signInWithPopup(auth, googleAuthProvider);
    } catch (err: any) {
      setApiError(err.message || 'Google Sign-In failed');
    }
  };

  const handleToggleTheme = async () => {
    const nextTheme = isDark ? 'light' : 'dark';
    toggleTheme();
    if (firebaseUser && workspace) {
      try {
        const res = await authedFetch('/api/settings', {
          method: 'PUT',
          body: JSON.stringify({ theme: nextTheme }),
        });
        setWorkspace(res.workspace);
      } catch {
        // local state updated
      }
    }
  };

  const handleToggleBookingModule = async () => {
    if (!workspace?.settings || activeRole !== 'owner') return;
    const nextVal = !workspace.settings.bookingEnabled;
    const res = await authedFetch('/api/settings', {
      method: 'PUT',
      body: JSON.stringify({ bookingEnabled: nextVal }),
    });
    setWorkspace(res.workspace);
    if (!nextVal && activeTab === 'bookings') setActiveTab('dashboard');
  };

  const handleQuickCreateCustomer = async (payload: {
    name: string;
    phone: string;
    email: string;
  }): Promise<Customer> => {
    const res = await authedFetch('/api/customers', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setWorkspace(res.workspace);
    return res.customer;
  };

  const handleQuickCreateSupplier = async (payload: {
    name: string;
    phone: string;
    email: string;
  }) => {
    const res = await authedFetch('/api/suppliers', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setWorkspace(res.workspace);
    return res.supplier;
  };

  const openEditOrCreateItem = (
    item?: CatalogItem,
    defaultType: 'product' | 'service' = 'product'
  ) => {
    setCatalogError('');
    if (item) {
      setEditingItem(item);
      setItemForm({
        name: item.name,
        itemType: item.itemType === 'service' ? 'service' : 'product',
        unit: item.unit || 'pcs',
        sku: item.sku,
        category: item.category,
        costPrice: String(item.costPrice ?? '0'),
        sellingPrice: String(item.sellingPrice ?? '0'),
        openingStock: String(item.openingStock ?? '0'),
        adjustedQty: String(item.adjustedQty ?? '0'),
        reorderLevel: String(item.reorderLevel ?? '5'),
        durationMins: String(item.durationMins || '45'),
      });
    } else {
      setEditingItem(null);
      setItemForm({
        name: '',
        itemType: defaultType,
        unit: 'pcs',
        sku: '',
        category:
          defaultType === 'service' ? 'Facial & Therapy Sessions' : 'Skincare & Retail Products',
        costPrice: '',
        sellingPrice: '',
        openingStock: '10',
        adjustedQty: '0',
        reorderLevel: '5',
        durationMins: '45',
      });
    }
    setCatalogModalOpen(true);
  };

  const handleSaveCatalogItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setCatalogError('');
    if (!itemForm.name.trim()) {
      setCatalogError('Please enter a name for the product or service.');
      return;
    }
    if (itemForm.sellingPrice === '' || Number(itemForm.sellingPrice) < 0) {
      setCatalogError('Please enter a valid selling price in TZS.');
      return;
    }

    setCatalogSaving(true);
    try {
      const res = await authedFetch('/api/catalog', {
        method: 'POST',
        body: JSON.stringify({
          id: editingItem?.id,
          name: itemForm.name.trim(),
          itemType: itemForm.itemType,
          unit: itemForm.itemType === 'service' ? 'session' : itemForm.unit || 'pcs',
          sku: itemForm.sku.trim(),
          category:
            itemForm.category.trim() ||
            (itemForm.itemType === 'service' ? 'Services' : 'Retail Products'),
          costPrice: Number(itemForm.costPrice || 0),
          sellingPrice: Number(itemForm.sellingPrice || 0),
          openingStock: itemForm.itemType === 'service' ? 0 : Number(itemForm.openingStock || 0),
          adjustedQty: itemForm.itemType === 'service' ? 0 : Number(itemForm.adjustedQty || 0),
          reorderLevel: itemForm.itemType === 'service' ? 0 : Number(itemForm.reorderLevel || 5),
          durationMins: itemForm.itemType === 'service' ? Number(itemForm.durationMins || 45) : 0,
        }),
      });
      setWorkspace(res.workspace);
      setCatalogModalOpen(false);
    } catch (err: any) {
      setCatalogError(err.message || 'Failed to save item. Please try again.');
    } finally {
      setCatalogSaving(false);
    }
  };

  const handleSaveParty = async (e: React.FormEvent) => {
    e.preventDefault();
    const endpoint = partyFormType === 'customer' ? '/api/customers' : '/api/suppliers';
    const res = await authedFetch(endpoint, {
      method: 'POST',
      body: JSON.stringify({
        name: partyForm.name,
        phone: partyForm.phone,
        email: partyForm.email,
        openingBalance: Number(partyForm.openingBalance || 0),
        notes: partyForm.notes,
      }),
    });
    setWorkspace(res.workspace);
    setPartyModalOpen(false);
    setPartyForm({ name: '', phone: '', email: '', openingBalance: '0', notes: '' });
  };

  if (authLoading) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center ${
          isDark ? 'bg-[#0F1217] text-slate-100' : 'bg-[#FAF8F5] text-slate-900'
        }`}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-700 flex items-center justify-center text-white font-bold">
            TZS
          </div>
          <p className="text-sm font-medium opacity-75">Opening your business ledger...</p>
        </div>
      </div>
    );
  }

  // Friendly Login Screen
  if (!firebaseUser) {
    return (
      <div
        className={`min-h-screen flex flex-col justify-between p-6 md:p-10 ${
          isDark ? 'bg-[#0F1217] text-slate-100' : 'bg-[#FAF8F5] text-slate-900'
        }`}
      >
        <header className="max-w-6xl w-full mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-700 flex items-center justify-center text-white font-bold font-mono-num text-sm shadow-xs">
              TZS
            </div>
            <div>
              <span className="font-display font-semibold text-xl">TallyLite TZS</span>
              <span className="block text-xs opacity-65">
                Simple Shop, Services & Booking Manager
              </span>
            </div>
          </div>

          <button
            onClick={handleToggleTheme}
            className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition cursor-pointer ${
              isDark
                ? 'bg-[#171B22] border-[#252B37] text-slate-200 hover:bg-slate-800'
                : 'bg-white border-[#E8E4DD] text-slate-700 hover:bg-slate-100'
            }`}
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
        </header>

        <main className="max-w-5xl w-full mx-auto my-auto py-10">
          <div
            className={`rounded-3xl border p-8 md:p-12 shadow-lg grid grid-cols-1 lg:grid-cols-12 gap-10 items-center ${
              isDark ? 'bg-[#171B22] border-[#252B37]' : 'bg-white border-[#E8E4DD]'
            }`}
          >
            <div className="lg:col-span-7 space-y-6">
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                Built for Shops, Clinics & Service Businesses in Tanzanian Shillings (TZS)
              </p>
              <h1 className="font-display text-3xl md:text-4xl font-semibold leading-tight">
                Know Your Daily Profit, Cash, Stock, and Bookings Without Being an Accountant.
              </h1>
              <p className="text-base opacity-80 leading-relaxed">
                Sell retail products and manage client bookings (consultations, physiotherapy,
                treatments, or sessions) from one clean, easy-to-use screen.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div
                  className={`rounded-2xl border p-4 ${
                    isDark ? 'bg-[#0F1217] border-[#252B37]' : 'bg-[#FAF8F5] border-[#E8E4DD]'
                  }`}
                >
                  <div className="font-semibold text-base text-emerald-700 dark:text-emerald-400">
                    Products & Bookings Together
                  </div>
                  <p className="text-sm opacity-75 mt-1">
                    Schedule multiple services & products in one booking, then convert completed
                    sessions into sales with one click.
                  </p>
                </div>
                <div
                  className={`rounded-2xl border p-4 ${
                    isDark ? 'bg-[#0F1217] border-[#252B37]' : 'bg-[#FAF8F5] border-[#E8E4DD]'
                  }`}
                >
                  <div className="font-semibold text-base text-amber-700 dark:text-amber-400">
                    Track Credit & Excel Easily
                  </div>
                  <p className="text-sm opacity-75 mt-1">
                    See who owes you money, pay suppliers, lock staff sales, and import items using
                    ready-made Excel templates.
                  </p>
                </div>
              </div>
            </div>

            <div
              className={`lg:col-span-5 rounded-2xl border p-7 space-y-6 ${
                isDark ? 'bg-[#0F1217] border-[#252B37]' : 'bg-[#FAF8F5] border-[#E8E4DD]'
              }`}
            >
              <div>
                <h2 className="font-display text-2xl font-semibold">Welcome Back</h2>
                <p className="text-sm opacity-75 mt-1.5">
                  Sign in with Google to open your workspace. Sample TZS products, services, and
                  bookings are ready to explore.
                </p>
              </div>

              {apiError && (
                <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-3.5 text-sm text-red-500">
                  {apiError}
                </div>
              )}

              <button
                onClick={handleGoogleSignIn}
                className="w-full rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold py-3.5 px-5 text-base shadow-sm transition flex items-center justify-center gap-2.5 cursor-pointer"
              >
                <ShieldCheck className="w-5 h-5" />
                <span>Sign In with Google</span>
              </button>

              <div className="text-xs opacity-70 space-y-1.5 pt-3 border-t border-slate-200 dark:border-[#252B37]">
                <div>• Switch between Owner, Sales Staff & Receptionist views</div>
                <div>• Staff cannot edit or delete finalized sales</div>
                <div>• Ready-made Excel (.xlsx) templates included</div>
              </div>
            </div>
          </div>
        </main>

        <footer className="max-w-6xl w-full mx-auto text-center text-sm opacity-60">
          TallyLite TZS · Friendly Retail, Services & Booking Management
        </footer>
      </div>
    );
  }

  const settings = workspace?.settings;
  const bookingEnabled = settings?.bookingEnabled ?? true;
  const openingCash = Number(settings?.openingCash || 2500000);
  const catalog = workspace?.catalog || [];
  const customers = workspace?.customers || [];
  const suppliers = workspace?.suppliers || [];
  const staff = workspace?.staff || [];
  const allSales = workspace?.sales || [];
  const allSaleItems = workspace?.saleItems || [];
  const allPurchases = workspace?.purchases || [];
  const allExpenses = workspace?.expenses || [];
  const allPayments = workspace?.payments || [];
  const allBookings = workspace?.bookings || [];
  const allLedgerEntries = workspace?.ledgerEntries || [];
  const allAuditLogs = workspace?.auditLogs || [];
  const allCloudBackups = workspace?.cloudBackups || [];

  const handleSaveBackupSchedule = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setBackupActionLoading(true);
    setBackupStatusBanner('');
    setApiError('');
    try {
      const res = await authedFetch('/api/settings', {
        method: 'PUT',
        body: JSON.stringify(backupScheduleForm),
      });
      setWorkspace(res.workspace);
      setBackupStatusBanner(
        backupScheduleForm.backupEnabled
          ? `Automated ${backupScheduleForm.backupFrequency} backup schedule saved for ${backupScheduleForm.backupBucketUri}`
          : 'Automated cloud backup schedule paused.'
      );
    } catch (err: any) {
      setApiError(err.message || 'Failed to save cloud backup schedule');
    } finally {
      setBackupActionLoading(false);
    }
  };

  const handleRunCloudBackupNow = async (
    triggerMode: 'manual' | 'scheduled_daily' | 'scheduled_weekly' = 'manual'
  ) => {
    setBackupActionLoading(true);
    setBackupStatusBanner('');
    setApiError('');
    try {
      const res = await authedFetch('/api/backups/run', {
        method: 'POST',
        body: JSON.stringify({
          triggerType: triggerMode,
          bucketUri: backupScheduleForm.backupBucketUri,
        }),
      });
      setWorkspace(res.workspace);
      setBackupStatusBanner(
        `Snapshot ${res.backup.backupRef} uploaded to ${res.backup.objectPath}`
      );
    } catch (err: any) {
      setApiError(err.message || 'Failed to execute cloud storage backup');
    } finally {
      setBackupActionLoading(false);
    }
  };

  const handleDownloadBackupSnapshot = (bkp: CloudBackupRecord) => {
    const blob = new Blob([bkp.snapshotJson || '{}'], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${bkp.backupRef}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const dateFilteredSales = allSales.filter(
    (s) =>
      !s.isDeleted &&
      isWithinDateRange(s.saleDate, startDate, endDate) &&
      (activeRole === 'salesperson' ? s.staffName === activeStaffName : true)
  );
  const dateFilteredPurchases = allPurchases.filter(
    (p) => !p.isDeleted && isWithinDateRange(p.purchaseDate, startDate, endDate)
  );
  const dateFilteredExpenses = allExpenses.filter(
    (e) => !e.isDeleted && isWithinDateRange(e.expenseDate, startDate, endDate)
  );
  const dateFilteredPayments = allPayments.filter((pay) =>
    isWithinDateRange(pay.paymentDate, startDate, endDate)
  );
  const dateFilteredBookings = allBookings.filter((b) =>
    isWithinDateRange(b.appointmentDate, startDate, endDate)
  );

  const totalRevenue = dateFilteredSales.reduce((sum, s) => sum + Number(s.totalAmount || 0), 0);
  const totalCOGS = dateFilteredSales.reduce((sum, s) => sum + Number(s.totalCost || 0), 0);
  const grossProfit = totalRevenue - totalCOGS;
  const totalExpenses = dateFilteredExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const netProfit = grossProfit - totalExpenses;

  const activeAllSales = allSales.filter((s) => !s.isDeleted);
  const activeAllPurchases = allPurchases.filter((p) => !p.isDeleted);
  const activeAllExpenses = allExpenses.filter((e) => !e.isDeleted && e.paymentStatus === 'paid');

  const totalCashInAll =
    activeAllSales.reduce((sum, s) => sum + Number(s.amountPaid || 0), 0) +
    allPayments
      .filter((p) => p.paymentType === 'customer_receipt')
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const totalCashOutAll =
    activeAllPurchases.reduce((sum, p) => sum + Number(p.amountPaid || 0), 0) +
    allPayments
      .filter((p) => p.paymentType === 'supplier_payment')
      .reduce((sum, p) => sum + Number(p.amount || 0), 0) +
    activeAllExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);

  const realTimeCashBalance = openingCash + totalCashInAll - totalCashOutAll;

  const totalReceivables = customers.reduce(
    (sum, c) => sum + Number(c.outstandingBalance || 0),
    0
  );
  const totalPayables = suppliers.reduce(
    (sum, s) => sum + Number(s.outstandingBalance || 0),
    0
  );

  const productsCatalog = catalog.filter(
    (c) => !c.isDeleted && c.itemType === 'product'
  );
  const lowStockProducts = productsCatalog.filter((p) => p.currentStock <= p.reorderLevel);

  const handleTriggerReorder = (itemsToReorder: CatalogItem[]) => {
    const mapped = itemsToReorder.map((item) => ({
      itemId: item.id,
      quantity: Math.max(item.reorderLevel * 2 - item.currentStock, item.reorderLevel, 10),
      unitCost: Number(item.costPrice || 0),
    }));
    setPreselectedReorderItems(mapped);
    setLowStockNotificationOpen(false);
    setPurchaseModalOpen(true);
  };

  const navItems: Array<{
    id: NavTab;
    label: string;
    section: string;
    icon: React.FC<{ className?: string }>;
    roles: RoleType[];
    count?: string | number;
  }> = [
    {
      id: 'dashboard',
      label: 'Home Dashboard',
      section: 'Operations',
      icon: LayoutDashboard,
      roles: ['owner'],
    },
    {
      id: 'sales',
      label: 'Point of Sale (POS)',
      section: 'Operations',
      icon: ShoppingBag,
      roles: ['owner', 'salesperson', 'receptionist'],
      count: dateFilteredSales.length > 0 ? dateFilteredSales.length : undefined,
    },
    ...(bookingEnabled
      ? [
          {
            id: 'bookings' as NavTab,
            label: 'Appointments',
            section: 'Operations',
            icon: Calendar,
            roles: ['owner', 'salesperson', 'receptionist'] as RoleType[],
            count: dateFilteredBookings.filter(
              (b) => b.status === 'booked' || b.status === 'arrived'
            ).length || undefined,
          },
        ]
      : []),
    {
      id: 'inventory',
      label: 'Products & Services',
      section: 'Operations',
      icon: Package,
      roles: ['owner', 'salesperson'],
      count: lowStockProducts.length > 0 ? `${lowStockProducts.length} Low` : undefined,
    },
    {
      id: 'parties',
      label: 'Customers & Debts',
      section: 'Money & Accounts',
      icon: Users,
      roles: ['owner', 'salesperson', 'receptionist'],
      count: customers.filter((c) => Number(c.outstandingBalance || 0) > 0).length > 0
        ? `${customers.filter((c) => Number(c.outstandingBalance || 0) > 0).length} Due`
        : undefined,
    },
    {
      id: 'purchases',
      label: 'Suppliers & Restock',
      section: 'Money & Accounts',
      icon: Truck,
      roles: ['owner'],
      count: suppliers.filter((s) => Number(s.outstandingBalance || 0) > 0).length > 0
        ? `${suppliers.filter((s) => Number(s.outstandingBalance || 0) > 0).length} Owed`
        : undefined,
    },
    {
      id: 'expenses',
      label: 'Shop Expenses',
      section: 'Money & Accounts',
      icon: Receipt,
      roles: ['owner'],
    },
    {
      id: 'reports',
      label: 'Reports & Day Book',
      section: 'Insights & Settings',
      icon: BarChart3,
      roles: ['owner'],
    },
    {
      id: 'import',
      label: 'Excel Import',
      section: 'Insights & Settings',
      icon: FileSpreadsheet,
      roles: ['owner'],
    },
    {
      id: 'audit_settings',
      label: 'Settings & Team',
      section: 'Insights & Settings',
      icon: ShieldCheck,
      roles: ['owner'],
    },
  ];

  const visibleNavItems = navItems.filter((item) => item.roles.includes(activeRole));
  const sections = Array.from(new Set(visibleNavItems.map((i) => i.section)));

  const applyQuickDatePreset = (preset: 'all' | 'today' | 'month' | 'custom') => {
    setDatePreset(preset);
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
      setShowCustomDate(false);
    } else if (preset === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
      setShowCustomDate(false);
    } else if (preset === 'month') {
      const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      setStartDate(firstOfMonth);
      setEndDate(todayStr);
      setShowCustomDate(false);
    } else if (preset === 'custom') {
      setShowCustomDate(true);
    }
  };

  // Fast POS Cart actions
  const handleAddToCart = (item: CatalogItem) => {
    setPosCart((prev) => {
      const existing = prev.find((entry) => entry.item.id === item.id);
      if (existing) {
        return prev.map((entry) =>
          entry.item.id === item.id ? { ...entry, quantity: entry.quantity + 1 } : entry
        );
      }
      return [...prev, { item, quantity: 1 }];
    });
  };

  const handleUpdateCartQty = (itemId: number, delta: number) => {
    setPosCart((prev) =>
      prev
        .map((entry) => {
          if (entry.item.id === itemId) {
            const nextQty = entry.quantity + delta;
            return nextQty > 0 ? { ...entry, quantity: nextQty } : null;
          }
          return entry;
        })
        .filter(Boolean) as Array<{ item: CatalogItem; quantity: number }>
    );
  };

  const handleRemoveFromCart = (itemId: number) => {
    setPosCart((prev) => prev.filter((entry) => entry.item.id !== itemId));
  };

  const handleClearCart = () => {
    setPosCart([]);
    setPosCustomerId('');
    setPosPaymentMethod('cash');
    setPosAmountPaid('');
    setPosNotes('');
    setPosError('');
  };

  const handlePosCheckout = async () => {
    if (posCart.length === 0) {
      setPosError('Select at least one product or service to checkout.');
      return;
    }
    const totalAmount = posCart.reduce(
      (sum, entry) => sum + entry.quantity * Number(entry.item.sellingPrice || 0),
      0
    );
    if (posPaymentMethod === 'credit' && !posCustomerId) {
      setPosError('Please choose or add a Customer when selling on Credit.');
      return;
    }
    const effectivePaid =
      posPaymentMethod === 'credit'
        ? Math.min(totalAmount, Math.max(0, Number(posAmountPaid || 0)))
        : totalAmount;

    setPosSubmitting(true);
    setPosError('');
    try {
      const selectedCustomer = customers.find((c) => String(c.id) === posCustomerId);
      const today = new Date().toISOString().split('T')[0];
      const res = await authedFetch('/api/sales', {
        method: 'POST',
        body: JSON.stringify({
          saleDate: today,
          customerId: posCustomerId ? Number(posCustomerId) : null,
          customerName: selectedCustomer ? selectedCustomer.name : 'Walk-in Customer',
          staffName: activeStaffName,
          paymentMethod: posPaymentMethod,
          amountPaid: effectivePaid,
          notes: posNotes,
          items: posCart.map((entry) => ({
            itemId: entry.item.id,
            quantity: entry.quantity,
            unitPrice: Number(entry.item.sellingPrice || 0),
          })),
        }),
      });
      setWorkspace(res.workspace);
      handleClearCart();
      if (res.sale) {
        setReceiptToPrint(res.sale);
      }
    } catch (err: any) {
      setPosError(err.message || 'Failed to complete sale');
    } finally {
      setPosSubmitting(false);
    }
  };

  const cardSurface = isDark
    ? 'bg-[#171B22] border-[#252B37]'
    : 'bg-white border-[#E8E4DD] shadow-xs';

  const activeNavItem = navItems.find((item) => item.id === activeTab);

  return (
    <div
      className={`min-h-screen flex flex-col lg:flex-row ${
        isDark ? 'bg-[#0F1217] text-slate-100' : 'bg-[#FAF8F5] text-slate-900'
      }`}
    >
      {/* FRIENDLY, CLEAN SIDEBAR NAVIGATION */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 transform border-r transition-transform duration-200 lg:static lg:translate-x-0 flex flex-col justify-between ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } ${
          isDark
            ? 'bg-[#171B22] border-[#252B37] text-slate-100'
            : 'bg-white border-[#E8E4DD] text-slate-900'
        }`}
      >
        <div className="overflow-y-auto">
          <div className="px-6 py-5 border-b border-slate-200 dark:border-[#252B37] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-700 text-white font-mono-num font-bold text-xs flex items-center justify-center shadow-xs">
                TZS
              </div>
              <div className="min-w-0">
                <div className="font-display font-semibold text-base leading-snug truncate">
                  {settings?.businessName || 'Kariakoo Glow & Retail Hub'}
                </div>
                <div className="text-xs opacity-65">Simple Retail & Spa ERP</div>
              </div>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden rounded-xl p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 space-y-5">
            {sections.map((sectionName) => (
              <div key={sectionName} className="space-y-1">
                <div className="px-3.5 py-1 text-xs font-semibold opacity-50 uppercase tracking-wider">
                  {sectionName}
                </div>
                {visibleNavItems
                  .filter((item) => item.section === sectionName)
                  .map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveTab(item.id);
                          setMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-semibold transition cursor-pointer ${
                          isActive
                            ? 'bg-emerald-700 text-white shadow-xs'
                            : isDark
                            ? 'text-slate-300 hover:bg-[#252B37]/60'
                            : 'text-slate-700 hover:bg-[#FAF8F5]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="w-4 h-4 shrink-0" />
                          <span>{item.label}</span>
                        </div>
                        {item.count !== undefined && (
                          <span
                            className={`text-xs font-mono-num font-semibold ${
                              isActive
                                ? 'text-emerald-100'
                                : 'text-amber-700 dark:text-amber-400'
                            }`}
                          >
                            {item.count}
                          </span>
                        )}
                      </button>
                    );
                  })}
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar Footer: User Profile & Sign Out */}
        <div className="p-4 border-t border-slate-200 dark:border-[#252B37] space-y-2">
          <div className="flex items-center justify-between text-sm px-1">
            <div className="truncate pr-2">
              <div className="font-semibold truncate text-sm">{activeStaffName}</div>
              <div className="text-xs text-emerald-700 dark:text-emerald-400 font-medium capitalize">
                {activeRole} View
              </div>
            </div>
            <button
              onClick={() => signOut(auth)}
              title="Sign Out"
              className="rounded-xl p-2 text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT SHELL */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* STREAMLINED, UNCLUTTERED TOP HEADER */}
        <header
          className={`sticky top-0 z-30 border-b px-5 lg:px-8 py-3.5 ${
            isDark
              ? 'bg-[#171B22]/95 border-[#252B37] backdrop-blur-md'
              : 'bg-white/95 border-[#E8E4DD] backdrop-blur-md'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Left: Mobile Menu + Active View Name */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden rounded-xl border p-2 border-slate-300 dark:border-slate-700 cursor-pointer"
              >
                <Menu className="w-5 h-5" />
              </button>

              <div>
                <h1 className="font-display font-semibold text-base sm:text-lg leading-tight">
                  {activeNavItem?.label || 'Overview'}
                </h1>
                <p className="text-xs opacity-65 hidden sm:block">
                  TZS Currency · {settings?.businessName || 'Kariakoo Glow'}
                </p>
              </div>
            </div>

            {/* Center: Clean Segmented Date Filter */}
            <div className="flex items-center gap-2">
              <div
                className={`inline-flex items-center p-1 rounded-xl border text-xs font-semibold ${
                  isDark ? 'bg-[#0F1217] border-[#252B37]' : 'bg-[#FAF8F5] border-[#E8E4DD]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => applyQuickDatePreset('all')}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    datePreset === 'all'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'opacity-70 hover:opacity-100'
                  }`}
                >
                  All Time
                </button>
                <button
                  type="button"
                  onClick={() => applyQuickDatePreset('today')}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    datePreset === 'today'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'opacity-70 hover:opacity-100'
                  }`}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => applyQuickDatePreset('month')}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    datePreset === 'month'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'opacity-70 hover:opacity-100'
                  }`}
                >
                  This Month
                </button>
                <button
                  type="button"
                  onClick={() => applyQuickDatePreset('custom')}
                  className={`p-1.5 rounded-lg transition cursor-pointer ${
                    datePreset === 'custom' || showCustomDate
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'opacity-70 hover:opacity-100'
                  }`}
                  title="Pick specific dates"
                >
                  <Calendar className="w-3.5 h-3.5" />
                </button>
              </div>

              {showCustomDate && (
                <div
                  className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs ${
                    isDark ? 'bg-[#0F1217] border-[#252B37]' : 'bg-[#FAF8F5] border-[#E8E4DD]'
                  }`}
                >
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-transparent font-mono-num focus:outline-none"
                  />
                  <span className="opacity-40">to</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-transparent font-mono-num focus:outline-none"
                  />
                </div>
              )}
            </div>

            {/* Right: Cash on Hand, Alerts, Role, Theme & Primary Action */}
            <div className="flex items-center gap-2.5">
              {/* Cash On Hand Badge */}
              {activeRole === 'owner' && (
                <div
                  className={`hidden md:flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold ${
                    isDark ? 'bg-[#0F1217] border-[#252B37]' : 'bg-[#FAF8F5] border-[#E8E4DD]'
                  }`}
                  title="Real-time cash in shop and accounts"
                >
                  <Wallet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="opacity-70">Cash:</span>
                  <span className="font-mono-num font-bold text-emerald-700 dark:text-emerald-400">
                    {formatTZS(realTimeCashBalance)}
                  </span>
                </div>
              )}

              {/* Low Stock Notification Bell */}
              <div className="relative no-print">
                <button
                  type="button"
                  onClick={() => setLowStockNotificationOpen((prev) => !prev)}
                  className={`relative p-2 rounded-xl border transition cursor-pointer ${
                    lowStockProducts.length > 0
                      ? isDark
                        ? 'bg-amber-950/40 border-amber-500/40 text-amber-300'
                        : 'bg-amber-50 border-amber-300 text-amber-900'
                      : isDark
                      ? 'bg-[#0F1217] border-[#252B37] text-slate-400 hover:text-slate-200'
                      : 'bg-[#FAF8F5] border-[#E8E4DD] text-slate-600 hover:text-slate-900'
                  }`}
                  title="Stock Alerts"
                >
                  <Bell className="w-4 h-4" />
                  {lowStockProducts.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-600 text-white font-mono-num text-[10px] font-bold flex items-center justify-center">
                      {lowStockProducts.length}
                    </span>
                  )}
                </button>

                {lowStockNotificationOpen && (
                  <div
                    className={`absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border shadow-2xl z-50 overflow-hidden ${
                      isDark
                        ? 'bg-[#171B22] border-[#252B37] text-slate-100'
                        : 'bg-white border-[#E8E4DD] text-slate-900'
                    }`}
                  >
                    <div className="p-4 border-b border-slate-200 dark:border-[#252B37] flex items-center justify-between bg-amber-500/10">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                        <div>
                          <div className="font-display font-semibold text-sm">
                            Low Stock Alerts
                          </div>
                          <div className="text-[11px] opacity-75">
                            {lowStockProducts.length > 0
                              ? `${lowStockProducts.length} item(s) need restocking`
                              : 'All inventory items are well stocked'}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setLowStockNotificationOpen(false)}
                        className="rounded-lg p-1 hover:bg-slate-500/10 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-200 dark:divide-[#252B37]">
                      {lowStockProducts.length > 0 ? (
                        lowStockProducts.map((item) => {
                          const suggestedQty = Math.max(
                            item.reorderLevel * 2 - item.currentStock,
                            item.reorderLevel,
                            10
                          );
                          const estReorderCost = suggestedQty * Number(item.costPrice || 0);
                          return (
                            <div
                              key={item.id}
                              className="p-3.5 hover:bg-slate-500/5 flex items-center justify-between gap-3"
                            >
                              <div className="min-w-0">
                                <span className="font-semibold text-xs sm:text-sm truncate block">
                                  {item.name}
                                </span>
                                <div className="text-[11px] font-mono-num mt-0.5">
                                  <span
                                    className={`font-bold ${
                                      item.currentStock <= 0
                                        ? 'text-rose-600 dark:text-rose-400'
                                        : 'text-amber-700 dark:text-amber-400'
                                    }`}
                                  >
                                    {item.currentStock <= 0
                                      ? 'OUT OF STOCK'
                                      : `${item.currentStock} ${item.unit || 'pcs'} left`}
                                  </span>{' '}
                                  <span className="opacity-65">
                                    · Alert at {item.reorderLevel}
                                  </span>
                                </div>
                                <div className="text-[11px] opacity-75 font-mono-num mt-0.5">
                                  Suggest +{suggestedQty} ({formatTZS(estReorderCost)})
                                </div>
                              </div>

                              {activeRole === 'owner' && (
                                <button
                                  type="button"
                                  onClick={() => handleTriggerReorder([item])}
                                  className="shrink-0 rounded-xl bg-emerald-700 hover:bg-emerald-800 px-3 py-1.5 text-xs font-semibold text-white transition cursor-pointer"
                                >
                                  Reorder
                                </button>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <div className="p-6 text-center text-xs opacity-70">
                          All products are well stocked above reorder levels!
                        </div>
                      )}
                    </div>

                    {lowStockProducts.length > 0 && activeRole === 'owner' && (
                      <div
                        className={`p-3 border-t flex items-center justify-end ${
                          isDark
                            ? 'bg-[#0F1217] border-[#252B37]'
                            : 'bg-[#FAF8F5] border-[#E8E4DD]'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => handleTriggerReorder(lowStockProducts)}
                          className="rounded-xl bg-amber-600 hover:bg-amber-700 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition cursor-pointer"
                        >
                          Reorder All ({lowStockProducts.length})
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Role Switcher */}
              <div
                className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs ${
                  isDark ? 'bg-[#0F1217] border-[#252B37]' : 'bg-[#FAF8F5] border-[#E8E4DD]'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                <select
                  value={activeRole}
                  onChange={(e) => {
                    const nextRole = e.target.value as RoleType;
                    setActiveRole(nextRole);
                    if (nextRole === 'salesperson') {
                      const sp = staff.find((s) => s.role === 'salesperson');
                      if (sp) setActiveStaffName(sp.name);
                    } else if (nextRole === 'receptionist') {
                      const rc = staff.find((s) => s.role === 'receptionist');
                      if (rc) setActiveStaffName(rc.name);
                    } else {
                      const ow = staff.find((s) => s.role === 'owner');
                      if (ow) setActiveStaffName(ow.name);
                    }
                  }}
                  className="bg-transparent font-semibold focus:outline-none cursor-pointer text-xs"
                >
                  <option value="owner" className="text-slate-900">
                    Owner
                  </option>
                  <option value="salesperson" className="text-slate-900">
                    Sales Staff
                  </option>
                  <option value="receptionist" className="text-slate-900">
                    Receptionist
                  </option>
                </select>
              </div>

              {/* Theme Toggle */}
              <button
                type="button"
                onClick={handleToggleTheme}
                className={`p-2 rounded-xl border transition cursor-pointer ${
                  isDark
                    ? 'bg-[#0F1217] border-[#252B37] text-amber-400 hover:bg-slate-800'
                    : 'bg-[#FAF8F5] border-[#E8E4DD] text-slate-700 hover:bg-slate-200'
                }`}
                title="Toggle Light/Dark Theme"
              >
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              {/* Contextual Primary Action Button */}
              {activeTab === 'bookings' && bookingEnabled ? (
                <button
                  type="button"
                  onClick={() => setBookingModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-amber-700 hover:bg-amber-800 px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-white shadow-xs transition cursor-pointer"
                >
                  <Calendar className="w-4 h-4" />
                  <span>+ New Booking</span>
                </button>
              ) : activeTab === 'inventory' && activeRole === 'owner' ? (
                <button
                  type="button"
                  onClick={() => openEditOrCreateItem(undefined, 'product')}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-white shadow-xs transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Add Product</span>
                </button>
              ) : activeTab === 'purchases' && activeRole === 'owner' ? (
                <button
                  type="button"
                  onClick={() => {
                    setPreselectedReorderItems(null);
                    setPurchaseModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-white shadow-xs transition cursor-pointer"
                >
                  <Truck className="w-4 h-4" />
                  <span>+ Record Restock</span>
                </button>
              ) : activeTab === 'parties' ? (
                <button
                  type="button"
                  onClick={() =>
                    setPaymentModalConfig({ isOpen: true, mode: 'customer_receipt' })
                  }
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-white shadow-xs transition cursor-pointer"
                >
                  <Wallet className="w-4 h-4" />
                  <span>+ Collect Money</span>
                </button>
              ) : activeTab === 'expenses' && activeRole === 'owner' ? (
                <button
                  type="button"
                  onClick={() => setExpenseModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-rose-700 hover:bg-rose-800 px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-white shadow-xs transition cursor-pointer"
                >
                  <Receipt className="w-4 h-4" />
                  <span>+ Add Expense</span>
                </button>
              ) : activeTab === 'sales' ? (
                <button
                  type="button"
                  onClick={() => {
                    setPreselectedSaleItemId(null);
                    setSaleModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-600/40 bg-emerald-600/10 hover:bg-emerald-600/20 px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-emerald-700 dark:text-emerald-300 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Voucher Modal</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setPreselectedSaleItemId(null);
                    setSaleModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-white shadow-xs transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ New Sale</span>
                </button>
              )}
            </div>
          </div>
        </header>

        {/* MAIN PAGE CONTENT */}
        <main className="flex-1 p-5 lg:p-8 space-y-8 overflow-y-auto max-w-[1440px] w-full mx-auto">
          {apiError && (
            <div className="rounded-2xl bg-red-500/10 border border-red-500/30 p-4 text-sm font-semibold text-red-500 flex items-center justify-between">
              <span>{apiError}</span>
              <button onClick={() => setApiError('')} className="underline">
                Dismiss
              </button>
            </div>
          )}

          {/* LOW STOCK REORDER NOTIFICATION BANNER */}
          {lowStockProducts.length > 0 && !lowStockBannerDismissed && (
            <div
              className={`rounded-2xl border p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 no-print ${
                isDark
                  ? 'bg-amber-950/25 border-amber-500/35 text-amber-200'
                  : 'bg-amber-50/90 border-amber-300 text-amber-950'
              }`}
            >
              <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0 text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="font-display font-semibold text-sm sm:text-base flex flex-wrap items-center gap-2">
                    <span>
                      Low Stock Reorder Alert: {lowStockProducts.length}{' '}
                      {lowStockProducts.length === 1 ? 'item needs' : 'items need'} restocking
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm opacity-85 mt-0.5 truncate">
                    {lowStockProducts
                      .slice(0, 4)
                      .map(
                        (item) =>
                          `${item.name} (${item.currentStock} ${item.unit || 'pcs'} left, alert at ${
                            item.reorderLevel
                          })`
                      )
                      .join(' · ')}
                    {lowStockProducts.length > 4
                      ? ` · +${lowStockProducts.length - 4} more`
                      : ''}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                {activeRole === 'owner' && (
                  <button
                    type="button"
                    onClick={() => handleTriggerReorder(lowStockProducts)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-xs transition cursor-pointer whitespace-nowrap"
                  >
                    <Truck className="w-4 h-4" />
                    <span>Reorder Low Stock ({lowStockProducts.length})</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setLowStockNotificationOpen(true)}
                  className={`rounded-xl border px-3.5 py-2 text-xs sm:text-sm font-semibold transition cursor-pointer whitespace-nowrap ${
                    isDark
                      ? 'border-amber-500/40 hover:bg-amber-950/50 text-amber-200'
                      : 'border-amber-300 hover:bg-amber-100 text-amber-900'
                  }`}
                >
                  Inspect List
                </button>
                <button
                  type="button"
                  onClick={() => setLowStockBannerDismissed(true)}
                  className="rounded-xl p-2 opacity-70 hover:opacity-100 transition cursor-pointer"
                  title="Dismiss notification banner"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* 1. HOME OVERVIEW DASHBOARD */}
          {activeTab === 'dashboard' && activeRole === 'owner' && (
            <FriendlyDashboardView
              sales={dateFilteredSales}
              saleItems={allSaleItems}
              catalog={catalog}
              expenses={dateFilteredExpenses}
              bookings={dateFilteredBookings}
              customers={customers}
              suppliers={suppliers}
              lowStockProducts={lowStockProducts}
              bookingEnabled={bookingEnabled}
              netProfit={netProfit}
              totalRevenue={totalRevenue}
              totalExpenses={totalExpenses}
              realTimeCashBalance={realTimeCashBalance}
              totalCashInAll={totalCashInAll}
              totalCashOutAll={totalCashOutAll}
              totalReceivables={totalReceivables}
              totalPayables={totalPayables}
              onNavigateTab={(tab) => setActiveTab(tab)}
              onOpenSaleModal={(itemId) => {
                setPreselectedSaleItemId(itemId || null);
                setSaleModalOpen(true);
              }}
              onOpenBookingModal={() => setBookingModalOpen(true)}
              onOpenPurchaseModal={() => {
                setPreselectedReorderItems(null);
                setPurchaseModalOpen(true);
              }}
              onOpenPaymentModal={(mode, partyId, invoiceId) =>
                setPaymentModalConfig({ isOpen: true, mode, partyId, invoiceId })
              }
              onCompleteBooking={(b) => setBookingToComplete(b)}
              onPrintSaleReceipt={(s) => setReceiptToPrint(s)}
              onReorderItems={handleTriggerReorder}
              isDark={isDark}
            />
          )}

          {/* 2. SALES & CHECKOUT (INTERACTIVE TOUCH POS REGISTER + SALES HISTORY) */}
          {activeTab === 'sales' && (
            <div className="space-y-6">
              {/* Segmented Sub-Navigation for Sales */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div
                  className={`inline-flex items-center p-1 rounded-2xl border text-xs sm:text-sm font-semibold ${
                    isDark ? 'bg-[#171B22] border-[#252B37]' : 'bg-white border-[#E8E4DD] shadow-xs'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setSalesSubTab('pos')}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl transition cursor-pointer ${
                      salesSubTab === 'pos'
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'opacity-70 hover:opacity-100'
                    }`}
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Quick POS Register</span>
                    {posCart.length > 0 && (
                      <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full bg-white text-emerald-800 text-xs font-bold font-mono-num">
                        {posCart.reduce((sum, e) => sum + e.quantity, 0)}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setSalesSubTab('history')}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl transition cursor-pointer ${
                      salesSubTab === 'history'
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'opacity-70 hover:opacity-100'
                    }`}
                  >
                    <Receipt className="w-4 h-4" />
                    <span>Sales Receipts & Day Book ({dateFilteredSales.length})</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setPreselectedSaleItemId(null);
                    setSaleModalOpen(true);
                  }}
                  className="inline-flex items-center gap-2 rounded-xl border border-emerald-600/40 bg-emerald-600/10 hover:bg-emerald-600/20 px-4 py-2 text-xs sm:text-sm font-semibold text-emerald-700 dark:text-emerald-300 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Full Multi-Item Voucher</span>
                </button>
              </div>

              {/* VIEW 1: FAST-TAP TOUCH POS REGISTER */}
              {salesSubTab === 'pos' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Left Column (8 cols): Catalog Grid & Search */}
                  <div className={`lg:col-span-8 rounded-2xl border p-5 sm:p-6 space-y-5 ${cardSurface}`}>
                    {/* Search & Categories Bar */}
                    <div className="space-y-3.5">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex-1 flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm ${
                            isDark ? 'bg-[#0F1217] border-[#252B37]' : 'bg-[#FAF8F5] border-[#E8E4DD]'
                          }`}
                        >
                          <Search className="w-4 h-4 opacity-50 shrink-0" />
                          <input
                            type="text"
                            placeholder="Type product name, service, or SKU to filter..."
                            value={posSearchQuery}
                            onChange={(e) => setPosSearchQuery(e.target.value)}
                            className="w-full bg-transparent focus:outline-none text-sm"
                          />
                          {posSearchQuery && (
                            <button
                              type="button"
                              onClick={() => setPosSearchQuery('')}
                              className="opacity-50 hover:opacity-100"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Category Tabs */}
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-semibold no-scrollbar">
                        {['All', ...Array.from(new Set(catalog.filter((c) => !c.isDeleted && c.category).map((c) => c.category)))].map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setPosCategoryFilter(cat)}
                            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition cursor-pointer ${
                              posCategoryFilter === cat
                                ? 'bg-emerald-700 text-white shadow-xs'
                                : isDark
                                ? 'bg-[#0F1217] text-slate-300 hover:bg-[#252B37]'
                                : 'bg-[#FAF8F5] text-slate-700 hover:bg-slate-200'
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Catalog Item Cards Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                      {catalog
                        .filter((c) => !c.isDeleted)
                        .filter((c) => posCategoryFilter === 'All' || c.category === posCategoryFilter)
                        .filter(
                          (c) =>
                            !posSearchQuery ||
                            c.name.toLowerCase().includes(posSearchQuery.toLowerCase()) ||
                            (c.sku && c.sku.toLowerCase().includes(posSearchQuery.toLowerCase()))
                        )
                        .map((item) => {
                          const isService = item.itemType === 'service';
                          const inCart = posCart.find((e) => e.item.id === item.id);
                          const isLow = !isService && item.currentStock <= item.reorderLevel;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => handleAddToCart(item)}
                              className={`relative text-left rounded-xl border p-3.5 flex flex-col justify-between gap-3 transition cursor-pointer group ${
                                inCart
                                  ? isDark
                                    ? 'bg-emerald-950/20 border-emerald-500/50'
                                    : 'bg-emerald-50/70 border-emerald-600/50 shadow-xs'
                                  : isDark
                                  ? 'bg-[#0F1217] border-[#252B37] hover:border-emerald-500/50 hover:bg-[#171B22]'
                                  : 'bg-[#FAF8F5] border-[#E8E4DD] hover:border-emerald-600/50 hover:bg-white'
                              }`}
                            >
                              <div>
                                <div className="flex items-center justify-between text-[11px] font-semibold opacity-70">
                                  <span>{isService ? 'Service' : `${item.currentStock} left`}</span>
                                  {isLow && (
                                    <span className="text-amber-600 dark:text-amber-400 font-bold">
                                      Low
                                    </span>
                                  )}
                                </div>
                                <div className="font-semibold text-xs sm:text-sm mt-1 line-clamp-2 leading-snug">
                                  {item.name}
                                </div>
                              </div>

                              <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-[#252B37]">
                                <span className="font-mono-num font-bold text-xs sm:text-sm text-emerald-700 dark:text-emerald-400">
                                  {formatTZS(item.sellingPrice)}
                                </span>
                                {inCart ? (
                                  <span className="w-5 h-5 rounded-full bg-emerald-700 text-white font-mono-num text-[11px] font-bold flex items-center justify-center">
                                    {inCart.quantity}
                                  </span>
                                ) : (
                                  <span className="text-xs font-semibold opacity-60 group-hover:opacity-100 group-hover:text-emerald-600">
                                    + Add
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      {catalog.filter((c) => !c.isDeleted).length === 0 && (
                        <div className="col-span-full py-12 text-center text-sm opacity-60">
                          No items in catalog. Go to Products & Services to add products or services.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column (4 cols): Active Order & Quick Checkout Cart */}
                  <div
                    className={`lg:col-span-4 rounded-2xl border p-5 sm:p-6 space-y-5 sticky top-20 ${cardSurface}`}
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-[#252B37]">
                      <div className="flex items-center gap-2 font-display font-semibold text-base">
                        <ShoppingBag className="w-4 h-4 text-emerald-600" />
                        <span>Current Sale Order</span>
                      </div>
                      {posCart.length > 0 && (
                        <button
                          type="button"
                          onClick={handleClearCart}
                          className="text-xs font-semibold text-rose-500 hover:underline cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </div>

                    {posError && (
                      <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-3 text-xs text-red-500 font-medium">
                        {posError}
                      </div>
                    )}

                    {/* Customer Picker */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-semibold opacity-75">
                        <label>Customer</label>
                        <button
                          type="button"
                          onClick={() => {
                            setPartyFormType('customer');
                            setPartyModalOpen(true);
                          }}
                          className="text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                        >
                          + New Client
                        </button>
                      </div>
                      <select
                        value={posCustomerId}
                        onChange={(e) => setPosCustomerId(e.target.value)}
                        className={`w-full rounded-xl border px-3 py-2 text-xs font-semibold focus:outline-none ${
                          isDark ? 'bg-[#0F1217] border-[#252B37]' : 'bg-[#FAF8F5] border-[#E8E4DD]'
                        }`}
                      >
                        <option value="">Walk-in Customer</option>
                        {customers.map((c) => {
                          const bal = Number(c.outstandingBalance || 0);
                          return (
                            <option key={c.id} value={String(c.id)}>
                              {c.name} {bal > 0 ? `(Owes ${formatTZS(bal)})` : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    {/* Cart Items List */}
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {posCart.map((entry) => {
                        const lineTotal = entry.quantity * Number(entry.item.sellingPrice || 0);
                        return (
                          <div
                            key={entry.item.id}
                            className={`rounded-xl border p-2.5 flex items-center justify-between gap-2 text-xs ${
                              isDark ? 'bg-[#0F1217] border-[#252B37]' : 'bg-[#FAF8F5] border-[#E8E4DD]'
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold truncate">{entry.item.name}</div>
                              <div className="text-[11px] opacity-65 font-mono-num">
                                {formatTZS(entry.item.sellingPrice)} each
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleUpdateCartQty(entry.item.id, -1)}
                                className="w-6 h-6 rounded-lg border border-slate-300 dark:border-slate-700 flex items-center justify-center hover:bg-slate-500/10 cursor-pointer font-bold"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="font-mono-num font-bold w-6 text-center text-xs">
                                {entry.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleUpdateCartQty(entry.item.id, 1)}
                                className="w-6 h-6 rounded-lg border border-slate-300 dark:border-slate-700 flex items-center justify-center hover:bg-slate-500/10 cursor-pointer font-bold"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>

                            <div className="text-right shrink-0 font-mono-num font-bold w-20">
                              {formatTZS(lineTotal)}
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveFromCart(entry.item.id)}
                              className="text-slate-400 hover:text-rose-500 p-1 cursor-pointer shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                      {posCart.length === 0 && (
                        <div className="py-8 text-center text-xs opacity-60">
                          Tap any item on the left to add it to this sale.
                        </div>
                      )}
                    </div>

                    {/* Payment Method Selector */}
                    <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-[#252B37]">
                      <label className="block text-xs font-semibold opacity-75">Payment Method</label>
                      <div className="grid grid-cols-2 gap-1.5 text-xs font-semibold">
                        {[
                          { id: 'cash', label: 'Cash' },
                          { id: 'mobile_money', label: 'M-Pesa / Tigo' },
                          { id: 'card', label: 'Bank / Card' },
                          { id: 'credit', label: 'Credit (Lipa Baadaye)' },
                        ].map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() =>
                              setPosPaymentMethod(m.id as 'cash' | 'mobile_money' | 'card' | 'credit')
                            }
                            className={`py-2 px-2.5 rounded-xl border text-center transition cursor-pointer text-xs truncate ${
                              posPaymentMethod === m.id
                                ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                                : isDark
                                ? 'bg-[#0F1217] border-[#252B37] text-slate-300 hover:bg-[#252B37]'
                                : 'bg-[#FAF8F5] border-[#E8E4DD] text-slate-700 hover:bg-slate-200'
                            }`}
                          >
                            {m.label}
                          </button>
                        ))}
                      </div>

                      {posPaymentMethod === 'credit' && (
                        <div className="space-y-1 pt-1">
                          <label className="block text-[11px] font-semibold opacity-75">
                            Amount Paid Now (TZS) · Balance is tracked as Debt
                          </label>
                          <input
                            type="number"
                            min={0}
                            placeholder="0 (Fully Unpaid)"
                            value={posAmountPaid}
                            onChange={(e) => setPosAmountPaid(e.target.value)}
                            className={`w-full rounded-xl border px-3 py-1.5 text-xs font-mono-num font-semibold ${
                              isDark ? 'bg-[#0F1217] border-[#252B37]' : 'bg-[#FAF8F5] border-[#E8E4DD]'
                            }`}
                          />
                        </div>
                      )}
                    </div>

                    {/* Total & Complete Checkout Button */}
                    <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-[#252B37]">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold opacity-75">Total to Pay:</span>
                        <span className="font-mono-num font-bold text-xl text-emerald-700 dark:text-emerald-400">
                          {formatTZS(
                            posCart.reduce(
                              (sum, e) => sum + e.quantity * Number(e.item.sellingPrice || 0),
                              0
                            )
                          )}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={handlePosCheckout}
                        disabled={posSubmitting || posCart.length === 0}
                        className="w-full rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 py-3 px-4 font-semibold text-white shadow-xs transition flex items-center justify-center gap-2 cursor-pointer text-sm"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>
                          {posSubmitting
                            ? 'Processing...'
                            : posCart.length === 0
                            ? 'Select Items to Charge'
                            : `Complete Sale & Print Receipt`}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* VIEW 2: SALES HISTORY & RECEIPTS DAY BOOK */}
              {salesSubTab === 'history' && (
                <div className={`rounded-2xl border overflow-hidden ${cardSurface}`}>
                  <div className="p-6 border-b border-slate-200 dark:border-[#252B37] flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h2 className="font-display text-xl font-semibold">
                        Sales Receipts & Day Book
                      </h2>
                      <p className="text-sm opacity-75">
                        {activeRole === 'salesperson'
                          ? `Sales recorded by ${activeStaffName} · Finalized sales are locked`
                          : 'All Cash, M-Pesa, Card, and Credit sales in TZS'}
                      </p>
                    </div>
                    <div
                      className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm ${
                        isDark ? 'bg-[#0F1217] border-[#252B37]' : 'bg-[#FAF8F5] border-[#E8E4DD]'
                      }`}
                    >
                      <Search className="w-4 h-4 opacity-60" />
                      <input
                        type="text"
                        placeholder="Search customer or receipt..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-transparent focus:outline-none text-sm"
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr
                          className={`border-b ${
                            isDark
                              ? 'bg-[#0F1217] border-[#252B37] text-slate-400'
                              : 'bg-[#FAF8F5] border-[#E8E4DD] text-slate-600'
                          }`}
                        >
                          <th className="py-3.5 px-5 font-semibold">Receipt</th>
                          <th className="py-3.5 px-4 font-semibold">Date</th>
                          <th className="py-3.5 px-4 font-semibold">Customer</th>
                          <th className="py-3.5 px-5 font-semibold">Items Sold</th>
                          <th className="py-3.5 px-4 font-semibold">Staff</th>
                          <th className="py-3.5 px-4 font-semibold">Payment</th>
                          <th className="py-3.5 px-5 font-semibold text-right">Total (TZS)</th>
                          <th className="py-3.5 px-5 font-semibold text-right">Status</th>
                          <th className="py-3.5 px-5 font-semibold text-center">Print Receipt</th>
                          <th className="py-3.5 px-5 font-semibold text-center">Access</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-[#252B37]">
                        {allSales
                          .filter((s) =>
                            activeRole === 'salesperson'
                              ? !s.isDeleted && s.staffName === activeStaffName
                              : true
                          )
                          .filter((s) => isWithinDateRange(s.saleDate, startDate, endDate))
                          .filter(
                            (s) =>
                              !searchQuery ||
                              s.invoiceNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              s.customerName.toLowerCase().includes(searchQuery.toLowerCase())
                          )
                          .map((s) => {
                            const items = allSaleItems.filter((si) => si.saleId === s.id);
                            return (
                              <tr
                                key={s.id}
                                className={`${
                                  s.isDeleted ? 'opacity-40 line-through' : 'hover:bg-slate-500/5'
                                }`}
                              >
                                <td className="py-4 px-5 font-mono-num font-semibold text-emerald-700 dark:text-emerald-400">
                                  {s.invoiceNo}
                                </td>
                                <td className="py-4 px-4 font-mono-num opacity-80">{s.saleDate}</td>
                                <td className="py-4 px-4 font-semibold">{s.customerName}</td>
                                <td className="py-4 px-5">
                                  {items
                                    .map((it) => `${it.quantity}× ${it.itemName}`)
                                    .join(' · ')}
                                </td>
                                <td className="py-4 px-4 opacity-85">{s.staffName}</td>
                                <td className="py-4 px-4 capitalize">
                                  {s.paymentMethod.replace('_', ' ')}
                                </td>
                                <td className="py-4 px-5 text-right font-mono-num font-bold">
                                  {formatTZS(s.totalAmount)}
                                </td>
                                <td className="py-4 px-5 text-right font-mono-num">
                                  {Number(s.balanceDue) > 0 ? (
                                    <button
                                      onClick={() =>
                                        setPaymentModalConfig({
                                          isOpen: true,
                                          mode: 'customer_receipt',
                                          partyId: s.customerId,
                                          invoiceId: s.id,
                                        })
                                      }
                                      className="font-semibold text-amber-700 dark:text-amber-400 hover:underline cursor-pointer"
                                    >
                                      Owes {formatTZS(s.balanceDue)}
                                    </button>
                                  ) : (
                                    <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                                      Paid
                                    </span>
                                  )}
                                </td>
                                <td className="py-4 px-5 text-center">
                                  <button
                                    type="button"
                                    onClick={() => setReceiptToPrint(s)}
                                    className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                                      isDark
                                        ? 'bg-[#0F1217] border-[#252B37] text-slate-200 hover:border-emerald-500/60'
                                        : 'bg-[#FAF8F5] border-[#E8E4DD] text-slate-700 hover:border-emerald-600/60'
                                    }`}
                                  >
                                    <Printer className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Print Receipt</span>
                                  </button>
                                </td>
                                <td className="py-4 px-5 text-center">
                                  {activeRole !== 'owner' ? (
                                    <span className="inline-flex items-center gap-1 text-xs opacity-65">
                                      <Lock className="w-3.5 h-3.5" /> Locked
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        const res = await authedFetch('/api/records/soft-delete', {
                                          method: 'POST',
                                          body: JSON.stringify({
                                            entityType: 'sale',
                                            id: s.id,
                                            isDeleted: !s.isDeleted,
                                          }),
                                        });
                                        setWorkspace(res.workspace);
                                      }}
                                      className="text-xs font-semibold text-rose-500 hover:underline cursor-pointer"
                                    >
                                      {s.isDeleted ? 'Restore' : 'Void'}
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        {allSales.length === 0 && (
                          <tr>
                            <td colSpan={10} className="py-8 text-center text-sm opacity-60">
                              No sales recorded yet. Use the Quick POS Register to make your first sale!
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3. BOOKINGS */}
          {activeTab === 'bookings' && bookingEnabled && (
            <div className="space-y-6">
              <div className={`rounded-2xl border p-6 flex flex-wrap items-center justify-between gap-4 ${cardSurface}`}>
                <div>
                  <h2 className="font-display text-2xl font-semibold flex items-center gap-2.5">
                    <Sparkles className="w-6 h-6 text-amber-600" />
                    <span>Client Bookings & Appointments</span>
                  </h2>
                  <p className="text-sm opacity-75 mt-1">
                    Combine multiple services, consultations, or products in one booking. When
                    finished, click “Complete & Checkout” to move it directly to Sales.
                  </p>
                </div>
                <button
                  onClick={() => setBookingModalOpen(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-amber-700 hover:bg-amber-800 px-5 py-3 text-sm font-semibold text-white shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> New Booking
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {dateFilteredBookings.map((b) => {
                  let items: BookingLineItem[] = [];
                  try {
                    items = JSON.parse(b.itemsJson || '[]');
                  } catch {
                    items = [];
                  }
                  return (
                    <div
                      key={b.id}
                      className={`rounded-2xl border p-6 flex flex-col justify-between space-y-5 ${cardSurface}`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <span className="font-mono-num text-xs font-semibold text-amber-700 dark:text-amber-400">
                              {b.bookingNo} · {b.status.toUpperCase()}
                            </span>
                            <h3 className="font-display text-xl font-semibold mt-0.5">
                              {b.customerName}
                            </h3>
                            <p className="text-sm opacity-75">
                              {b.customerPhone || 'Walk-in Client'} · Staff: {b.assignedStaff}
                            </p>
                          </div>
                          <div className="text-right text-xs font-mono-num opacity-80 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" /> {b.appointmentDate} at{' '}
                            {b.appointmentTime}
                          </div>
                        </div>

                        <div
                          className={`mt-4 rounded-xl border p-4 space-y-2 ${
                            isDark
                              ? 'bg-[#0F1217] border-[#252B37]'
                              : 'bg-[#FAF8F5] border-[#E8E4DD]'
                          }`}
                        >
                          <div className="text-xs font-semibold opacity-65">
                            Selected Services & Products ({items.length})
                          </div>
                          {items.map((it, idx) => (
                            <div key={idx} className="flex items-center justify-between text-sm">
                              <span>
                                {it.quantity}× {it.itemName}{' '}
                                <span className="opacity-60 text-xs capitalize">
                                  ({it.itemType})
                                </span>
                              </span>
                              <span className="font-mono-num font-semibold">
                                {formatTZS(it.lineTotal)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="pt-4 border-t border-slate-200 dark:border-[#252B37] flex items-center justify-between">
                        <div>
                          <span className="text-xs opacity-70">Total Package</span>
                          <div className="text-lg font-bold font-mono-num text-emerald-700 dark:text-emerald-400">
                            {formatTZS(b.totalAmount)}
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5">
                          {b.status === 'booked' && (
                            <button
                              onClick={async () => {
                                const res = await authedFetch(`/api/bookings/${b.id}/status`, {
                                  method: 'PUT',
                                  body: JSON.stringify({ status: 'arrived' }),
                                });
                                setWorkspace(res.workspace);
                              }}
                              className="rounded-xl border border-blue-500/40 bg-blue-500/10 px-3.5 py-2 text-xs font-semibold text-blue-500 cursor-pointer"
                            >
                              Mark Client Arrived
                            </button>
                          )}
                          {(b.status === 'booked' || b.status === 'arrived') && (
                            <button
                              onClick={() => setBookingToComplete(b)}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 px-4 py-2 text-xs font-semibold text-white cursor-pointer"
                            >
                              <CheckCircle2 className="w-4 h-4" /> Complete & Checkout
                            </button>
                          )}
                          {b.status === 'completed' && (
                            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                              <CheckCircle2 className="w-4 h-4" /> Added to Sales
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4. PRODUCTS & SERVICES CATALOG */}
          {activeTab === 'inventory' && (
            <div className="space-y-6">
              {/* Header with Sub-tabs and Actions */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div
                  className={`inline-flex items-center p-1 rounded-2xl border text-xs sm:text-sm font-semibold ${
                    isDark ? 'bg-[#171B22] border-[#252B37]' : 'bg-white border-[#E8E4DD] shadow-xs'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setInventorySubTab('all')}
                    className={`px-3.5 py-2 rounded-xl transition cursor-pointer ${
                      inventorySubTab === 'all'
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'opacity-70 hover:opacity-100'
                    }`}
                  >
                    All Items ({catalog.filter((c) => !c.isDeleted).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setInventorySubTab('products')}
                    className={`px-3.5 py-2 rounded-xl transition cursor-pointer ${
                      inventorySubTab === 'products'
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'opacity-70 hover:opacity-100'
                    }`}
                  >
                    Retail Products ({catalog.filter((c) => !c.isDeleted && c.itemType === 'product').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setInventorySubTab('services')}
                    className={`px-3.5 py-2 rounded-xl transition cursor-pointer ${
                      inventorySubTab === 'services'
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'opacity-70 hover:opacity-100'
                    }`}
                  >
                    Spa & Services ({catalog.filter((c) => !c.isDeleted && c.itemType === 'service').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setInventorySubTab('low_stock')}
                    className={`px-3.5 py-2 rounded-xl transition cursor-pointer ${
                      inventorySubTab === 'low_stock'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'opacity-70 hover:opacity-100 text-amber-700 dark:text-amber-400'
                    }`}
                  >
                    Low Stock ({lowStockProducts.length})
                  </button>
                </div>

                {activeRole === 'owner' && (
                  <div className="flex flex-wrap items-center gap-2.5">
                    {lowStockProducts.length > 0 && inventorySubTab === 'low_stock' && (
                      <button
                        type="button"
                        onClick={() => handleTriggerReorder(lowStockProducts)}
                        className="inline-flex items-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-700 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-xs cursor-pointer"
                      >
                        <Truck className="w-4 h-4" />
                        <span>Reorder All Low Items ({lowStockProducts.length})</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => openEditOrCreateItem(undefined, 'service')}
                      className="inline-flex items-center gap-2 rounded-xl border border-amber-600/40 bg-amber-500/10 hover:bg-amber-500/20 px-4 py-2 text-xs sm:text-sm font-semibold text-amber-700 dark:text-amber-300 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Service</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditOrCreateItem(undefined, 'product')}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-xs cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Retail Product</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Catalog Table Card */}
              <div className={`rounded-2xl border overflow-hidden ${cardSurface}`}>
                <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-[#252B37] flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="font-display text-xl font-semibold">
                      {inventorySubTab === 'products'
                        ? 'Retail Products (Tracked Stock)'
                        : inventorySubTab === 'services'
                        ? 'Spa & Salon Services'
                        : inventorySubTab === 'low_stock'
                        ? 'Items Needing Reorder'
                        : 'Products & Services Catalog'}
                    </h2>
                    <p className="text-sm opacity-75">
                      Prices in TZS · Current stock quantities update automatically upon sales & restock
                    </p>
                  </div>

                  <div
                    className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm ${
                      isDark ? 'bg-[#0F1217] border-[#252B37]' : 'bg-[#FAF8F5] border-[#E8E4DD]'
                    }`}
                  >
                    <Search className="w-4 h-4 opacity-50" />
                    <input
                      type="text"
                      placeholder="Search name, category, or SKU..."
                      value={inventorySearchQuery}
                      onChange={(e) => setInventorySearchQuery(e.target.value)}
                      className="bg-transparent focus:outline-none text-sm"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr
                        className={`border-b ${
                          isDark
                            ? 'bg-[#0F1217] border-[#252B37] text-slate-400'
                            : 'bg-[#FAF8F5] border-[#E8E4DD] text-slate-600'
                        }`}
                      >
                        <th className="py-3.5 px-5 font-semibold">Name & Code</th>
                        <th className="py-3.5 px-4 font-semibold">Type</th>
                        <th className="py-3.5 px-4 font-semibold">Category</th>
                        <th className="py-3.5 px-4 font-semibold text-right">Buying Cost</th>
                        <th className="py-3.5 px-4 font-semibold text-right">Selling Price</th>
                        <th className="py-3.5 px-4 font-semibold text-right">Purchased</th>
                        <th className="py-3.5 px-4 font-semibold text-right">Sold</th>
                        <th className="py-3.5 px-5 font-semibold text-right">Stock / Duration</th>
                        {activeRole === 'owner' && (
                          <th className="py-3.5 px-5 font-semibold text-right">Actions</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-[#252B37]">
                      {catalog
                        .filter((c) => !c.isDeleted)
                        .filter((c) => {
                          if (inventorySubTab === 'products') return c.itemType === 'product';
                          if (inventorySubTab === 'services') return c.itemType === 'service';
                          if (inventorySubTab === 'low_stock')
                            return c.itemType === 'product' && c.currentStock <= c.reorderLevel;
                          return true;
                        })
                        .filter(
                          (c) =>
                            !inventorySearchQuery ||
                            c.name.toLowerCase().includes(inventorySearchQuery.toLowerCase()) ||
                            (c.category && c.category.toLowerCase().includes(inventorySearchQuery.toLowerCase())) ||
                            (c.sku && c.sku.toLowerCase().includes(inventorySearchQuery.toLowerCase()))
                        )
                        .map((item) => {
                          const isService = item.itemType === 'service';
                          const isLow = !isService && item.currentStock <= item.reorderLevel;
                          return (
                            <tr key={item.id} className="hover:bg-slate-500/5">
                              <td className="py-4 px-5 font-semibold">
                                {item.name}
                                <span className="block text-xs font-mono-num opacity-60">
                                  {item.sku}
                                </span>
                              </td>
                              <td className="py-4 px-4 capitalize">
                                {isService
                                  ? 'Service / Session'
                                  : `Product (${item.unit || 'pcs'})`}
                              </td>
                              <td className="py-4 px-4 opacity-85">{item.category}</td>
                              <td className="py-4 px-4 text-right font-mono-num">
                                {formatTZS(item.costPrice)}
                              </td>
                              <td className="py-4 px-4 text-right font-mono-num font-bold">
                                {formatTZS(item.sellingPrice)}
                              </td>
                              <td className="py-4 px-4 text-right font-mono-num text-emerald-700 dark:text-emerald-400">
                                {isService ? '—' : `+${item.purchasedQty} ${item.unit || 'pcs'}`}
                              </td>
                              <td className="py-4 px-4 text-right font-mono-num">
                                {item.soldQty}
                              </td>
                              <td className="py-4 px-5 text-right font-mono-num font-bold">
                                {isService ? (
                                  <span className="opacity-60 font-normal">
                                    {item.durationMins} mins session
                                  </span>
                                ) : (
                                  <span
                                    className={
                                      isLow
                                        ? 'text-amber-700 dark:text-amber-400'
                                        : 'text-emerald-700 dark:text-emerald-400'
                                    }
                                  >
                                    {item.currentStock} {item.unit || 'pcs'} in stock{' '}
                                    {isLow ? '(Low)' : ''}
                                  </span>
                                )}
                              </td>
                              {activeRole === 'owner' && (
                                <td className="py-4 px-5 text-right">
                                  <div className="inline-flex items-center justify-end gap-2.5">
                                    {isLow && (
                                      <button
                                        type="button"
                                        onClick={() => handleTriggerReorder([item])}
                                        className="rounded-lg bg-amber-600 hover:bg-amber-700 px-2.5 py-1 text-xs font-semibold text-white transition cursor-pointer"
                                      >
                                        Reorder
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => openEditOrCreateItem(item)}
                                      className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                                    >
                                      Edit
                                    </button>
                                  </div>
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      {catalog.filter((c) => !c.isDeleted).length === 0 && (
                        <tr>
                          <td colSpan={9} className="py-8 text-center text-sm opacity-60">
                            No products or services found. Click "+ Add Retail Product" or "+ Add Service" to get started.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 5. SUPPLIERS & RESTOCK PURCHASES */}
          {activeTab === 'purchases' && activeRole === 'owner' && (
            <div className="space-y-6">
              {/* Header & Quick Action Buttons */}
              <div
                className={`rounded-2xl border p-6 flex flex-wrap items-center justify-between gap-4 ${cardSurface}`}
              >
                <div>
                  <h2 className="font-display text-2xl font-semibold flex items-center gap-2.5">
                    <Truck className="w-6 h-6 text-amber-600" />
                    <span>Suppliers & Restock Management</span>
                  </h2>
                  <p className="text-sm opacity-75 mt-1">
                    Manage vendor restock bills, product deliveries, and outgoing payments in TZS.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => {
                      setPartyFormType('supplier');
                      setPartyModalOpen(true);
                    }}
                    className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition cursor-pointer ${
                      isDark
                        ? 'border-[#252B37] hover:bg-slate-800 text-slate-200'
                        : 'border-[#E8E4DD] hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    + New Supplier
                  </button>
                  <button
                    onClick={() =>
                      setPaymentModalConfig({ isOpen: true, mode: 'supplier_payment' })
                    }
                    className="rounded-xl bg-amber-700 hover:bg-amber-800 px-4 py-2.5 text-sm font-semibold text-white shadow-xs cursor-pointer"
                  >
                    + Pay Supplier Bill
                  </button>
                  <button
                    onClick={() => setPurchaseModalOpen(true)}
                    className="rounded-xl bg-emerald-700 hover:bg-emerald-800 px-5 py-2.5 text-sm font-semibold text-white shadow-xs cursor-pointer flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Record Restock Bill
                  </button>
                </div>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div
                  className={`rounded-2xl border p-5 ${
                    isDark ? 'bg-[#171B22] border-[#252B37]' : 'bg-white border-[#E8E4DD]'
                  }`}
                >
                  <span className="text-xs font-semibold opacity-70 block">
                    Total Amount You Owe Suppliers
                  </span>
                  <div className="font-display text-2xl font-bold font-mono-num text-rose-600 dark:text-rose-400 mt-1">
                    {formatTZS(totalPayables)}
                  </div>
                  <span className="text-xs opacity-60 mt-1 block">
                    Outstanding balance across {suppliers.filter((s) => Number(s.outstandingBalance || 0) > 0).length} vendor(s)
                  </span>
                </div>

                <div
                  className={`rounded-2xl border p-5 ${
                    isDark ? 'bg-[#171B22] border-[#252B37]' : 'bg-white border-[#E8E4DD]'
                  }`}
                >
                  <span className="text-xs font-semibold opacity-70 block">
                    Restock Purchases This Period
                  </span>
                  <div className="font-display text-2xl font-bold font-mono-num text-emerald-700 dark:text-emerald-400 mt-1">
                    {formatTZS(
                      dateFilteredPurchases.reduce((sum, p) => sum + Number(p.totalAmount || 0), 0)
                    )}
                  </div>
                  <span className="text-xs opacity-60 mt-1 block">
                    {dateFilteredPurchases.length} restock purchase bill(s)
                  </span>
                </div>

                <div
                  className={`rounded-2xl border p-5 ${
                    isDark ? 'bg-[#171B22] border-[#252B37]' : 'bg-white border-[#E8E4DD]'
                  }`}
                >
                  <span className="text-xs font-semibold opacity-70 block">
                    Registered Suppliers
                  </span>
                  <div className="font-display text-2xl font-bold font-mono-num mt-1">
                    {suppliers.length}
                  </div>
                  <span className="text-xs opacity-60 mt-1 block">
                    Active vendor restock partners
                  </span>
                </div>
              </div>

              {/* Sub-Tabs & Search */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div
                  className={`inline-flex rounded-xl p-1 border ${
                    isDark ? 'bg-[#0F1217] border-[#252B37]' : 'bg-[#FAF8F5] border-[#E8E4DD]'
                  }`}
                >
                  <button
                    onClick={() => setPurchasesSubTab('bills')}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold transition cursor-pointer ${
                      purchasesSubTab === 'bills'
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'opacity-70 hover:opacity-100'
                    }`}
                  >
                    Restock Bills ({dateFilteredPurchases.length})
                  </button>
                  <button
                    onClick={() => setPurchasesSubTab('suppliers')}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold transition cursor-pointer ${
                      purchasesSubTab === 'suppliers'
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'opacity-70 hover:opacity-100'
                    }`}
                  >
                    Supplier Accounts ({suppliers.length})
                  </button>
                  <button
                    onClick={() => setPurchasesSubTab('payments')}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold transition cursor-pointer ${
                      purchasesSubTab === 'payments'
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'opacity-70 hover:opacity-100'
                    }`}
                  >
                    Payments to Suppliers (
                    {allPayments.filter((p) => p.paymentType === 'supplier_payment').length})
                  </button>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 opacity-50" />
                  <input
                    type="text"
                    placeholder="Search bills or suppliers..."
                    value={purchasesSearchQuery}
                    onChange={(e) => setPurchasesSearchQuery(e.target.value)}
                    className={`w-full rounded-xl border pl-10 pr-4 py-2 text-sm ${
                      isDark ? 'bg-[#0F1217] border-[#252B37]' : 'bg-[#FAF8F5] border-[#E8E4DD]'
                    }`}
                  />
                </div>
              </div>

              {/* Subtab 1: Restock Purchase Bills */}
              {purchasesSubTab === 'bills' && (
                <div className={`rounded-2xl border overflow-hidden ${cardSurface}`}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr
                          className={`border-b ${
                            isDark
                              ? 'bg-[#0F1217] border-[#252B37] text-slate-400'
                              : 'bg-[#FAF8F5] border-[#E8E4DD] text-slate-600'
                          }`}
                        >
                          <th className="py-3.5 px-5 font-semibold">Bill No</th>
                          <th className="py-3.5 px-4 font-semibold">Date</th>
                          <th className="py-3.5 px-5 font-semibold">Supplier</th>
                          <th className="py-3.5 px-4 font-semibold">Status</th>
                          <th className="py-3.5 px-5 font-semibold text-right">Total Cost</th>
                          <th className="py-3.5 px-5 font-semibold text-right">Paid</th>
                          <th className="py-3.5 px-5 font-semibold text-right">Balance Due</th>
                          <th className="py-3.5 px-5 font-semibold text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-[#252B37]">
                        {dateFilteredPurchases
                          .filter((p) => {
                            if (!purchasesSearchQuery.trim()) return true;
                            const q = purchasesSearchQuery.toLowerCase();
                            return (
                              p.billNo.toLowerCase().includes(q) ||
                              p.supplierName.toLowerCase().includes(q)
                            );
                          })
                          .map((p) => (
                            <tr key={p.id} className="hover:bg-slate-500/5">
                              <td className="py-4 px-5 font-mono-num font-semibold">{p.billNo}</td>
                              <td className="py-4 px-4 font-mono-num opacity-80">
                                {p.purchaseDate}
                              </td>
                              <td className="py-4 px-5 font-semibold">{p.supplierName}</td>
                              <td className="py-4 px-4">
                                <span
                                  className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${
                                    p.paymentStatus === 'paid'
                                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                      : p.paymentStatus === 'partly_paid'
                                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                      : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                                  }`}
                                >
                                  {p.paymentStatus.replace('_', ' ')}
                                </span>
                              </td>
                              <td className="py-4 px-5 text-right font-mono-num font-bold">
                                {formatTZS(p.totalAmount)}
                              </td>
                              <td className="py-4 px-5 text-right font-mono-num text-emerald-700 dark:text-emerald-400">
                                {formatTZS(p.amountPaid)}
                              </td>
                              <td className="py-4 px-5 text-right font-mono-num font-bold text-rose-500">
                                {formatTZS(p.balanceDue)}
                              </td>
                              <td className="py-4 px-5 text-right">
                                {Number(p.balanceDue) > 0 ? (
                                  <button
                                    onClick={() =>
                                      setPaymentModalConfig({
                                        isOpen: true,
                                        mode: 'supplier_payment',
                                        partyId: p.supplierId,
                                        invoiceId: p.id,
                                      })
                                    }
                                    className="rounded-xl bg-amber-700 hover:bg-amber-800 px-3.5 py-2 text-xs font-semibold text-white cursor-pointer"
                                  >
                                    Pay Supplier
                                  </button>
                                ) : (
                                  <span className="text-xs text-emerald-600 font-medium">Paid</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        {dateFilteredPurchases.length === 0 && (
                          <tr>
                            <td colSpan={8} className="py-8 text-center text-sm opacity-60">
                              No restock purchase bills recorded for this period. Click "+ Record Restock Bill" above.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Subtab 2: Supplier Accounts & Payables */}
              {purchasesSubTab === 'suppliers' && (
                <div className={`rounded-2xl border overflow-hidden ${cardSurface}`}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr
                          className={`border-b ${
                            isDark
                              ? 'bg-[#0F1217] border-[#252B37] text-slate-400'
                              : 'bg-[#FAF8F5] border-[#E8E4DD] text-slate-600'
                          }`}
                        >
                          <th className="py-3.5 px-5 font-semibold">Supplier Name</th>
                          <th className="py-3.5 px-4 font-semibold">Phone</th>
                          <th className="py-3.5 px-4 font-semibold">Email / Contact</th>
                          <th className="py-3.5 px-5 font-semibold text-right">Amount You Owe</th>
                          <th className="py-3.5 px-5 font-semibold text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-[#252B37]">
                        {suppliers
                          .filter((s) => {
                            if (!purchasesSearchQuery.trim()) return true;
                            const q = purchasesSearchQuery.toLowerCase();
                            return (
                              s.name.toLowerCase().includes(q) ||
                              (s.phone && s.phone.toLowerCase().includes(q))
                            );
                          })
                          .map((s) => (
                            <tr key={s.id} className="hover:bg-slate-500/5">
                              <td className="py-4 px-5 font-semibold">{s.name}</td>
                              <td className="py-4 px-4 font-mono-num">{s.phone || '—'}</td>
                              <td className="py-4 px-4 opacity-80">{s.email || s.notes || '—'}</td>
                              <td className="py-4 px-5 text-right font-mono-num font-bold text-rose-500">
                                {formatTZS(s.outstandingBalance)}
                              </td>
                              <td className="py-4 px-5 text-right">
                                {Number(s.outstandingBalance) > 0 ? (
                                  <button
                                    onClick={() =>
                                      setPaymentModalConfig({
                                        isOpen: true,
                                        mode: 'supplier_payment',
                                        partyId: s.id,
                                      })
                                    }
                                    className="rounded-xl bg-amber-700 hover:bg-amber-800 px-3.5 py-2 text-xs font-semibold text-white cursor-pointer"
                                  >
                                    Pay Supplier
                                  </button>
                                ) : (
                                  <span className="text-xs text-slate-500">No Debt</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        {suppliers.length === 0 && (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-sm opacity-60">
                              No suppliers registered yet. Click "+ New Supplier" above to add your first supplier.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Subtab 3: Payments to Suppliers */}
              {purchasesSubTab === 'payments' && (
                <div className={`rounded-2xl border overflow-hidden ${cardSurface}`}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr
                          className={`border-b ${
                            isDark
                              ? 'bg-[#0F1217] border-[#252B37] text-slate-400'
                              : 'bg-[#FAF8F5] border-[#E8E4DD] text-slate-600'
                          }`}
                        >
                          <th className="py-3.5 px-5 font-semibold">Payment Ref</th>
                          <th className="py-3.5 px-4 font-semibold">Date</th>
                          <th className="py-3.5 px-5 font-semibold">Supplier Paid</th>
                          <th className="py-3.5 px-4 font-semibold">Invoice / Reference</th>
                          <th className="py-3.5 px-4 font-semibold">Method</th>
                          <th className="py-3.5 px-5 font-semibold text-right">Amount (TZS)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-[#252B37]">
                        {dateFilteredPayments
                          .filter((pay) => pay.paymentType === 'supplier_payment')
                          .map((pay) => (
                            <tr key={pay.id} className="hover:bg-slate-500/5">
                              <td className="py-4 px-5 font-mono-num font-semibold">
                                {pay.receiptNo}
                              </td>
                              <td className="py-4 px-4 font-mono-num opacity-80">
                                {pay.paymentDate}
                              </td>
                              <td className="py-4 px-5 font-semibold">{pay.partyName}</td>
                              <td className="py-4 px-4 font-mono-num">
                                {pay.referenceInvoiceNo || 'Account Balance'}
                              </td>
                              <td className="py-4 px-4 capitalize">
                                {pay.paymentMethod.replace('_', ' ')}
                              </td>
                              <td className="py-4 px-5 text-right font-mono-num font-bold text-amber-700 dark:text-amber-400">
                                {formatTZS(pay.amount)}
                              </td>
                            </tr>
                          ))}
                        {dateFilteredPayments.filter((p) => p.paymentType === 'supplier_payment')
                          .length === 0 && (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-sm opacity-60">
                              No payments recorded to suppliers in this period.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 6. SHOP OPERATING EXPENSES */}
          {activeTab === 'expenses' && activeRole === 'owner' && (
            <div className="space-y-6">
              {/* Header & Quick Action */}
              <div
                className={`rounded-2xl border p-6 flex flex-wrap items-center justify-between gap-4 ${cardSurface}`}
              >
                <div>
                  <h2 className="font-display text-2xl font-semibold flex items-center gap-2.5">
                    <Wallet className="w-6 h-6 text-rose-600" />
                    <span>Shop Operating Expenses</span>
                  </h2>
                  <p className="text-sm opacity-75 mt-1">
                    Track rent, electricity, shop consumables, staff meals, and daily running costs in TZS.
                  </p>
                </div>
                <button
                  onClick={() => setExpenseModalOpen(true)}
                  className="rounded-xl bg-rose-700 hover:bg-rose-800 px-5 py-2.5 text-sm font-semibold text-white shadow-xs cursor-pointer flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Add Shop Expense
                </button>
              </div>

              {/* KPI Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div
                  className={`rounded-2xl border p-5 ${
                    isDark ? 'bg-[#171B22] border-[#252B37]' : 'bg-white border-[#E8E4DD]'
                  }`}
                >
                  <span className="text-xs font-semibold opacity-70 block">
                    Total Operating Expenses (Period)
                  </span>
                  <div className="font-display text-2xl font-bold font-mono-num text-rose-600 dark:text-rose-400 mt-1">
                    {formatTZS(totalExpenses)}
                  </div>
                  <span className="text-xs opacity-60 mt-1 block">
                    {dateFilteredExpenses.length} expense voucher(s) recorded
                  </span>
                </div>

                <div
                  className={`rounded-2xl border p-5 ${
                    isDark ? 'bg-[#171B22] border-[#252B37]' : 'bg-white border-[#E8E4DD]'
                  }`}
                >
                  <span className="text-xs font-semibold opacity-70 block">
                    Average Expense Voucher
                  </span>
                  <div className="font-display text-2xl font-bold font-mono-num mt-1">
                    {formatTZS(
                      dateFilteredExpenses.length > 0
                        ? totalExpenses / dateFilteredExpenses.length
                        : 0
                    )}
                  </div>
                  <span className="text-xs opacity-60 mt-1 block">Per recorded voucher</span>
                </div>

                <div
                  className={`rounded-2xl border p-5 ${
                    isDark ? 'bg-[#171B22] border-[#252B37]' : 'bg-white border-[#E8E4DD]'
                  }`}
                >
                  <span className="text-xs font-semibold opacity-70 block">
                    Impact on Net Profit
                  </span>
                  <div
                    className={`font-display text-2xl font-bold font-mono-num mt-1 ${
                      netProfit >= 0
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {formatTZS(netProfit)}
                  </div>
                  <span className="text-xs opacity-60 mt-1 block">
                    Revenue minus COGS and expenses
                  </span>
                </div>
              </div>

              {/* Table of Expenses */}
              <div className={`rounded-2xl border overflow-hidden ${cardSurface}`}>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr
                        className={`border-b ${
                          isDark
                            ? 'bg-[#0F1217] border-[#252B37] text-slate-400'
                            : 'bg-[#FAF8F5] border-[#E8E4DD] text-slate-600'
                        }`}
                      >
                        <th className="py-3.5 px-5 font-semibold">Voucher No</th>
                        <th className="py-3.5 px-4 font-semibold">Date</th>
                        <th className="py-3.5 px-5 font-semibold">Category</th>
                        <th className="py-3.5 px-5 font-semibold">Description / Notes</th>
                        <th className="py-3.5 px-4 font-semibold">Paid Via</th>
                        <th className="py-3.5 px-5 font-semibold text-right">Amount (TZS)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-[#252B37]">
                      {dateFilteredExpenses.map((e) => (
                        <tr key={e.id} className="hover:bg-slate-500/5">
                          <td className="py-4 px-5 font-mono-num font-semibold">{e.voucherNo}</td>
                          <td className="py-4 px-4 font-mono-num opacity-80">{e.expenseDate}</td>
                          <td className="py-4 px-5">
                            <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400">
                              {e.category}
                            </span>
                          </td>
                          <td className="py-4 px-5 opacity-85">{e.description}</td>
                          <td className="py-4 px-4 capitalize">
                            {e.paymentMethod.replace('_', ' ')}
                          </td>
                          <td className="py-4 px-5 text-right font-mono-num font-bold text-rose-500">
                            {formatTZS(e.amount)}
                          </td>
                        </tr>
                      ))}
                      {dateFilteredExpenses.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-sm opacity-60">
                            No shop operating expenses recorded in this period. Click "+ Add Shop Expense" to log one.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 7. CUSTOMERS & CREDIT DEBTS */}
          {activeTab === 'parties' && (
            <div className="space-y-6">
              {/* Header & Quick Action */}
              <div
                className={`rounded-2xl border p-6 flex flex-wrap items-center justify-between gap-4 ${cardSurface}`}
              >
                <div>
                  <h2 className="font-display text-2xl font-semibold flex items-center gap-2.5">
                    <Users className="w-6 h-6 text-emerald-600" />
                    <span>Customers & Debt Management</span>
                  </h2>
                  <p className="text-sm opacity-75 mt-1">
                    Manage client profiles, track credit sales, and collect money owed to your shop.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => {
                      setPartyFormType('customer');
                      setPartyModalOpen(true);
                    }}
                    className="rounded-xl bg-emerald-700 hover:bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white shadow-xs cursor-pointer flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> New Customer
                  </button>
                  <button
                    onClick={() =>
                      setPaymentModalConfig({ isOpen: true, mode: 'customer_receipt' })
                    }
                    className="rounded-xl bg-amber-700 hover:bg-amber-800 px-4 py-2.5 text-sm font-semibold text-white shadow-xs cursor-pointer flex items-center gap-2"
                  >
                    <Receipt className="w-4 h-4" /> Collect Payment
                  </button>
                </div>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div
                  className={`rounded-2xl border p-5 ${
                    isDark ? 'bg-[#171B22] border-[#252B37]' : 'bg-white border-[#E8E4DD]'
                  }`}
                >
                  <span className="text-xs font-semibold opacity-70 block">
                    Total Customer Debts Owed to You
                  </span>
                  <div className="font-display text-2xl font-bold font-mono-num text-amber-700 dark:text-amber-400 mt-1">
                    {formatTZS(totalReceivables)}
                  </div>
                  <span className="text-xs opacity-60 mt-1 block">
                    Across {customers.filter((c) => Number(c.outstandingBalance || 0) > 0).length} client(s) with unpaid balances
                  </span>
                </div>

                <div
                  className={`rounded-2xl border p-5 ${
                    isDark ? 'bg-[#171B22] border-[#252B37]' : 'bg-white border-[#E8E4DD]'
                  }`}
                >
                  <span className="text-xs font-semibold opacity-70 block">
                    Credit Payments Collected (Period)
                  </span>
                  <div className="font-display text-2xl font-bold font-mono-num text-emerald-700 dark:text-emerald-400 mt-1">
                    {formatTZS(
                      dateFilteredPayments
                        .filter((p) => p.paymentType === 'customer_receipt')
                        .reduce((sum, p) => sum + Number(p.amount || 0), 0)
                    )}
                  </div>
                  <span className="text-xs opacity-60 mt-1 block">
                    {dateFilteredPayments.filter((p) => p.paymentType === 'customer_receipt').length} collection receipt(s)
                  </span>
                </div>

                <div
                  className={`rounded-2xl border p-5 ${
                    isDark ? 'bg-[#171B22] border-[#252B37]' : 'bg-white border-[#E8E4DD]'
                  }`}
                >
                  <span className="text-xs font-semibold opacity-70 block">
                    Total Registered Customers
                  </span>
                  <div className="font-display text-2xl font-bold font-mono-num mt-1">
                    {customers.length}
                  </div>
                  <span className="text-xs opacity-60 mt-1 block">
                    Clients saved in your contact book
                  </span>
                </div>
              </div>

              {/* Sub-tabs & Search */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div
                  className={`inline-flex rounded-xl p-1 border ${
                    isDark ? 'bg-[#0F1217] border-[#252B37]' : 'bg-[#FAF8F5] border-[#E8E4DD]'
                  }`}
                >
                  <button
                    onClick={() => setPartiesSubTab('customers')}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold transition cursor-pointer ${
                      partiesSubTab === 'customers'
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'opacity-70 hover:opacity-100'
                    }`}
                  >
                    Customer Accounts ({customers.length})
                  </button>
                  <button
                    onClick={() => setPartiesSubTab('receipts')}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold transition cursor-pointer ${
                      partiesSubTab === 'receipts'
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'opacity-70 hover:opacity-100'
                    }`}
                  >
                    Payment Receipts Collected (
                    {allPayments.filter((p) => p.paymentType === 'customer_receipt').length})
                  </button>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 opacity-50" />
                  <input
                    type="text"
                    placeholder="Search customers or phone..."
                    value={partiesSearchQuery}
                    onChange={(e) => setPartiesSearchQuery(e.target.value)}
                    className={`w-full rounded-xl border pl-10 pr-4 py-2 text-sm ${
                      isDark ? 'bg-[#0F1217] border-[#252B37]' : 'bg-[#FAF8F5] border-[#E8E4DD]'
                    }`}
                  />
                </div>
              </div>

              {/* Subtab 1: Customers Table */}
              {partiesSubTab === 'customers' && (
                <div className={`rounded-2xl border overflow-hidden ${cardSurface}`}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr
                          className={`border-b ${
                            isDark
                              ? 'bg-[#0F1217] border-[#252B37] text-slate-400'
                              : 'bg-[#FAF8F5] border-[#E8E4DD] text-slate-600'
                          }`}
                        >
                          <th className="py-3.5 px-5 font-semibold">Customer Name</th>
                          <th className="py-3.5 px-4 font-semibold">Phone Number</th>
                          <th className="py-3.5 px-4 font-semibold">Notes / Email</th>
                          <th className="py-3.5 px-5 font-semibold text-right">Amount Owed (TZS)</th>
                          <th className="py-3.5 px-5 font-semibold text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-[#252B37]">
                        {customers
                          .filter((c) => {
                            if (!partiesSearchQuery.trim()) return true;
                            const q = partiesSearchQuery.toLowerCase();
                            return (
                              c.name.toLowerCase().includes(q) ||
                              (c.phone && c.phone.toLowerCase().includes(q))
                            );
                          })
                          .map((c) => {
                            const owed = Number(c.outstandingBalance || 0);
                            return (
                              <tr key={c.id} className="hover:bg-slate-500/5">
                                <td className="py-4 px-5 font-semibold">{c.name}</td>
                                <td className="py-4 px-4 font-mono-num">{c.phone || '—'}</td>
                                <td className="py-4 px-4 opacity-80">{c.email || c.notes || '—'}</td>
                                <td className="py-4 px-5 text-right font-mono-num font-bold">
                                  {owed > 0 ? (
                                    <span className="text-amber-700 dark:text-amber-400">
                                      {formatTZS(owed)}
                                    </span>
                                  ) : (
                                    <span className="opacity-60">0 TZS</span>
                                  )}
                                </td>
                                <td className="py-4 px-5 text-right">
                                  {owed > 0 ? (
                                    <button
                                      onClick={() =>
                                        setPaymentModalConfig({
                                          isOpen: true,
                                          mode: 'customer_receipt',
                                          partyId: c.id,
                                        })
                                      }
                                      className="rounded-xl bg-emerald-700 hover:bg-emerald-800 px-3.5 py-2 text-xs font-semibold text-white shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                                    >
                                      <Receipt className="w-3.5 h-3.5" />
                                      <span>Collect Money</span>
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        setPreselectedSaleItemId(null);
                                        setSaleModalOpen(true);
                                      }}
                                      className="rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold cursor-pointer opacity-80 hover:opacity-100"
                                    >
                                      New Sale
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        {customers.length === 0 && (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-sm opacity-60">
                              No customers added yet. Click "+ New Customer" above to add your first client.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Subtab 2: Customer Payment Receipts */}
              {partiesSubTab === 'receipts' && (
                <div className={`rounded-2xl border overflow-hidden ${cardSurface}`}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr
                          className={`border-b ${
                            isDark
                              ? 'bg-[#0F1217] border-[#252B37] text-slate-400'
                              : 'bg-[#FAF8F5] border-[#E8E4DD] text-slate-600'
                          }`}
                        >
                          <th className="py-3.5 px-5 font-semibold">Receipt No</th>
                          <th className="py-3.5 px-4 font-semibold">Date</th>
                          <th className="py-3.5 px-5 font-semibold">Customer</th>
                          <th className="py-3.5 px-4 font-semibold">Invoice / Reference</th>
                          <th className="py-3.5 px-4 font-semibold">Method</th>
                          <th className="py-3.5 px-5 font-semibold text-right">Amount Received</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-[#252B37]">
                        {dateFilteredPayments
                          .filter((pay) => pay.paymentType === 'customer_receipt')
                          .map((pay) => (
                            <tr key={pay.id} className="hover:bg-slate-500/5">
                              <td className="py-4 px-5 font-mono-num font-semibold">
                                {pay.receiptNo}
                              </td>
                              <td className="py-4 px-4 font-mono-num opacity-80">
                                {pay.paymentDate}
                              </td>
                              <td className="py-4 px-5 font-semibold">{pay.partyName}</td>
                              <td className="py-4 px-4 font-mono-num">
                                {pay.referenceInvoiceNo || 'Account Balance'}
                              </td>
                              <td className="py-4 px-4 capitalize">
                                {pay.paymentMethod.replace('_', ' ')}
                              </td>
                              <td className="py-4 px-5 text-right font-mono-num font-bold text-emerald-700 dark:text-emerald-400">
                                {formatTZS(pay.amount)}
                              </td>
                            </tr>
                          ))}
                        {dateFilteredPayments.filter((p) => p.paymentType === 'customer_receipt')
                          .length === 0 && (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-sm opacity-60">
                              No customer payments collected in this period.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 9. REPORTS & LEDGERS */}
          {activeTab === 'reports' && activeRole === 'owner' && (
            <ReportsSuiteView
              businessName={settings?.businessName || 'Kariakoo Glow & Retail Hub'}
              catalog={catalog}
              customers={customers}
              suppliers={suppliers}
              sales={allSales}
              saleItems={allSaleItems}
              purchases={allPurchases}
              expenses={allExpenses}
              payments={allPayments}
              ledgerEntries={allLedgerEntries}
              openingCash={openingCash}
              startDate={startDate}
              endDate={endDate}
              onOpenPaymentModal={(mode, partyId, invoiceId) =>
                setPaymentModalConfig({ isOpen: true, mode, partyId, invoiceId })
              }
              onPrintSaleReceipt={(s) => setReceiptToPrint(s)}
              isDark={isDark}
            />
          )}

          {/* 10. EXCEL TEMPLATES & IMPORT */}
          {activeTab === 'import' && activeRole === 'owner' && (
            <ExcelImportView
              onImportRows={async (payload) => {
                const res = await authedFetch('/api/import', {
                  method: 'POST',
                  body: JSON.stringify(payload),
                });
                setWorkspace(res.workspace);
                return { importedCount: res.importedCount };
              }}
              isDark={isDark}
            />
          )}

          {/* 11. TEAM, SHOP SETTINGS & ACTIVITY LOG */}
          {activeTab === 'audit_settings' && activeRole === 'owner' && (
            <div className="space-y-8">
              <div className={`rounded-2xl border p-6 md:p-8 grid grid-cols-1 md:grid-cols-3 gap-6 ${cardSurface}`}>
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Business Name
                  </label>
                  <input
                    type="text"
                    defaultValue={settings?.businessName || ''}
                    onBlur={async (e) => {
                      const res = await authedFetch('/api/settings', {
                        method: 'PUT',
                        body: JSON.stringify({ businessName: e.target.value }),
                      });
                      setWorkspace(res.workspace);
                    }}
                    className={`w-full rounded-xl border px-4 py-2.5 text-sm font-semibold ${
                      isDark ? 'bg-[#0F1217] border-[#252B37]' : 'bg-[#FAF8F5] border-[#E8E4DD]'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Starting Cash in Shop (TZS)
                  </label>
                  <input
                    type="number"
                    defaultValue={settings?.openingCash || '2500000'}
                    onBlur={async (e) => {
                      const res = await authedFetch('/api/settings', {
                        method: 'PUT',
                        body: JSON.stringify({ openingCash: e.target.value }),
                      });
                      setWorkspace(res.workspace);
                    }}
                    className={`w-full rounded-xl border px-4 py-2.5 text-sm font-mono-num font-bold ${
                      isDark ? 'bg-[#0F1217] border-[#252B37]' : 'bg-[#FAF8F5] border-[#E8E4DD]'
                    }`}
                  />
                </div>

                <div className="flex flex-col justify-end">
                  <button
                    type="button"
                    onClick={handleToggleBookingModule}
                    className={`w-full rounded-xl py-3 px-4 text-sm font-semibold border transition cursor-pointer ${
                      bookingEnabled
                        ? 'bg-emerald-700 text-white border-emerald-700'
                        : 'bg-slate-200 dark:bg-slate-800 border-slate-400'
                    }`}
                  >
                    Booking Module: {bookingEnabled ? 'Turned ON' : 'Turned OFF'}
                  </button>
                </div>
              </div>

              {/* AUTOMATED CLOUD STORAGE BACKUP SCHEDULER & SNAPSHOT HISTORY */}
              <div className={`rounded-2xl border overflow-hidden ${cardSurface}`}>
                <div className="p-6 md:p-8 border-b border-slate-200 dark:border-[#252B37] flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                      <Cloud className="w-4 h-4" />
                      <span>Cloud Disaster Recovery & Data Protection</span>
                    </div>
                    <h3 className="font-display text-xl md:text-2xl font-semibold">
                      Automated Cloud Storage Backups
                    </h3>
                    <p className="text-sm opacity-75 max-w-2xl">
                      Schedule automatic daily or weekly encrypted JSON snapshots of all workspace
                      data (catalog, sales, bookings, ledgers, and customer balances) directly to
                      your Cloud Storage bucket.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      disabled={backupActionLoading}
                      onClick={() => handleRunCloudBackupNow('manual')}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-xs transition cursor-pointer"
                    >
                      <HardDriveUpload className="w-4 h-4" />
                      <span>
                        {backupActionLoading ? 'Uploading Snapshot...' : 'Backup to Cloud Now'}
                      </span>
                    </button>
                  </div>
                </div>

                {backupStatusBanner && (
                  <div className="mx-6 md:mx-8 mt-6 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3.5 flex items-center justify-between gap-3 text-xs sm:text-sm text-emerald-800 dark:text-emerald-300">
                    <div className="flex items-center gap-2 font-semibold">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                      <span>{backupStatusBanner}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setBackupStatusBanner('')}
                      className="opacity-70 hover:opacity-100 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <form onSubmit={handleSaveBackupSchedule} className="p-6 md:p-8 space-y-6">
                  {/* Live Schedule Summary Strip */}
                  <div
                    className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 rounded-xl border p-4 text-xs ${
                      isDark ? 'bg-[#0F1217] border-[#252B37]' : 'bg-[#FAF8F5] border-[#E8E4DD]'
                    }`}
                  >
                    <div>
                      <span className="opacity-65 block">Schedule Status</span>
                      <span
                        className={`font-semibold text-sm flex items-center gap-1.5 mt-0.5 ${
                          backupScheduleForm.backupEnabled
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-amber-700 dark:text-amber-400'
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            backupScheduleForm.backupEnabled ? 'bg-emerald-500' : 'bg-amber-500'
                          }`}
                        />
                        {backupScheduleForm.backupEnabled
                          ? `Active (${
                              backupScheduleForm.backupFrequency === 'weekly'
                                ? `Weekly · ${backupScheduleForm.backupDayOfWeek}`
                                : 'Daily'
                            } at ${backupScheduleForm.backupTime})`
                          : 'Paused'}
                      </span>
                    </div>

                    <div>
                      <span className="opacity-65 block">Next Scheduled Run</span>
                      <span className="font-mono-num font-bold text-sm block mt-0.5">
                        {backupScheduleForm.backupEnabled
                          ? settings?.nextBackupAt ||
                            `Scheduled (${backupScheduleForm.backupTime} EAT)`
                          : 'Paused'}
                      </span>
                    </div>

                    <div>
                      <span className="opacity-65 block">Last Cloud Snapshot</span>
                      <span className="font-mono-num font-semibold text-sm block mt-0.5">
                        {settings?.lastBackupAt
                          ? new Date(settings.lastBackupAt).toLocaleString()
                          : allCloudBackups[0]?.createdAt
                          ? new Date(allCloudBackups[0].createdAt).toLocaleString()
                          : 'No backup yet'}
                      </span>
                    </div>

                    <div>
                      <span className="opacity-65 block">Stored Snapshots</span>
                      <span className="font-mono-num font-bold text-sm block mt-0.5 text-emerald-700 dark:text-emerald-400">
                        {allCloudBackups.length} archive(s) · Keep{' '}
                        {backupScheduleForm.backupRetentionDays} days
                      </span>
                    </div>
                  </div>

                  {/* Schedule Form Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-end">
                    {/* Enable / Disable Toggle */}
                    <div className="md:col-span-3">
                      <label className="block text-xs font-semibold mb-2 opacity-85">
                        Automated Schedule
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setBackupScheduleForm((prev) => ({
                            ...prev,
                            backupEnabled: !prev.backupEnabled,
                          }))
                        }
                        className={`w-full rounded-xl py-2.5 px-4 text-sm font-semibold border transition cursor-pointer flex items-center justify-between ${
                          backupScheduleForm.backupEnabled
                            ? 'bg-emerald-700 text-white border-emerald-700'
                            : isDark
                            ? 'bg-[#0F1217] border-[#252B37] text-slate-300'
                            : 'bg-[#FAF8F5] border-[#E8E4DD] text-slate-700'
                        }`}
                      >
                        <span>
                          {backupScheduleForm.backupEnabled ? 'Enabled (Auto)' : 'Disabled'}
                        </span>
                        <span className="text-xs font-mono-num underline">
                          {backupScheduleForm.backupEnabled ? 'Turn Off' : 'Turn On'}
                        </span>
                      </button>
                    </div>

                    {/* Frequency Selector: Daily vs Weekly */}
                    <div className="md:col-span-3">
                      <label className="block text-xs font-semibold mb-2 opacity-85">
                        Backup Frequency
                      </label>
                      <div
                        className={`grid grid-cols-2 p-1 rounded-xl border text-xs font-semibold ${
                          isDark
                            ? 'bg-[#0F1217] border-[#252B37]'
                            : 'bg-[#FAF8F5] border-[#E8E4DD]'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setBackupScheduleForm((prev) => ({
                              ...prev,
                              backupFrequency: 'daily',
                            }))
                          }
                          className={`py-2 rounded-lg transition cursor-pointer ${
                            backupScheduleForm.backupFrequency === 'daily'
                              ? 'bg-emerald-700 text-white shadow-xs'
                              : 'opacity-75 hover:opacity-100'
                          }`}
                        >
                          Daily
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setBackupScheduleForm((prev) => ({
                              ...prev,
                              backupFrequency: 'weekly',
                            }))
                          }
                          className={`py-2 rounded-lg transition cursor-pointer ${
                            backupScheduleForm.backupFrequency === 'weekly'
                              ? 'bg-emerald-700 text-white shadow-xs'
                              : 'opacity-75 hover:opacity-100'
                          }`}
                        >
                          Weekly
                        </button>
                      </div>
                    </div>

                    {/* Day of Week (when Weekly is selected) */}
                    {backupScheduleForm.backupFrequency === 'weekly' && (
                      <div className="md:col-span-2">
                        <label className="block text-xs font-semibold mb-2 opacity-85">
                          Day of Week
                        </label>
                        <select
                          value={backupScheduleForm.backupDayOfWeek}
                          onChange={(e) =>
                            setBackupScheduleForm((prev) => ({
                              ...prev,
                              backupDayOfWeek: e.target.value,
                            }))
                          }
                          className={`w-full rounded-xl border px-3 py-2.5 text-sm font-semibold ${
                            isDark
                              ? 'bg-[#0F1217] border-[#252B37]'
                              : 'bg-[#FAF8F5] border-[#E8E4DD]'
                          }`}
                        >
                          {[
                            'Monday',
                            'Tuesday',
                            'Wednesday',
                            'Thursday',
                            'Friday',
                            'Saturday',
                            'Sunday',
                          ].map((day) => (
                            <option key={day} value={day}>
                              {day}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Backup Time (EAT) */}
                    <div
                      className={
                        backupScheduleForm.backupFrequency === 'weekly'
                          ? 'md:col-span-2'
                          : 'md:col-span-3'
                      }
                    >
                      <label className="block text-xs font-semibold mb-2 opacity-85">
                        Scheduled Time (24h)
                      </label>
                      <input
                        type="time"
                        value={backupScheduleForm.backupTime}
                        onChange={(e) =>
                          setBackupScheduleForm((prev) => ({
                            ...prev,
                            backupTime: e.target.value,
                          }))
                        }
                        className={`w-full rounded-xl border px-3.5 py-2 text-sm font-mono-num font-semibold ${
                          isDark
                            ? 'bg-[#0F1217] border-[#252B37]'
                            : 'bg-[#FAF8F5] border-[#E8E4DD]'
                        }`}
                      />
                    </div>

                    {/* Retention Policy */}
                    <div
                      className={
                        backupScheduleForm.backupFrequency === 'weekly'
                          ? 'md:col-span-2'
                          : 'md:col-span-3'
                      }
                    >
                      <label className="block text-xs font-semibold mb-2 opacity-85">
                        Retention Window
                      </label>
                      <select
                        value={backupScheduleForm.backupRetentionDays}
                        onChange={(e) =>
                          setBackupScheduleForm((prev) => ({
                            ...prev,
                            backupRetentionDays: Number(e.target.value),
                          }))
                        }
                        className={`w-full rounded-xl border px-3 py-2.5 text-sm font-mono-num font-semibold ${
                          isDark
                            ? 'bg-[#0F1217] border-[#252B37]'
                            : 'bg-[#FAF8F5] border-[#E8E4DD]'
                        }`}
                      >
                        <option value={7}>Keep 7 Days</option>
                        <option value={30}>Keep 30 Days</option>
                        <option value={90}>Keep 90 Days</option>
                        <option value={365}>Keep 1 Year (365d)</option>
                      </select>
                    </div>
                  </div>

                  {/* Cloud Storage Bucket URI Input & Save Action */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end pt-2">
                    <div className="md:col-span-9">
                      <label className="block text-xs font-semibold mb-2 opacity-85">
                        Destination Cloud Storage Bucket URI (Google Cloud Storage / S3 Compatible)
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="gs://my-shop-backups-bucket/tallylite-tzs"
                        value={backupScheduleForm.backupBucketUri}
                        onChange={(e) =>
                          setBackupScheduleForm((prev) => ({
                            ...prev,
                            backupBucketUri: e.target.value,
                          }))
                        }
                        className={`w-full rounded-xl border px-4 py-2.5 text-sm font-mono-num ${
                          isDark
                            ? 'bg-[#0F1217] border-[#252B37]'
                            : 'bg-[#FAF8F5] border-[#E8E4DD]'
                        }`}
                      />
                    </div>

                    <div className="md:col-span-3">
                      <button
                        type="submit"
                        disabled={backupActionLoading}
                        className="w-full rounded-xl bg-amber-700 hover:bg-amber-800 disabled:opacity-50 py-2.5 px-4 text-sm font-semibold text-white transition cursor-pointer"
                      >
                        Save Backup Schedule
                      </button>
                    </div>
                  </div>
                </form>

                {/* Cloud Backup Archives Table */}
                <div className="border-t border-slate-200 dark:border-[#252B37]">
                  <div className="px-6 md:px-8 py-4 flex items-center justify-between">
                    <div>
                      <h4 className="font-display text-base font-semibold">
                        Recent Cloud Bucket Snapshots ({allCloudBackups.length})
                      </h4>
                      <p className="text-xs opacity-70">
                        Verified workspace backups stored in your configured cloud storage bucket
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto max-h-80">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr
                          className={`border-y ${
                            isDark
                              ? 'bg-[#0F1217] border-[#252B37] text-slate-400'
                              : 'bg-[#FAF8F5] border-[#E8E4DD] text-slate-600'
                          }`}
                        >
                          <th className="py-3 px-5 font-semibold">Snapshot Ref</th>
                          <th className="py-3 px-4 font-semibold">Created At</th>
                          <th className="py-3 px-4 font-semibold">Trigger</th>
                          <th className="py-3 px-5 font-semibold">Cloud Bucket Object Path</th>
                          <th className="py-3 px-4 font-semibold text-right">Records</th>
                          <th className="py-3 px-4 font-semibold text-right">Size</th>
                          <th className="py-3 px-5 font-semibold text-right">Snapshot</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-[#252B37]">
                        {allCloudBackups.map((bkp) => (
                          <tr key={bkp.id} className="hover:bg-slate-500/5">
                            <td className="py-3.5 px-5 font-mono-num font-semibold text-emerald-700 dark:text-emerald-400">
                              {bkp.backupRef}
                            </td>
                            <td className="py-3.5 px-4 font-mono-num text-xs opacity-80">
                              {new Date(bkp.createdAt).toLocaleString()}
                            </td>
                            <td className="py-3.5 px-4 text-xs font-semibold capitalize">
                              {bkp.triggerType === 'manual'
                                ? 'Manual Upload'
                                : bkp.triggerType === 'scheduled_weekly'
                                ? 'Weekly Schedule'
                                : 'Daily Schedule'}
                            </td>
                            <td className="py-3.5 px-5 font-mono-num text-xs opacity-80 truncate max-w-xs">
                              {bkp.objectPath}
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono-num font-semibold">
                              {bkp.recordsCount}
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono-num text-xs opacity-80">
                              {Math.max(1, Math.round((bkp.sizeBytes || 1024) / 1024))} KB
                            </td>
                            <td className="py-3.5 px-5 text-right">
                              <button
                                type="button"
                                onClick={() => handleDownloadBackupSnapshot(bkp)}
                                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                                  isDark
                                    ? 'bg-[#0F1217] border-[#252B37] hover:border-emerald-500/60'
                                    : 'bg-[#FAF8F5] border-[#E8E4DD] hover:border-emerald-600/60'
                                }`}
                              >
                                <Download className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Download JSON</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                        {allCloudBackups.length === 0 && (
                          <tr>
                            <td colSpan={7} className="py-8 text-center text-sm opacity-65">
                              No cloud backups recorded yet. Click "Backup to Cloud Now" or enable
                              automated scheduling above.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className={`rounded-2xl border overflow-hidden ${cardSurface}`}>
                <div className="p-6 border-b border-slate-200 dark:border-[#252B37]">
                  <h3 className="font-display text-xl font-semibold">Staff Activity Log</h3>
                  <p className="text-sm opacity-75">
                    Every sale, booking, payment, or edit is automatically recorded for your peace
                    of mind.
                  </p>
                </div>
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr
                        className={`border-b ${
                          isDark
                            ? 'bg-[#0F1217] border-[#252B37] text-slate-400'
                            : 'bg-[#FAF8F5] border-[#E8E4DD] text-slate-600'
                        }`}
                      >
                        <th className="py-3.5 px-5 font-semibold">Time</th>
                        <th className="py-3.5 px-4 font-semibold">Staff Member</th>
                        <th className="py-3.5 px-4 font-semibold">Role</th>
                        <th className="py-3.5 px-4 font-semibold">Action</th>
                        <th className="py-3.5 px-5 font-semibold">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-[#252B37]">
                      {allAuditLogs.map((log) => (
                        <tr key={log.id}>
                          <td className="py-3.5 px-5 font-mono-num text-xs opacity-75">
                            {new Date(log.createdAt).toLocaleString()}
                          </td>
                          <td className="py-3.5 px-4 font-semibold">{log.actorName}</td>
                          <td className="py-3.5 px-4 capitalize">{log.actorRole}</td>
                          <td className="py-3.5 px-4 font-mono-num text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                            {log.action}
                          </td>
                          <td className="py-3.5 px-5 opacity-85">{log.details}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* MODALS */}
      <SaleVoucherModal
        isOpen={saleModalOpen}
        onClose={() => setSaleModalOpen(false)}
        catalog={catalog}
        customers={customers}
        staff={staff}
        defaultStaffName={activeStaffName}
        initialItemId={preselectedSaleItemId}
        onSubmitSale={async (payload) => {
          const res = await authedFetch('/api/sales', {
            method: 'POST',
            body: JSON.stringify(payload),
          });
          setWorkspace(res.workspace);
        }}
        onQuickCreateCustomer={handleQuickCreateCustomer}
        isDark={isDark}
      />

      <PurchaseVoucherModal
        isOpen={purchaseModalOpen}
        onClose={() => {
          setPurchaseModalOpen(false);
          setPreselectedReorderItems(null);
        }}
        catalog={catalog}
        suppliers={suppliers}
        defaultStaffName={activeStaffName}
        initialReorderItems={preselectedReorderItems}
        onSubmitPurchase={async (payload) => {
          const res = await authedFetch('/api/purchases', {
            method: 'POST',
            body: JSON.stringify(payload),
          });
          setWorkspace(res.workspace);
        }}
        onQuickCreateSupplier={handleQuickCreateSupplier}
        isDark={isDark}
      />

      <PartyPaymentModal
        isOpen={paymentModalConfig.isOpen}
        onClose={() => setPaymentModalConfig((prev) => ({ ...prev, isOpen: false }))}
        initialMode={paymentModalConfig.mode}
        initialPartyId={paymentModalConfig.partyId}
        initialInvoiceId={paymentModalConfig.invoiceId}
        customers={customers}
        suppliers={suppliers}
        sales={allSales}
        purchases={allPurchases}
        onSubmitPayment={async (payload) => {
          const res = await authedFetch('/api/payments', {
            method: 'POST',
            body: JSON.stringify(payload),
          });
          setWorkspace(res.workspace);
        }}
        isDark={isDark}
      />

      <ExpenseVoucherModal
        isOpen={expenseModalOpen}
        onClose={() => setExpenseModalOpen(false)}
        onSubmitExpense={async (payload) => {
          const res = await authedFetch('/api/expenses', {
            method: 'POST',
            body: JSON.stringify(payload),
          });
          setWorkspace(res.workspace);
        }}
        isDark={isDark}
      />

      <BookingAppointmentModal
        isOpen={bookingModalOpen}
        onClose={() => setBookingModalOpen(false)}
        catalog={catalog}
        customers={customers}
        staff={staff}
        onSubmitBooking={async (payload) => {
          const res = await authedFetch('/api/bookings', {
            method: 'POST',
            body: JSON.stringify(payload),
          });
          setWorkspace(res.workspace);
        }}
        onQuickCreateCustomer={handleQuickCreateCustomer}
        isDark={isDark}
      />

      <CompleteBookingModal
        booking={bookingToComplete}
        onClose={() => setBookingToComplete(null)}
        onConfirmComplete={async (payload) => {
          const res = await authedFetch(`/api/bookings/${payload.bookingId}/status`, {
            method: 'PUT',
            body: JSON.stringify(payload),
          });
          setWorkspace(res.workspace);
        }}
        isDark={isDark}
      />

      <PrintReceiptModal
        sale={receiptToPrint}
        saleItems={allSaleItems}
        customer={
          receiptToPrint?.customerId
            ? customers.find((c) => c.id === receiptToPrint.customerId) || null
            : null
        }
        businessName={settings?.businessName || 'Kariakoo Glow & Retail Hub'}
        onClose={() => setReceiptToPrint(null)}
        isDark={isDark}
      />

      {catalogModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div
            className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden ${
              isDark
                ? 'bg-[#171B22] border-[#252B37] text-slate-100'
                : 'bg-white border-[#E8E4DD] text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between px-6 py-5 bg-emerald-700 text-white">
              <h3 className="font-display text-xl font-semibold">
                {editingItem
                  ? `Edit ${editingItem.name}`
                  : itemForm.itemType === 'service'
                  ? 'Add New Service / Session'
                  : 'Add New Retail Product'}
              </h3>
              <button
                type="button"
                onClick={() => setCatalogModalOpen(false)}
                className="rounded-lg p-1 hover:bg-black/20 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveCatalogItem} className="p-6 space-y-4 text-sm">
              {catalogError && (
                <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-3 text-xs sm:text-sm text-red-500 font-medium">
                  {catalogError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setItemForm((p) => ({
                      ...p,
                      itemType: 'product',
                      unit: p.unit === 'session' ? 'pcs' : p.unit || 'pcs',
                      category:
                        p.category === 'Facial & Therapy Sessions'
                          ? 'Skincare & Retail Products'
                          : p.category,
                    }))
                  }
                  className={`py-2.5 px-3 rounded-xl font-semibold border text-xs sm:text-sm cursor-pointer transition ${
                    itemForm.itemType === 'product'
                      ? 'bg-emerald-700 text-white border-emerald-700'
                      : 'border-slate-300 dark:border-slate-700 opacity-80'
                  }`}
                >
                  Retail Product (Stocked)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setItemForm((p) => ({
                      ...p,
                      itemType: 'service',
                      unit: 'session',
                      category:
                        p.category === 'Skincare & Retail Products'
                          ? 'Facial & Therapy Sessions'
                          : p.category,
                    }))
                  }
                  className={`py-2.5 px-3 rounded-xl font-semibold border text-xs sm:text-sm cursor-pointer transition ${
                    itemForm.itemType === 'service'
                      ? 'bg-amber-700 text-white border-amber-700'
                      : 'border-slate-300 dark:border-slate-700 opacity-80'
                  }`}
                >
                  Service / Session
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-semibold mb-1">
                    {itemForm.itemType === 'service' ? 'Service Name *' : 'Product Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={
                      itemForm.itemType === 'service'
                        ? 'e.g. Deep Facial & Pore Detox Session'
                        : 'e.g. Vitamin C Glow Serum (50ml)'
                    }
                    value={itemForm.name}
                    onChange={(e) => setItemForm((p) => ({ ...p, name: e.target.value }))}
                    className={`w-full rounded-xl border px-3.5 py-2.5 ${
                      isDark ? 'bg-[#0F1217] border-[#252B37]' : 'bg-[#FAF8F5] border-[#E8E4DD]'
                    }`}
                  />
                </div>
                {itemForm.itemType === 'product' ? (
                  <div>
                    <label className="block font-semibold mb-1">Unit</label>
                    <select
                      value={itemForm.unit}
                      onChange={(e) => setItemForm((p) => ({ ...p, unit: e.target.value }))}
                      className={`w-full rounded-xl border px-3 py-2.5 font-mono-num ${
                        isDark ? 'bg-[#0F1217] border-[#252B37]' : 'bg-[#FAF8F5] border-[#E8E4DD]'
                      }`}
                    >
                      <option value="pcs">pcs (Pieces)</option>
                      <option value="bottle">Bottle</option>
                      <option value="jar">Jar</option>
                      <option value="set">Set / Kit</option>
                      <option value="box">Box</option>
                      <option value="pack">Pack</option>
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block font-semibold mb-1">Duration (Mins)</label>
                    <input
                      type="number"
                      min={5}
                      value={itemForm.durationMins}
                      onChange={(e) => setItemForm((p) => ({ ...p, durationMins: e.target.value }))}
                      className={`w-full rounded-xl border px-3.5 py-2.5 font-mono-num ${
                        isDark ? 'bg-[#0F1217] border-[#252B37]' : 'bg-[#FAF8F5] border-[#E8E4DD]'
                      }`}
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold mb-1">Category</label>
                  <input
                    type="text"
                    placeholder="e.g. Skincare, Body Scrubs, Facials"
                    value={itemForm.category}
                    onChange={(e) => setItemForm((p) => ({ ...p, category: e.target.value }))}
                    className={`w-full rounded-xl border px-3.5 py-2.5 ${
                      isDark ? 'bg-[#0F1217] border-[#252B37]' : 'bg-[#FAF8F5] border-[#E8E4DD]'
                    }`}
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">SKU / Code (Optional)</label>
                  <input
                    type="text"
                    placeholder="Auto-generated if blank"
                    value={itemForm.sku}
                    onChange={(e) => setItemForm((p) => ({ ...p, sku: e.target.value }))}
                    className={`w-full rounded-xl border px-3.5 py-2.5 font-mono-num ${
                      isDark ? 'bg-[#0F1217] border-[#252B37]' : 'bg-[#FAF8F5] border-[#E8E4DD]'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold mb-1">
                    {itemForm.itemType === 'service'
                      ? 'Direct Consumables Cost (TZS)'
                      : 'Buying Cost Price (TZS)'}
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    placeholder="e.g. 15000"
                    value={itemForm.costPrice}
                    onChange={(e) => setItemForm((p) => ({ ...p, costPrice: e.target.value }))}
                    className={`w-full rounded-xl border px-3.5 py-2.5 font-mono-num ${
                      isDark ? 'bg-[#0F1217] border-[#252B37]' : 'bg-[#FAF8F5] border-[#E8E4DD]'
                    }`}
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Selling Price (TZS) *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    step="any"
                    placeholder="e.g. 28000"
                    value={itemForm.sellingPrice}
                    onChange={(e) =>
                      setItemForm((p) => ({ ...p, sellingPrice: e.target.value }))
                    }
                    className={`w-full rounded-xl border px-3.5 py-2.5 font-mono-num font-bold ${
                      isDark ? 'bg-[#0F1217] border-[#252B37]' : 'bg-[#FAF8F5] border-[#E8E4DD]'
                    }`}
                  />
                </div>
              </div>

              {itemForm.itemType === 'product' && (
                <div className={`grid ${editingItem ? 'grid-cols-3' : 'grid-cols-2'} gap-3`}>
                  <div>
                    <label className="block font-semibold mb-1">
                      Opening Stock ({itemForm.unit})
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={itemForm.openingStock}
                      onChange={(e) => setItemForm((p) => ({ ...p, openingStock: e.target.value }))}
                      className={`w-full rounded-xl border px-3.5 py-2.5 font-mono-num ${
                        isDark ? 'bg-[#0F1217] border-[#252B37]' : 'bg-[#FAF8F5] border-[#E8E4DD]'
                      }`}
                    />
                  </div>
                  {editingItem && (
                    <div>
                      <label className="block font-semibold mb-1">Stock Adjustment</label>
                      <input
                        type="number"
                        value={itemForm.adjustedQty}
                        onChange={(e) =>
                          setItemForm((p) => ({ ...p, adjustedQty: e.target.value }))
                        }
                        className={`w-full rounded-xl border px-3.5 py-2.5 font-mono-num ${
                          isDark ? 'bg-[#0F1217] border-[#252B37]' : 'bg-[#FAF8F5] border-[#E8E4DD]'
                        }`}
                      />
                    </div>
                  )}
                  <div>
                    <label className="block font-semibold mb-1">
                      Low Stock Alert ({itemForm.unit})
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={itemForm.reorderLevel}
                      onChange={(e) => setItemForm((p) => ({ ...p, reorderLevel: e.target.value }))}
                      className={`w-full rounded-xl border px-3.5 py-2.5 font-mono-num ${
                        isDark ? 'bg-[#0F1217] border-[#252B37]' : 'bg-[#FAF8F5] border-[#E8E4DD]'
                      }`}
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-[#252B37]">
                <button
                  type="button"
                  onClick={() => setCatalogModalOpen(false)}
                  className="rounded-xl px-5 py-2.5 border border-slate-300 dark:border-slate-700 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={catalogSaving}
                  className="rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 px-6 py-2.5 font-semibold text-white cursor-pointer"
                >
                  {catalogSaving
                    ? 'Saving...'
                    : editingItem
                    ? 'Save Changes'
                    : itemForm.itemType === 'service'
                    ? 'Create Service'
                    : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {partyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div
            className={`w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden ${
              isDark
                ? 'bg-[#171B22] border-[#252B37] text-slate-100'
                : 'bg-white border-[#E8E4DD] text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between px-6 py-5 bg-emerald-700 text-white">
              <h3 className="font-display text-xl font-semibold">
                Add New {partyFormType === 'customer' ? 'Customer' : 'Supplier'}
              </h3>
              <button onClick={() => setPartyModalOpen(false)} className="cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveParty} className="p-6 space-y-4 text-sm">
              <div>
                <label className="block font-semibold mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={partyForm.name}
                  onChange={(e) => setPartyForm((p) => ({ ...p, name: e.target.value }))}
                  className={`w-full rounded-xl border px-3.5 py-2.5 ${
                    isDark ? 'bg-[#0F1217] border-[#252B37]' : 'bg-[#FAF8F5] border-[#E8E4DD]'
                  }`}
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Phone Number</label>
                <input
                  type="text"
                  value={partyForm.phone}
                  onChange={(e) => setPartyForm((p) => ({ ...p, phone: e.target.value }))}
                  className={`w-full rounded-xl border px-3.5 py-2.5 ${
                    isDark ? 'bg-[#0F1217] border-[#252B37]' : 'bg-[#FAF8F5] border-[#E8E4DD]'
                  }`}
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Starting Balance Owed (TZS)</label>
                <input
                  type="number"
                  value={partyForm.openingBalance}
                  onChange={(e) =>
                    setPartyForm((p) => ({ ...p, openingBalance: e.target.value }))
                  }
                  className={`w-full rounded-xl border px-3.5 py-2.5 font-mono-num ${
                    isDark ? 'bg-[#0F1217] border-[#252B37]' : 'bg-[#FAF8F5] border-[#E8E4DD]'
                  }`}
                />
              </div>
              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setPartyModalOpen(false)}
                  className="rounded-xl px-5 py-2.5 border border-slate-300 dark:border-slate-700 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-700 px-6 py-2.5 font-semibold text-white cursor-pointer"
                >
                  Save {partyFormType === 'customer' ? 'Customer' : 'Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <TallyLiteShell />
    </ThemeProvider>
  );
}
