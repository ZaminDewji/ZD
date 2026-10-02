import React, { useState } from 'react';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  Calendar,
  Sparkles,
  Package,
  Printer,
  BarChart3,
  PieChart,
  CreditCard,
  TrendingUp,
} from 'lucide-react';
import {
  Booking,
  CatalogItem,
  Customer,
  Expense,
  Sale,
  SaleItem,
  Supplier,
} from '../types.ts';
import { formatTZS } from '../utils/format.ts';

interface FriendlyDashboardProps {
  sales: Sale[];
  saleItems: SaleItem[];
  catalog?: CatalogItem[];
  expenses: Expense[];
  bookings: Booking[];
  customers: Customer[];
  suppliers: Supplier[];
  lowStockProducts: CatalogItem[];
  bookingEnabled: boolean;
  netProfit: number;
  totalRevenue: number;
  totalExpenses: number;
  realTimeCashBalance: number;
  totalCashInAll: number;
  totalCashOutAll: number;
  totalReceivables: number;
  totalPayables: number;
  onNavigateTab: (tab: any) => void;
  onOpenSaleModal: (itemId?: number) => void;
  onOpenBookingModal: () => void;
  onOpenPurchaseModal: () => void;
  onOpenPaymentModal: (
    mode: 'customer_receipt' | 'supplier_payment',
    partyId?: number,
    invoiceId?: number
  ) => void;
  onCompleteBooking: (booking: Booking) => void;
  onPrintSaleReceipt: (sale: Sale) => void;
  onReorderItems?: (items: CatalogItem[]) => void;
  isDark: boolean;
}

export const FriendlyDashboardView: React.FC<FriendlyDashboardProps> = ({
  sales,
  saleItems,
  catalog = [],
  expenses,
  bookings,
  customers,
  suppliers,
  lowStockProducts,
  bookingEnabled,
  netProfit,
  totalRevenue,
  totalExpenses,
  realTimeCashBalance,
  totalCashInAll,
  totalCashOutAll,
  totalReceivables,
  totalPayables,
  onNavigateTab,
  onOpenSaleModal,
  onOpenBookingModal,
  onOpenPurchaseModal,
  onOpenPaymentModal,
  onCompleteBooking,
  onPrintSaleReceipt,
  onReorderItems,
  isDark,
}) => {
  const [activeChartTab, setActiveChartTab] = useState<'trend' | 'categories' | 'payments'>('trend');
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);

  // 1. Group sales, costs, expenses & profit by date for the Daily Trend Chart
  const dateMap = new Map<
    string,
    {
      fullDate: string;
      date: string;
      sales: number;
      cogs: number;
      expenses: number;
      profit: number;
      ordersCount: number;
    }
  >();

  sales.forEach((s) => {
    const d = s.saleDate;
    const prev = dateMap.get(d) || {
      fullDate: d,
      date: d.slice(5),
      sales: 0,
      cogs: 0,
      expenses: 0,
      profit: 0,
      ordersCount: 0,
    };
    const rev = Number(s.totalAmount || 0);
    const cost = Number(s.totalCost || 0);
    prev.sales += rev;
    prev.cogs += cost;
    prev.profit += rev - cost;
    prev.ordersCount += 1;
    dateMap.set(d, prev);
  });

  expenses.forEach((e) => {
    const d = e.expenseDate;
    const prev = dateMap.get(d) || {
      fullDate: d,
      date: d.slice(5),
      sales: 0,
      cogs: 0,
      expenses: 0,
      profit: 0,
      ordersCount: 0,
    };
    const expAmt = Number(e.amount || 0);
    prev.expenses += expAmt;
    prev.profit -= expAmt;
    dateMap.set(d, prev);
  });

  const chartData = Array.from(dateMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, val]) => val);

  const activePoint =
    chartData.find((d) => d.fullDate === selectedDateKey) ||
    (chartData.length > 0 ? chartData[chartData.length - 1] : null);

  const avgDailySales =
    chartData.length > 0
      ? Math.round(chartData.reduce((sum, d) => sum + d.sales, 0) / chartData.length)
      : 0;

  const peakDay =
    chartData.length > 0
      ? chartData.reduce((best, cur) => (cur.sales > best.sales ? cur : best), chartData[0])
      : null;

  const overallMarginPct =
    totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0;

  // 2. Calculate Products vs Services Revenue Split & Category Breakdown
  const activeSaleIds = new Set(sales.map((s) => s.id));
  const periodSaleItems = saleItems.filter((si) => activeSaleIds.has(si.saleId));

  const productRevenue = periodSaleItems
    .filter((si) => si.itemType === 'product')
    .reduce((sum, si) => sum + Number(si.lineTotal || 0), 0);

  const serviceRevenue = periodSaleItems
    .filter((si) => si.itemType === 'service')
    .reduce((sum, si) => sum + Number(si.lineTotal || 0), 0);

  const combinedSplitTotal = Math.max(1, productRevenue + serviceRevenue);
  const productPct = Math.round((productRevenue / combinedSplitTotal) * 100);
  const servicePct = 100 - productPct;

  // Category Aggregation
  const categoryCatalogMap = new Map<number, string>();
  catalog.forEach((c) => categoryCatalogMap.set(c.id, c.category || 'General'));

  const categoryMap = new Map<
    string,
    { category: string; revenue: number; profit: number; qty: number }
  >();

  periodSaleItems.forEach((si) => {
    const catName =
      categoryCatalogMap.get(si.itemId) ||
      (si.itemType === 'service' ? 'Services & Consultations' : 'Retail Products');
    const prev = categoryMap.get(catName) || {
      category: catName,
      revenue: 0,
      profit: 0,
      qty: 0,
    };
    const rev = Number(si.lineTotal || 0);
    const prof =
      Number(si.lineProfit || 0) ||
      rev - Number(si.unitCost || 0) * Number(si.quantity || 1);
    prev.revenue += rev;
    prev.profit += prof;
    prev.qty += Number(si.quantity || 1);
    categoryMap.set(catName, prev);
  });

  const categoryChartData = Array.from(categoryMap.values()).sort(
    (a, b) => b.revenue - a.revenue
  );
  const totalCategoryRevenue = Math.max(
    1,
    categoryChartData.reduce((sum, c) => sum + c.revenue, 0)
  );

  // 3. Payment Method Breakdown
  const paymentMethodLabels: Record<string, { label: string; color: string }> = {
    cash: { label: 'Cash in Hand', color: '#059669' },
    mobile_money: { label: 'M-Pesa / Mobile Money', color: '#0284c7' },
    card: { label: 'Bank / POS Card', color: '#7c3aed' },
    credit: { label: 'Customer Credit (Unpaid)', color: '#d97706' },
  };

  const paymentMethodData = ['cash', 'mobile_money', 'card', 'credit'].map((method) => {
    const matching = sales.filter((s) => s.paymentMethod === method);
    const total = matching.reduce((sum, s) => sum + Number(s.totalAmount || 0), 0);
    const count = matching.length;
    const pct = totalRevenue > 0 ? Math.round((total / totalRevenue) * 100) : 0;
    return {
      method,
      label: paymentMethodLabels[method]?.label || method,
      color: paymentMethodLabels[method]?.color || '#059669',
      total,
      count,
      pct,
    };
  });

  const cardSurface = isDark
    ? 'bg-[#171B22] border-[#252B37]'
    : 'bg-white border-[#E8E4DD] shadow-xs';

  return (
    <div className="space-y-8">
      {/* 1. FOUR LARGE, HUMAN-FRIENDLY SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {/* Net Profit Card */}
        <div className={`rounded-2xl border p-6 flex flex-col justify-between ${cardSurface}`}>
          <div>
            <div className="flex items-center justify-between text-sm font-semibold text-emerald-700 dark:text-emerald-400">
              <span>Take-Home Profit</span>
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <div className="text-2xl md:text-3xl font-bold font-mono-num mt-2 tracking-tight">
              {formatTZS(netProfit)}
            </div>
            <p className="text-xs opacity-70 mt-1">
              After subtracting item buying costs & shop expenses
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-[#252B37] flex items-center justify-between text-xs opacity-85">
            <span>Total Sales: {formatTZS(totalRevenue)}</span>
            <span>·</span>
            <span>Expenses: {formatTZS(totalExpenses)}</span>
          </div>
        </div>

        {/* Available Cash Card */}
        <div className={`rounded-2xl border p-6 flex flex-col justify-between ${cardSurface}`}>
          <div>
            <div className="flex items-center justify-between text-sm font-semibold text-emerald-700 dark:text-emerald-400">
              <span>Available Cash on Hand</span>
              <Wallet className="w-5 h-5" />
            </div>
            <div className="text-2xl md:text-3xl font-bold font-mono-num mt-2 tracking-tight">
              {formatTZS(realTimeCashBalance)}
            </div>
            <p className="text-xs opacity-70 mt-1">
              Real-time money in your Cash Box, M-Pesa & Bank
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-[#252B37] flex items-center justify-between text-xs opacity-85">
            <span className="text-emerald-700 dark:text-emerald-400">
              In: +{formatTZS(totalCashInAll)}
            </span>
            <span>·</span>
            <span className="text-rose-600 dark:text-rose-400">
              Out: -{formatTZS(totalCashOutAll)}
            </span>
          </div>
        </div>

        {/* Customers Who Owe You (Receivables) */}
        <div className={`rounded-2xl border p-6 flex flex-col justify-between ${cardSurface}`}>
          <div>
            <div className="flex items-center justify-between text-sm font-semibold text-amber-700 dark:text-amber-400">
              <span>Customers Owe You</span>
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="text-2xl md:text-3xl font-bold font-mono-num mt-2 tracking-tight text-amber-700 dark:text-amber-400">
              {formatTZS(totalReceivables)}
            </div>
            <p className="text-xs opacity-70 mt-1">
              {customers.filter((c) => Number(c.outstandingBalance) > 0).length} customers have
              unpaid credit bills
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-[#252B37] flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => onNavigateTab('reports')}
              className="font-semibold opacity-75 hover:opacity-100 cursor-pointer"
            >
              View Debtors List
            </button>
            <button
              type="button"
              onClick={() => onOpenPaymentModal('customer_receipt')}
              className="font-semibold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
            >
              + Collect Payment →
            </button>
          </div>
        </div>

        {/* Suppliers You Owe (Payables) */}
        <div className={`rounded-2xl border p-6 flex flex-col justify-between ${cardSurface}`}>
          <div>
            <div className="flex items-center justify-between text-sm font-semibold text-rose-600 dark:text-rose-400">
              <span>You Owe Suppliers</span>
              <ArrowDownRight className="w-5 h-5" />
            </div>
            <div className="text-2xl md:text-3xl font-bold font-mono-num mt-2 tracking-tight text-rose-600 dark:text-rose-400">
              {formatTZS(totalPayables)}
            </div>
            <p className="text-xs opacity-70 mt-1">
              {suppliers.filter((s) => Number(s.outstandingBalance) > 0).length} suppliers awaiting
              payment
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-[#252B37] flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => onNavigateTab('purchases')}
              className="font-semibold opacity-75 hover:opacity-100 cursor-pointer"
            >
              View Stock Bills
            </button>
            <button
              type="button"
              onClick={() => onOpenPaymentModal('supplier_payment')}
              className="font-semibold text-amber-700 dark:text-amber-400 hover:underline cursor-pointer"
            >
              + Pay Supplier →
            </button>
          </div>
        </div>
      </div>

      {/* 2. INTERACTIVE DASHBOARD ANALYTICS CHARTS + PRODUCT VS SERVICE REVENUE BREAKDOWN */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Interactive Multi-Mode Business Chart */}
        <div className={`lg:col-span-8 rounded-2xl border p-6 flex flex-col justify-between ${cardSurface}`}>
          <div>
            <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
              <div>
                <h3 className="font-display text-xl font-semibold">
                  Business Performance & Revenue Analytics (TZS)
                </h3>
                <p className="text-sm opacity-75">
                  Interactive visual breakdown of daily sales, net profit, categories, and payment channels
                </p>
              </div>

              {/* Interactive Chart View Selector */}
              <div
                className={`inline-flex items-center p-1 rounded-xl border text-xs font-semibold no-print ${
                  isDark ? 'bg-[#0F1217] border-[#252B37]' : 'bg-[#FAF8F5] border-[#E8E4DD]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setActiveChartTab('trend')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer whitespace-nowrap ${
                    activeChartTab === 'trend'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'opacity-75 hover:opacity-100'
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>Daily Sales & Profit</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveChartTab('categories')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer whitespace-nowrap ${
                    activeChartTab === 'categories'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'opacity-75 hover:opacity-100'
                  }`}
                >
                  <PieChart className="w-3.5 h-3.5" />
                  <span>By Category</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveChartTab('payments')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer whitespace-nowrap ${
                    activeChartTab === 'payments'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'opacity-75 hover:opacity-100'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Payment Channels</span>
                </button>
              </div>
            </div>

            {/* CHART MODE 1: DAILY SALES, COSTS & NET PROFIT BAR + SVG TREND CHART */}
            {activeChartTab === 'trend' && (
              <div className="space-y-4">
                {/* Key Chart Metrics Strip */}
                <div
                  className={`grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-xl border p-3.5 text-xs ${
                    isDark ? 'bg-[#0F1217] border-[#252B37]' : 'bg-[#FAF8F5] border-[#E8E4DD]'
                  }`}
                >
                  <div>
                    <span className="opacity-65 block">Avg Daily Sales</span>
                    <span className="font-mono-num font-bold text-sm text-emerald-700 dark:text-emerald-400">
                      {formatTZS(avgDailySales)}
                    </span>
                  </div>
                  <div>
                    <span className="opacity-65 block">Peak Sales Day</span>
                    <span className="font-mono-num font-bold text-sm">
                      {peakDay ? `${peakDay.date} (${formatTZS(peakDay.sales)})` : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="opacity-65 block">Net Profit Margin</span>
                    <span className="font-mono-num font-bold text-sm text-amber-700 dark:text-amber-400">
                      {overallMarginPct}%
                    </span>
                  </div>
                  <div>
                    <span className="opacity-65 block">
                      Selected ({activePoint?.fullDate || 'Latest'})
                    </span>
                    <span className="font-mono-num font-bold text-sm text-emerald-700 dark:text-emerald-400">
                      {activePoint ? formatTZS(activePoint.profit) : '—'} Profit
                    </span>
                  </div>
                </div>

                {/* Legend */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold">
                  <div className="flex flex-wrap items-center gap-4">
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-xs bg-emerald-600 inline-block" /> Daily Sales Revenue
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-xs bg-amber-500 inline-block" /> Take-Home Net Profit
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-xs bg-rose-500/80 inline-block" /> Costs & Expenses
                    </span>
                  </div>
                  <span className="text-[11px] opacity-65">
                    Click any date column to inspect details
                  </span>
                </div>

                {/* Visual Grouped Bar Chart with Value Labels */}
                <div className="h-60 w-full flex flex-col justify-end">
                  {chartData.length > 0 ? (
                    (() => {
                      const maxVal = Math.max(
                        1,
                        ...chartData.map((d) =>
                          Math.max(d.sales, Math.abs(d.profit), d.cogs + d.expenses)
                        )
                      );
                      return (
                        <div className="h-full flex items-end gap-2.5 pt-6 pb-2 px-2 overflow-x-auto">
                          {chartData.map((d) => {
                            const totalOut = d.cogs + d.expenses;
                            const salesPct = Math.max(8, Math.round((d.sales / maxVal) * 100));
                            const profitPct = Math.max(
                              6,
                              Math.round((Math.max(0, d.profit) / maxVal) * 100)
                            );
                            const costPct =
                              totalOut > 0
                                ? Math.max(5, Math.round((totalOut / maxVal) * 100))
                                : 0;
                            const isSelected = activePoint?.fullDate === d.fullDate;

                            return (
                              <button
                                key={d.fullDate}
                                type="button"
                                onClick={() => setSelectedDateKey(d.fullDate)}
                                className={`flex-1 min-w-[74px] h-full flex flex-col justify-end items-center group rounded-xl p-1.5 transition cursor-pointer ${
                                  isSelected
                                    ? isDark
                                      ? 'bg-[#0F1217] ring-1 ring-emerald-500/50'
                                      : 'bg-emerald-50/70 ring-1 ring-emerald-600/40'
                                    : 'hover:bg-slate-500/5'
                                }`}
                              >
                                <div className="text-[10px] font-mono-num font-semibold opacity-75 mb-1">
                                  {Math.round(d.sales / 1000)}k
                                </div>
                                <div className="w-full flex items-end justify-center gap-1 h-36 px-1 border-b border-slate-200 dark:border-[#252B37]">
                                  <div
                                    title={`Sales (${d.fullDate}): ${formatTZS(d.sales)}`}
                                    style={{ height: `${salesPct}%` }}
                                    className="w-3.5 sm:w-4 bg-emerald-600 group-hover:bg-emerald-500 rounded-t-sm transition-all"
                                  />
                                  <div
                                    title={`Net Profit (${d.fullDate}): ${formatTZS(d.profit)}`}
                                    style={{ height: `${profitPct}%` }}
                                    className="w-3.5 sm:w-4 bg-amber-500 group-hover:bg-amber-400 rounded-t-sm transition-all"
                                  />
                                  {costPct > 0 && (
                                    <div
                                      title={`Costs & Expenses (${d.fullDate}): ${formatTZS(totalOut)}`}
                                      style={{ height: `${costPct}%` }}
                                      className="w-2.5 sm:w-3 bg-rose-500/75 group-hover:bg-rose-400 rounded-t-sm transition-all"
                                    />
                                  )}
                                </div>
                                <div className="mt-2 text-xs font-mono-num font-bold">
                                  {d.date}
                                </div>
                                <div className="text-[10px] font-mono-num text-amber-700 dark:text-amber-400">
                                  +{Math.round(d.profit / 1000)}k net
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      );
                    })()
                  ) : (
                    <div className="h-full flex items-center justify-center text-sm opacity-60">
                      Record your first sale to see your daily Sales & Profit chart.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* CHART MODE 2: CATEGORY REVENUE & PROFIT BREAKDOWN */}
            {activeChartTab === 'categories' && (
              <div className="space-y-4 pt-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-72 overflow-y-auto pr-1">
                  {categoryChartData.map((cat, idx) => {
                    const sharePct = Math.round((cat.revenue / totalCategoryRevenue) * 100);
                    const barColors = [
                      'bg-emerald-600',
                      'bg-amber-500',
                      'bg-teal-600',
                      'bg-sky-600',
                      'bg-indigo-600',
                      'bg-rose-600',
                    ];
                    const barColor = barColors[idx % barColors.length];
                    return (
                      <div
                        key={cat.category}
                        className={`rounded-xl border p-4 space-y-2 ${
                          isDark
                            ? 'bg-[#0F1217] border-[#252B37]'
                            : 'bg-[#FAF8F5] border-[#E8E4DD]'
                        }`}
                      >
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-semibold truncate pr-2">{cat.category}</span>
                          <span className="font-mono-num font-bold text-emerald-700 dark:text-emerald-400">
                            {formatTZS(cat.revenue)}
                          </span>
                        </div>
                        <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${barColor}`}
                            style={{ width: `${Math.max(4, sharePct)}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-xs opacity-75 font-mono-num">
                          <span>
                            {cat.qty} units/sessions · {sharePct}% of sales
                          </span>
                          <span>Profit: {formatTZS(cat.profit)}</span>
                        </div>
                      </div>
                    );
                  })}
                  {categoryChartData.length === 0 && (
                    <div className="col-span-2 py-12 text-center text-sm opacity-65">
                      No category sales recorded in this date period.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* CHART MODE 3: PAYMENT CHANNELS BREAKDOWN */}
            {activeChartTab === 'payments' && (
              <div className="space-y-4 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {paymentMethodData.map((pm) => (
                    <div
                      key={pm.method}
                      className={`rounded-xl border p-4 space-y-2.5 ${
                        isDark ? 'bg-[#0F1217] border-[#252B37]' : 'bg-[#FAF8F5] border-[#E8E4DD]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm">{pm.label}</span>
                        <span className="font-mono-num text-xs font-semibold opacity-75">
                          {pm.count} {pm.count === 1 ? 'sale' : 'sales'} ({pm.pct}%)
                        </span>
                      </div>
                      <div className="text-xl font-bold font-mono-num">{formatTZS(pm.total)}</div>
                      <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${Math.max(3, pm.pct)}%`, backgroundColor: pm.color }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Selected Day / Period Summary Footer */}
          {activePoint && activeChartTab === 'trend' && (
            <div className="mt-4 pt-3.5 border-t border-slate-200 dark:border-[#252B37] flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span className="font-semibold">
                  Date Breakdown ({activePoint.fullDate}):
                </span>
                <span className="font-mono-num">
                  {activePoint.ordersCount} {activePoint.ordersCount === 1 ? 'sale' : 'sales'}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 font-mono-num">
                <span>Sales: {formatTZS(activePoint.sales)}</span>
                <span>·</span>
                <span>Item Costs: {formatTZS(activePoint.cogs)}</span>
                <span>·</span>
                <span>Expenses: {formatTZS(activePoint.expenses)}</span>
                <span>·</span>
                <span className="font-bold text-emerald-700 dark:text-emerald-400">
                  Net: {formatTZS(activePoint.profit)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Retail Products vs Booked Services Revenue Split */}
        <div className={`lg:col-span-4 rounded-2xl border p-6 flex flex-col justify-between ${cardSurface}`}>
          <div className="space-y-5">
            <div>
              <h3 className="font-display text-xl font-semibold">
                Products vs. Services & Bookings
              </h3>
              <p className="text-sm opacity-75 mt-1">
                See how much each side of your business is earning in one place.
              </p>
            </div>

            {/* Visual Split Ratio Bar */}
            <div className="space-y-2">
              <div className="w-full h-4 rounded-full bg-slate-200 dark:bg-[#0F1217] overflow-hidden flex">
                <div
                  className="h-full bg-emerald-600 transition-all duration-500"
                  style={{ width: `${productPct}%` }}
                  title={`Retail Products: ${productPct}%`}
                />
                <div
                  className="h-full bg-amber-500 transition-all duration-500"
                  style={{ width: `${servicePct}%` }}
                  title={`Services & Consultations: ${servicePct}%`}
                />
              </div>
              <div className="flex items-center justify-between text-xs font-mono-num opacity-75">
                <span>Products: {productPct}%</span>
                <span>Services: {servicePct}%</span>
              </div>
            </div>

            {/* Retail Products Bar */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold flex items-center gap-2">
                  <Package className="w-4 h-4 text-emerald-600" />
                  Retail Products
                </span>
                <span className="font-mono-num font-bold">{formatTZS(productRevenue)}</span>
              </div>
              <p className="text-xs opacity-70">
                Physical shop inventory & manufactured goods sold
              </p>
            </div>

            {/* Services & Bookings Bar */}
            <div className="space-y-1.5 pt-2 border-t border-slate-200/60 dark:border-[#252B37]">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  Services & Consultations
                </span>
                <span className="font-mono-num font-bold">{formatTZS(serviceRevenue)}</span>
              </div>
              <p className="text-xs opacity-70">
                Appointments, spa sessions & treatments completed
              </p>
            </div>
          </div>

          <div className="pt-5 mt-5 border-t border-slate-200 dark:border-[#252B37] grid grid-cols-2 gap-2.5 no-print">
            <button
              type="button"
              onClick={() => onOpenSaleModal()}
              className="rounded-xl bg-emerald-700 hover:bg-emerald-800 py-2.5 px-3 text-xs font-semibold text-white text-center transition cursor-pointer"
            >
              + Record Sale
            </button>
            {bookingEnabled && (
              <button
                type="button"
                onClick={onOpenBookingModal}
                className="rounded-xl bg-amber-700 hover:bg-amber-800 py-2.5 px-3 text-xs font-semibold text-white text-center transition cursor-pointer"
              >
                + New Booking
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. RECENT SALES & WHAT NEEDS ATTENTION TODAY */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Sales Table */}
        <div className={`lg:col-span-7 rounded-2xl border overflow-hidden ${cardSurface}`}>
          <div className="p-6 border-b border-slate-200 dark:border-[#252B37] flex items-center justify-between">
            <div>
              <h3 className="font-display text-xl font-semibold">Recent Sales</h3>
              <p className="text-sm opacity-75">
                Both retail products and completed service bookings
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('sales')}
              className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer no-print"
            >
              See All Sales →
            </button>
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
                  <th className="py-3.5 px-4 font-semibold">Customer</th>
                  <th className="py-3.5 px-4 font-semibold">Payment</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Total</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Status</th>
                  <th className="py-3.5 px-5 font-semibold text-right no-print">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-[#252B37]">
                {sales.slice(0, 6).map((s) => (
                  <tr key={s.id} className="hover:bg-slate-500/5">
                    <td className="py-4 px-5">
                      <span className="font-mono-num font-semibold text-emerald-700 dark:text-emerald-400">
                        {s.invoiceNo}
                      </span>
                      <span className="block text-xs opacity-65 font-mono-num">{s.saleDate}</span>
                    </td>
                    <td className="py-4 px-4 font-semibold">
                      {s.customerName}
                      <span className="block text-xs font-normal opacity-65">
                        By {s.staffName}
                      </span>
                    </td>
                    <td className="py-4 px-4 capitalize opacity-85">
                      {s.paymentMethod.replace('_', ' ')}
                    </td>
                    <td className="py-4 px-4 text-right font-mono-num font-bold">
                      {formatTZS(s.totalAmount)}
                    </td>
                    <td className="py-4 px-4 text-right font-mono-num">
                      {Number(s.balanceDue) > 0 ? (
                        <button
                          type="button"
                          onClick={() =>
                            onOpenPaymentModal('customer_receipt', s.customerId || undefined, s.id)
                          }
                          className="text-amber-700 dark:text-amber-400 font-semibold hover:underline cursor-pointer"
                        >
                          Owes {formatTZS(s.balanceDue)}
                        </button>
                      ) : (
                        <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                          Paid
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-5 text-right no-print">
                      <button
                        type="button"
                        onClick={() => onPrintSaleReceipt(s)}
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Low Stock Alerts & Upcoming Bookings */}
        <div className="lg:col-span-5 space-y-6">
          {/* Low Stock Alerts */}
          <div className={`rounded-2xl border p-6 ${cardSurface}`}>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="font-display text-lg font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  <span>Low Stock Reorder Alerts ({lowStockProducts.length})</span>
                </h3>
                <p className="text-xs opacity-75">
                  Products at or below reorder threshold
                </p>
              </div>
              {lowStockProducts.length > 0 ? (
                <button
                  type="button"
                  onClick={() =>
                    onReorderItems
                      ? onReorderItems(lowStockProducts)
                      : onOpenPurchaseModal()
                  }
                  className="rounded-xl bg-amber-600 hover:bg-amber-700 px-3.5 py-2 text-xs font-semibold text-white transition cursor-pointer no-print"
                >
                  Reorder All ({lowStockProducts.length})
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onOpenPurchaseModal}
                  className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer no-print"
                >
                  + Restock
                </button>
              )}
            </div>

            <div className="space-y-3">
              {lowStockProducts.map((item) => {
                const suggestedQty = Math.max(
                  item.reorderLevel * 2 - item.currentStock,
                  item.reorderLevel,
                  10
                );
                return (
                  <div
                    key={item.id}
                    className={`rounded-xl border p-3.5 flex items-center justify-between gap-3 ${
                      isDark ? 'bg-[#0F1217] border-[#252B37]' : 'bg-[#FAF8F5] border-[#E8E4DD]'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-sm truncate">{item.name}</div>
                      <div className="text-xs opacity-70">
                        Alert threshold: {item.reorderLevel} {item.unit || 'pcs'} · Suggest +{suggestedQty} {item.unit || 'pcs'}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <span
                          className={`font-mono-num font-bold text-sm block ${
                            item.currentStock <= 0
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-amber-700 dark:text-amber-400'
                          }`}
                        >
                          {item.currentStock <= 0
                            ? 'Out of stock'
                            : `${item.currentStock} ${item.unit || 'pcs'} left`}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          onReorderItems ? onReorderItems([item]) : onOpenPurchaseModal()
                        }
                        className="rounded-lg bg-emerald-700 hover:bg-emerald-800 px-3 py-1.5 text-xs font-semibold text-white transition cursor-pointer no-print"
                      >
                        Reorder
                      </button>
                    </div>
                  </div>
                );
              })}
              {lowStockProducts.length === 0 && (
                <p className="text-sm opacity-70 py-2">
                  All inventory products are well stocked right now!
                </p>
              )}
            </div>
          </div>

          {/* Upcoming Bookings */}
          {bookingEnabled && (
            <div className={`rounded-2xl border p-6 ${cardSurface}`}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-display text-lg font-semibold flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-amber-600" />
                    <span>Bookings Queue</span>
                  </h3>
                  <p className="text-xs opacity-75">
                    Mark completed to turn into a sale automatically
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigateTab('bookings')}
                  className="text-sm font-semibold text-amber-700 dark:text-amber-400 hover:underline cursor-pointer no-print"
                >
                  All Bookings →
                </button>
              </div>

              <div className="space-y-3">
                {bookings.slice(0, 3).map((b) => (
                  <div
                    key={b.id}
                    className={`rounded-xl border p-4 flex items-center justify-between gap-3 ${
                      isDark ? 'bg-[#0F1217] border-[#252B37]' : 'bg-[#FAF8F5] border-[#E8E4DD]'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-sm">{b.customerName}</div>
                      <div className="text-xs opacity-70">
                        {b.appointmentDate} at {b.appointmentTime} · {b.assignedStaff}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono-num font-bold text-sm">
                        {formatTZS(b.totalAmount)}
                      </div>
                      {b.status !== 'completed' ? (
                        <button
                          type="button"
                          onClick={() => onCompleteBooking(b)}
                          className="mt-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 px-3 py-1 text-xs font-semibold text-white cursor-pointer no-print"
                        >
                          Complete → Sale
                        </button>
                      ) : (
                        <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                          Moved to Sales
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
