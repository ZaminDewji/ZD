import React, { useState } from 'react';
import {
  Sparkles,
  Package,
  Download,
  Printer,
  FileText,
  Layers,
} from 'lucide-react';
import {
  CatalogItem,
  Customer,
  Expense,
  LedgerEntry,
  Payment,
  Purchase,
  Sale,
  SaleItem,
  Supplier,
} from '../types.ts';
import { exportJsonToExcel, formatTZS, isWithinDateRange } from '../utils/format.ts';

interface ReportsSuiteProps {
  businessName?: string;
  catalog: CatalogItem[];
  customers: Customer[];
  suppliers: Supplier[];
  sales: Sale[];
  saleItems: SaleItem[];
  purchases: Purchase[];
  expenses: Expense[];
  payments: Payment[];
  ledgerEntries: LedgerEntry[];
  openingCash: number;
  startDate: string;
  endDate: string;
  onOpenPaymentModal: (
    mode: 'customer_receipt' | 'supplier_payment',
    partyId?: number,
    invoiceId?: number
  ) => void;
  onPrintSaleReceipt?: (sale: Sale) => void;
  initialSubTab?:
    | 'outstanding'
    | 'ledger'
    | 'fast_slow'
    | 'profitability'
    | 'pnl_cashflow'
    | 'all_reports';
  isDark: boolean;
}

export const ReportsSuiteView: React.FC<ReportsSuiteProps> = ({
  businessName = 'Kariakoo Glow & Retail Hub',
  catalog,
  customers,
  suppliers,
  sales,
  saleItems,
  purchases,
  expenses,
  payments,
  ledgerEntries,
  openingCash,
  startDate,
  endDate,
  onOpenPaymentModal,
  onPrintSaleReceipt,
  initialSubTab = 'outstanding',
  isDark,
}) => {
  const [subTab, setSubTab] = useState<
    | 'outstanding'
    | 'ledger'
    | 'fast_slow'
    | 'profitability'
    | 'pnl_cashflow'
    | 'all_reports'
  >(initialSubTab);

  const [selectedPartyType, setSelectedPartyType] = useState<'customer' | 'supplier'>('customer');
  const [selectedPartyId, setSelectedPartyId] = useState<string>(
    customers[0] ? String(customers[0].id) : ''
  );

  // Date-filtered transactions
  const activeSales = sales.filter(
    (s) => !s.isDeleted && isWithinDateRange(s.saleDate, startDate, endDate)
  );
  const activeSaleItems = saleItems.filter((si) =>
    activeSales.some((s) => s.id === si.saleId)
  );
  const activePurchases = purchases.filter(
    (p) => !p.isDeleted && isWithinDateRange(p.purchaseDate, startDate, endDate)
  );
  const activeExpenses = expenses.filter(
    (e) => !e.isDeleted && isWithinDateRange(e.expenseDate, startDate, endDate)
  );
  const activePayments = payments.filter((pay) =>
    isWithinDateRange(pay.paymentDate, startDate, endDate)
  );
  const filteredLedger = ledgerEntries.filter(
    (l) =>
      l.partyType === selectedPartyType &&
      (!selectedPartyId || String(l.partyId) === selectedPartyId) &&
      isWithinDateRange(l.entryDate, startDate, endDate)
  );

  // Financial Calculations for Date Range
  const totalRevenue = activeSales.reduce((sum, s) => sum + Number(s.totalAmount || 0), 0);
  const totalCOGS = activeSales.reduce((sum, s) => sum + Number(s.totalCost || 0), 0);
  const grossProfit = totalRevenue - totalCOGS;
  const totalExpenses = activeExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const netProfit = grossProfit - totalExpenses;

  // Cash Flow Calculations
  const cashFromSales = activeSales.reduce((sum, s) => sum + Number(s.amountPaid || 0), 0);
  const cashFromCustomerReceipts = activePayments
    .filter((p) => p.paymentType === 'customer_receipt')
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const totalCashIn = cashFromSales + cashFromCustomerReceipts;

  const cashOutPurchases = activePurchases.reduce((sum, p) => sum + Number(p.amountPaid || 0), 0);
  const cashOutSupplierPayments = activePayments
    .filter((p) => p.paymentType === 'supplier_payment')
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const cashOutPaidExpenses = activeExpenses
    .filter((e) => e.paymentStatus === 'paid')
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const totalCashOut = cashOutPurchases + cashOutSupplierPayments + cashOutPaidExpenses;
  const closingCashBalance = openingCash + totalCashIn - totalCashOut;

  // Credit Sales & Credit Purchases within Date Range
  const creditSalesList = activeSales.filter((s) => Number(s.balanceDue) > 0);
  const creditPurchasesList = activePurchases.filter((p) => Number(p.balanceDue) > 0);

  // Item Profitability & Fast/Slow Moving Aggregation
  const itemMetrics = catalog
    .filter((c) => !c.isDeleted)
    .map((item) => {
      const matchingLines = activeSaleItems.filter((si) => si.itemId === item.id);
      const qtySoldInPeriod = matchingLines.reduce((sum, l) => sum + l.quantity, 0);
      const revenueInPeriod = matchingLines.reduce((sum, l) => sum + Number(l.lineTotal || 0), 0);
      const costInPeriod = matchingLines.reduce(
        (sum, l) => sum + Number(l.unitCost || 0) * l.quantity,
        0
      );
      const profitInPeriod = revenueInPeriod - costInPeriod;
      const unitProfit = Number(item.sellingPrice) - Number(item.costPrice);
      const marginPct =
        Number(item.sellingPrice) > 0
          ? Math.round((unitProfit / Number(item.sellingPrice)) * 100)
          : 0;

      return {
        ...item,
        qtySoldInPeriod,
        revenueInPeriod,
        costInPeriod,
        profitInPeriod,
        unitProfit,
        marginPct,
      };
    });

  const productMetrics = itemMetrics
    .filter((i) => i.itemType === 'product')
    .sort((a, b) => b.qtySoldInPeriod - a.qtySoldInPeriod);

  const serviceMetrics = itemMetrics
    .filter((i) => i.itemType === 'service')
    .sort((a, b) => b.qtySoldInPeriod - a.qtySoldInPeriod);

  const periodLabel =
    startDate && endDate
      ? `${startDate} to ${endDate}`
      : startDate
      ? `From ${startDate}`
      : endDate
      ? `Up to ${endDate}`
      : 'All Dates';

  const handlePrintCurrentReport = () => {
    window.print();
  };

  const handlePrintAllReports = () => {
    setSubTab('all_reports');
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const handleDownloadAllReportsHtml = () => {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${businessName} - Complete Financial & Inventory Reports (${periodLabel})</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0f172a; margin: 0; padding: 32px; background: #fff; }
    h1 { font-size: 24px; margin: 0 0 4px 0; color: #065f46; }
    h2 { font-size: 17px; margin: 28px 0 10px 0; padding-bottom: 6px; border-bottom: 2px solid #047857; color: #0f172a; }
    .meta { font-size: 12px; color: #475569; margin-bottom: 24px; }
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
    .kpi { border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; }
    .kpi-label { font-size: 11px; color: #64748b; text-transform: uppercase; }
    .kpi-val { font-size: 18px; font-weight: 700; margin-top: 4px; font-variant-numeric: tabular-nums; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
    th { background: #f8fafc; text-align: left; padding: 8px; border-bottom: 1px solid #cbd5e1; font-weight: 600; }
    td { padding: 8px; border-bottom: 1px solid #e2e8f0; }
    .right { text-align: right; font-variant-numeric: tabular-nums; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body onload="window.print()">
  <h1>${businessName} — Complete Business Reports Suite</h1>
  <div class="meta">Period: ${periodLabel} · Currency: Tanzanian Shillings (TZS) · Generated: ${new Date().toLocaleString()}</div>

  <div class="kpi-grid">
    <div class="kpi"><div class="kpi-label">Total Sales Revenue</div><div class="kpi-val">${formatTZS(totalRevenue)}</div></div>
    <div class="kpi"><div class="kpi-label">Gross Profit</div><div class="kpi-val">${formatTZS(grossProfit)}</div></div>
    <div class="kpi"><div class="kpi-label">Operating Expenses</div><div class="kpi-val">${formatTZS(totalExpenses)}</div></div>
    <div class="kpi"><div class="kpi-label">Net Take-Home Profit</div><div class="kpi-val">${formatTZS(netProfit)}</div></div>
  </div>

  <h2>1. Profit & Loss + Cash Flow Summary</h2>
  <table>
    <tbody>
      <tr><td>Total Sales Revenue</td><td class="right"><strong>${formatTZS(totalRevenue)}</strong></td><td>Starting Cash Balance</td><td class="right">${formatTZS(openingCash)}</td></tr>
      <tr><td>Less: Buying Cost of Items Sold (COGS)</td><td class="right">- ${formatTZS(totalCOGS)}</td><td>+ Total Cash In (Sales + Receipts)</td><td class="right">+ ${formatTZS(totalCashIn)}</td></tr>
      <tr><td><strong>Gross Profit</strong></td><td class="right"><strong>${formatTZS(grossProfit)}</strong></td><td>- Total Cash Out (Purchases + Bills + Expenses)</td><td class="right">- ${formatTZS(totalCashOut)}</td></tr>
      <tr><td>Less: Shop Operating Expenses</td><td class="right">- ${formatTZS(totalExpenses)}</td><td><strong>Closing Cash on Hand</strong></td><td class="right"><strong>${formatTZS(closingCashBalance)}</strong></td></tr>
      <tr><td><strong>Take-Home Net Profit</strong></td><td class="right"><strong>${formatTZS(netProfit)}</strong></td><td></td><td></td></tr>
    </tbody>
  </table>

  <h2>2. Unpaid Customer Credit Invoices (${creditSalesList.length})</h2>
  <table>
    <thead><tr><th>Invoice</th><th>Date</th><th>Customer</th><th class="right">Total Bill</th><th class="right">Paid</th><th class="right">Balance Owed</th></tr></thead>
    <tbody>
      ${creditSalesList.map((s) => `<tr><td>${s.invoiceNo}</td><td>${s.saleDate}</td><td>${s.customerName}</td><td class="right">${formatTZS(s.totalAmount)}</td><td class="right">${formatTZS(s.amountPaid)}</td><td class="right"><strong>${formatTZS(s.balanceDue)}</strong></td></tr>`).join('') || '<tr><td colspan="6">No unpaid customer invoices</td></tr>'}
    </tbody>
  </table>

  <h2>3. Unpaid Supplier Restock Bills (${creditPurchasesList.length})</h2>
  <table>
    <thead><tr><th>Bill No</th><th>Date</th><th>Supplier</th><th class="right">Total Bill</th><th class="right">Paid</th><th class="right">Still Owed</th></tr></thead>
    <tbody>
      ${creditPurchasesList.map((p) => `<tr><td>${p.billNo}</td><td>${p.purchaseDate}</td><td>${p.supplierName}</td><td class="right">${formatTZS(p.totalAmount)}</td><td class="right">${formatTZS(p.amountPaid)}</td><td class="right"><strong>${formatTZS(p.balanceDue)}</strong></td></tr>`).join('') || '<tr><td colspan="6">No unpaid supplier bills</td></tr>'}
    </tbody>
  </table>

  <h2>4. Product & Service Profitability Breakdown</h2>
  <table>
    <thead><tr><th>Item / Service</th><th>Type</th><th class="right">Cost</th><th class="right">Selling Price</th><th class="right">Margin</th><th class="right">Qty Sold</th><th class="right">Total Profit</th></tr></thead>
    <tbody>
      ${itemMetrics
        .sort((a, b) => b.profitInPeriod - a.profitInPeriod)
        .map((m) => `<tr><td>${m.name}</td><td>${m.itemType}</td><td class="right">${formatTZS(m.costPrice)}</td><td class="right">${formatTZS(m.sellingPrice)}</td><td class="right">${m.marginPct}%</td><td class="right">${m.qtySoldInPeriod}</td><td class="right"><strong>${formatTZS(m.profitInPeriod)}</strong></td></tr>`)
        .join('')}
    </tbody>
  </table>

  <h2>5. Customer & Supplier Ledger Statements (${filteredLedger.length} entries)</h2>
  <table>
    <thead><tr><th>Date</th><th>Party Name</th><th>Voucher</th><th>Ref</th><th>Description</th><th class="right">Debit</th><th class="right">Credit</th><th class="right">Balance</th></tr></thead>
    <tbody>
      ${ledgerEntries
        .filter((l) => isWithinDateRange(l.entryDate, startDate, endDate))
        .map((l) => `<tr><td>${l.entryDate}</td><td>${l.partyName}</td><td>${l.voucherType}</td><td>${l.voucherNo}</td><td>${l.description}</td><td class="right">${formatTZS(l.debit)}</td><td class="right">${formatTZS(l.credit)}</td><td class="right"><strong>${formatTZS(l.runningBalance)}</strong></td></tr>`)
        .join('')}
    </tbody>
  </table>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `All_Reports_${businessName.replace(/\s+/g, '_')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const showSection = (sectionId: string) =>
    subTab === sectionId || subTab === 'all_reports';

  return (
    <div className="space-y-8">
      {/* Print-Only Official Report Header */}
      <div className="hidden print:block border-b-2 border-emerald-700 pb-4 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900">{businessName}</h1>
            <p className="text-xs text-slate-600">
              {subTab === 'all_reports'
                ? 'Complete Business Financial, Inventory & Ledger Reports Pack'
                : 'Official Business Financial & Operations Report'}{' '}
              · Currency: TZS
            </p>
          </div>
          <div className="text-right text-xs font-mono-num text-slate-600">
            <div>Period: {periodLabel}</div>
            <div>Printed: {new Date().toLocaleDateString()}</div>
          </div>
        </div>
      </div>

      {/* Top Reports Control Bar: Segmented Report Selector + Print Current / Print All Buttons */}
      <div
        className={`rounded-2xl border p-4 space-y-4 no-print ${
          isDark ? 'bg-[#171B22] border-[#252B37]' : 'bg-white border-[#E8E4DD] shadow-xs'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-[#252B37]">
          <div>
            <h2 className="font-display text-xl font-semibold">
              Business Financial & Inventory Reports Suite
            </h2>
            <p className="text-xs opacity-75">
              Period: <span className="font-mono-num font-semibold">{periodLabel}</span> · Select an individual report or print all reports at once
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handlePrintCurrentReport}
              className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                isDark
                  ? 'bg-[#0F1217] border-[#252B37] text-slate-100 hover:border-emerald-500/60'
                  : 'bg-[#FAF8F5] border-[#E8E4DD] text-slate-800 hover:border-emerald-600/60'
              }`}
            >
              <Printer className="w-4 h-4 text-emerald-600" />
              <span>Print Current Report</span>
            </button>

            <button
              type="button"
              onClick={handlePrintAllReports}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition cursor-pointer whitespace-nowrap"
            >
              <Layers className="w-4 h-4" />
              <span>Print All Reports</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadAllReportsHtml}
              className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                isDark
                  ? 'bg-[#0F1217] border-[#252B37] text-emerald-400 hover:bg-slate-800'
                  : 'bg-[#FAF8F5] border-[#E8E4DD] text-emerald-800 hover:bg-emerald-50'
              }`}
              title="Download standalone printable HTML/PDF pack of all reports"
            >
              <FileText className="w-4 h-4" />
              <span>Download Full Report Pack</span>
            </button>
          </div>
        </div>

        {/* Report Tabs */}
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: 'outstanding', label: 'Who Owes You & Supplier Bills' },
            { id: 'pnl_cashflow', label: 'Profit & Cash Flow Summary' },
            { id: 'fast_slow', label: 'Best-Selling vs. Slow Items' },
            { id: 'profitability', label: 'Profit Per Product & Service' },
            { id: 'ledger', label: 'Customer & Supplier Statements' },
            { id: 'all_reports', label: 'All Reports View (Print Ready)' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubTab(tab.id as any)}
              className={`rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold transition cursor-pointer whitespace-nowrap ${
                subTab === tab.id
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : isDark
                  ? 'text-slate-300 hover:bg-[#252B37]/60'
                  : 'text-slate-700 hover:bg-[#FAF8F5]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 1. OUTSTANDING RECEIVABLES & PAYABLES REPORT */}
      {showSection('outstanding') && (
        <div className="space-y-8">
          {/* Unpaid Customer Credit Invoices (Products & Services) */}
          <div
            className={`rounded-2xl border overflow-hidden ${
              isDark ? 'bg-[#171B22] border-[#252B37]' : 'bg-white border-[#E8E4DD] shadow-xs'
            }`}
          >
            <div className="p-6 border-b border-slate-200 dark:border-[#252B37] flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="font-display text-xl font-semibold">
                  Unpaid Customer Invoices (Products & Services on Credit)
                </h3>
                <p className="text-sm opacity-75 mt-1">
                  Every unpaid or partly paid sale — including booked services or consultations done
                  on credit — is listed below so you can collect payment easily.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2.5 no-print">
                <button
                  type="button"
                  onClick={() => onOpenPaymentModal('customer_receipt')}
                  className="rounded-xl bg-emerald-700 hover:bg-emerald-800 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white transition cursor-pointer"
                >
                  + Receive Customer Payment
                </button>
                <button
                  type="button"
                  onClick={() =>
                    exportJsonToExcel(
                      'Unpaid_Customer_Sales_TZS.xlsx',
                      'Credit_Sales',
                      creditSalesList.map((s) => ({
                        'Invoice No': s.invoiceNo,
                        Date: s.saleDate,
                        Customer: s.customerName,
                        'Total Sale (TZS)': s.totalAmount,
                        'Paid So Far (TZS)': s.amountPaid,
                        'Balance Owed (TZS)': s.balanceDue,
                        Staff: s.staffName,
                      }))
                    )
                  }
                  className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs sm:text-sm font-semibold transition cursor-pointer ${
                    isDark
                      ? 'border-[#252B37] hover:bg-[#252B37]'
                      : 'border-[#E8E4DD] hover:bg-[#FAF8F5]'
                  }`}
                >
                  <Download className="w-4 h-4 text-emerald-600" /> Export Excel
                </button>
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
                    <th className="py-3.5 px-5 font-semibold">Receipt / Invoice</th>
                    <th className="py-3.5 px-4 font-semibold">Date</th>
                    <th className="py-3.5 px-4 font-semibold">Customer Name</th>
                    <th className="py-3.5 px-5 font-semibold">Products & Services</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Total Bill</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Paid</th>
                    <th className="py-3.5 px-5 font-semibold text-right">Amount Owed</th>
                    <th className="py-3.5 px-5 font-semibold text-right no-print">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-[#252B37]">
                  {creditSalesList.map((s) => {
                    const lines = saleItems.filter((si) => si.saleId === s.id);
                    return (
                      <tr key={s.id} className="hover:bg-slate-500/5">
                        <td className="py-4 px-5 font-mono-num font-semibold text-emerald-700 dark:text-emerald-400">
                          {s.invoiceNo}
                        </td>
                        <td className="py-4 px-4 font-mono-num opacity-80">{s.saleDate}</td>
                        <td className="py-4 px-4 font-semibold">{s.customerName}</td>
                        <td className="py-4 px-5">
                          <div className="text-sm">
                            {lines
                              .map(
                                (l) =>
                                  `${l.quantity}× ${l.itemName} (${
                                    l.itemType === 'service' ? 'Service' : 'Product'
                                  })`
                              )
                              .join(' · ')}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-right font-mono-num">
                          {formatTZS(s.totalAmount)}
                        </td>
                        <td className="py-4 px-4 text-right font-mono-num text-emerald-700 dark:text-emerald-400">
                          {formatTZS(s.amountPaid)}
                        </td>
                        <td className="py-4 px-5 text-right font-mono-num font-bold text-amber-700 dark:text-amber-400">
                          {formatTZS(s.balanceDue)}
                        </td>
                        <td className="py-4 px-5 text-right no-print">
                          <div className="inline-flex items-center justify-end gap-2">
                            {onPrintSaleReceipt && (
                              <button
                                type="button"
                                onClick={() => onPrintSaleReceipt(s)}
                                className={`inline-flex items-center gap-1 rounded-xl border px-3 py-2 text-xs font-semibold transition cursor-pointer ${
                                  isDark
                                    ? 'border-[#252B37] hover:bg-[#252B37]'
                                    : 'border-[#E8E4DD] hover:bg-[#FAF8F5]'
                                }`}
                              >
                                <Printer className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Print</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() =>
                                onOpenPaymentModal(
                                  'customer_receipt',
                                  s.customerId || undefined,
                                  s.id
                                )
                              }
                              className="rounded-xl bg-emerald-700 hover:bg-emerald-800 px-3.5 py-2 text-xs font-semibold text-white transition cursor-pointer"
                            >
                              Collect Payment
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {creditSalesList.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-base opacity-65">
                        All customer sales in this date period are fully paid!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Unpaid Supplier Bills */}
          <div
            className={`rounded-2xl border overflow-hidden ${
              isDark ? 'bg-[#171B22] border-[#252B37]' : 'bg-white border-[#E8E4DD] shadow-xs'
            }`}
          >
            <div className="p-6 border-b border-slate-200 dark:border-[#252B37] flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="font-display text-xl font-semibold">
                  Unpaid Supplier Restock Bills (Money You Owe Suppliers)
                </h3>
                <p className="text-sm opacity-75 mt-1">
                  Keep track of supplier stock purchases that were bought on credit or partly paid.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onOpenPaymentModal('supplier_payment')}
                className="rounded-xl bg-amber-700 hover:bg-amber-800 px-4 py-2.5 text-sm font-semibold text-white transition cursor-pointer no-print"
              >
                + Pay a Supplier
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
                    <th className="py-3.5 px-5 font-semibold">Bill Number</th>
                    <th className="py-3.5 px-4 font-semibold">Date</th>
                    <th className="py-3.5 px-5 font-semibold">Supplier Name</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Total Bill</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Paid So Far</th>
                    <th className="py-3.5 px-5 font-semibold text-right">Still Owed</th>
                    <th className="py-3.5 px-5 font-semibold text-right no-print">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-[#252B37]">
                  {creditPurchasesList.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-500/5">
                      <td className="py-4 px-5 font-mono-num font-semibold">{p.billNo}</td>
                      <td className="py-4 px-4 font-mono-num opacity-80">{p.purchaseDate}</td>
                      <td className="py-4 px-5 font-semibold">{p.supplierName}</td>
                      <td className="py-4 px-4 text-right font-mono-num">
                        {formatTZS(p.totalAmount)}
                      </td>
                      <td className="py-4 px-4 text-right font-mono-num text-emerald-700 dark:text-emerald-400">
                        {formatTZS(p.amountPaid)}
                      </td>
                      <td className="py-4 px-5 text-right font-mono-num font-bold text-rose-600 dark:text-rose-400">
                        {formatTZS(p.balanceDue)}
                      </td>
                      <td className="py-4 px-5 text-right no-print">
                        <button
                          type="button"
                          onClick={() =>
                            onOpenPaymentModal('supplier_payment', p.supplierId || undefined, p.id)
                          }
                          className="rounded-xl bg-amber-700 hover:bg-amber-800 px-3.5 py-2 text-xs font-semibold text-white transition cursor-pointer"
                        >
                          Pay Supplier
                        </button>
                      </td>
                    </tr>
                  ))}
                  {creditPurchasesList.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-base opacity-65">
                        All supplier restock bills in this date period are settled!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. PROFIT & LOSS + CASH FLOW STATEMENT */}
      {showSection('pnl_cashflow') && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Profit & Loss Statement */}
          <div
            className={`rounded-2xl border p-6 md:p-8 space-y-6 ${
              isDark ? 'bg-[#171B22] border-[#252B37]' : 'bg-white border-[#E8E4DD] shadow-xs'
            }`}
          >
            <div className="border-b border-slate-200 dark:border-[#252B37] pb-4">
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                Profit & Loss Summary
              </p>
              <h3 className="font-display text-2xl font-semibold mt-1">
                How Much Profit Did You Make?
              </h3>
              <p className="text-sm opacity-75 mt-1">
                Total sales minus item costs and shop operating expenses.
              </p>
            </div>

            <div className="space-y-4 text-base">
              <div className="flex items-center justify-between py-2">
                <span>Total Sales (Products & Services)</span>
                <span className="font-mono-num font-bold text-emerald-700 dark:text-emerald-400">
                  {formatTZS(totalRevenue)}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 opacity-80">
                <span>Less: Buying Cost of Items Sold</span>
                <span className="font-mono-num">- {formatTZS(totalCOGS)}</span>
              </div>
              <div className="flex items-center justify-between py-3 border-y border-slate-200 dark:border-[#252B37] font-semibold">
                <span>Gross Profit Before Expenses</span>
                <span className="font-mono-num">{formatTZS(grossProfit)}</span>
              </div>
              <div className="flex items-center justify-between py-2 text-rose-600 dark:text-rose-400">
                <span>Less: Shop Operating Expenses (Rent, Utilities, etc.)</span>
                <span className="font-mono-num">- {formatTZS(totalExpenses)}</span>
              </div>

              <div
                className={`rounded-2xl p-5 flex items-center justify-between ${
                  netProfit >= 0
                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                    : 'bg-rose-500/10 border border-rose-500/30 text-rose-600'
                }`}
              >
                <div>
                  <div className="text-sm font-semibold">
                    Take-Home Net Profit
                  </div>
                  <div className="text-xs opacity-75">After all costs and expenses</div>
                </div>
                <div className="text-2xl font-bold font-mono-num">{formatTZS(netProfit)}</div>
              </div>
            </div>
          </div>

          {/* Cash Flow Statement */}
          <div
            className={`rounded-2xl border p-6 md:p-8 space-y-6 ${
              isDark ? 'bg-[#171B22] border-[#252B37]' : 'bg-white border-[#E8E4DD] shadow-xs'
            }`}
          >
            <div className="border-b border-slate-200 dark:border-[#252B37] pb-4">
              <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                Real-Time Cash Flow
              </p>
              <h3 className="font-display text-2xl font-semibold mt-1">
                Where Did Your Cash Come & Go?
              </h3>
              <p className="text-sm opacity-75 mt-1">
                Actual money received and paid out across Cash, M-Pesa, and Bank.
              </p>
            </div>

            <div className="space-y-3.5 text-base">
              <div className="flex items-center justify-between py-1.5">
                <span className="opacity-80">Starting Cash in Shop</span>
                <span className="font-mono-num font-semibold">{formatTZS(openingCash)}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 text-emerald-700 dark:text-emerald-400">
                <span>+ Cash Collected from Direct Sales</span>
                <span className="font-mono-num">+ {formatTZS(cashFromSales)}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 text-emerald-700 dark:text-emerald-400">
                <span>+ Customer Credit Payments Received</span>
                <span className="font-mono-num">+ {formatTZS(cashFromCustomerReceipts)}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 text-rose-600 dark:text-rose-400">
                <span>- Cash Paid for Stock Purchases</span>
                <span className="font-mono-num">- {formatTZS(cashOutPurchases)}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 text-rose-600 dark:text-rose-400">
                <span>- Cash Paid to Settle Supplier Bills</span>
                <span className="font-mono-num">- {formatTZS(cashOutSupplierPayments)}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 text-rose-600 dark:text-rose-400">
                <span>- Cash Paid for Shop Expenses</span>
                <span className="font-mono-num">- {formatTZS(cashOutPaidExpenses)}</span>
              </div>

              <div
                className={`rounded-2xl p-5 flex items-center justify-between border ${
                  isDark
                    ? 'bg-[#0F1217] border-[#252B37]'
                    : 'bg-[#FAF8F5] border-[#E8E4DD]'
                }`}
              >
                <div>
                  <div className="text-sm font-semibold">
                    Available Cash On Hand
                  </div>
                  <div className="text-xs opacity-75">Ready in Cash Box / M-Pesa / Bank</div>
                </div>
                <div className="text-2xl font-bold font-mono-num text-emerald-700 dark:text-emerald-400">
                  {formatTZS(closingCashBalance)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. FAST-MOVING & SLOW-MOVING REPORT (SEPARATE FOR PRODUCTS & SERVICES) */}
      {showSection('fast_slow') && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Products Fast/Slow */}
          <div
            className={`rounded-2xl border overflow-hidden ${
              isDark ? 'bg-[#171B22] border-[#252B37]' : 'bg-white border-[#E8E4DD] shadow-xs'
            }`}
          >
            <div className="p-6 border-b border-slate-200 dark:border-[#252B37]">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 text-sm font-semibold">
                <Package className="w-4 h-4" />
                <span>Physical Shop Inventory</span>
              </div>
              <h3 className="font-display text-xl font-semibold mt-1">
                Fast-Moving vs. Slow-Moving Products
              </h3>
              <p className="text-sm opacity-75 mt-0.5">
                Shows which retail items sell fastest so you know what to restock first.
              </p>
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
                    <th className="py-3.5 px-5 font-semibold">Product Name</th>
                    <th className="py-3.5 px-3 font-semibold">Speed</th>
                    <th className="py-3.5 px-3 font-semibold text-right">Sold</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Stock Left</th>
                    <th className="py-3.5 px-5 font-semibold text-right">Sales (TZS)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-[#252B37]">
                  {productMetrics.map((item, idx) => {
                    const isFast = item.qtySoldInPeriod >= 3 || (idx < 2 && item.qtySoldInPeriod > 0);
                    return (
                      <tr key={item.id} className="hover:bg-slate-500/5">
                        <td className="py-4 px-5 font-semibold">{item.name}</td>
                        <td className="py-4 px-3">
                          <span
                            className={`font-semibold text-xs ${
                              isFast
                                ? 'text-emerald-700 dark:text-emerald-400'
                                : item.qtySoldInPeriod === 0
                                ? 'text-rose-600 dark:text-rose-400'
                                : 'text-amber-700 dark:text-amber-400'
                            }`}
                          >
                            {isFast
                              ? 'Fast-Moving'
                              : item.qtySoldInPeriod === 0
                              ? 'No Sales Yet'
                              : 'Slow-Moving'}
                          </span>
                        </td>
                        <td className="py-4 px-3 text-right font-mono-num font-bold">
                          {item.qtySoldInPeriod}
                        </td>
                        <td className="py-4 px-4 text-right font-mono-num">
                          {item.currentStock}
                        </td>
                        <td className="py-4 px-5 text-right font-mono-num font-semibold">
                          {formatTZS(item.revenueInPeriod)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Services Fast/Slow */}
          <div
            className={`rounded-2xl border overflow-hidden ${
              isDark ? 'bg-[#171B22] border-[#252B37]' : 'bg-white border-[#E8E4DD] shadow-xs'
            }`}
          >
            <div className="p-6 border-b border-slate-200 dark:border-[#252B37]">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-sm font-semibold">
                <Sparkles className="w-4 h-4" />
                <span>Services & Consultations Menu</span>
              </div>
              <h3 className="font-display text-xl font-semibold mt-1">
                Most Popular vs. Slow Services
              </h3>
              <p className="text-sm opacity-75 mt-0.5">
                Ranked by how many sessions were completed in the selected period.
              </p>
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
                    <th className="py-3.5 px-5 font-semibold">Service / Session</th>
                    <th className="py-3.5 px-3 font-semibold">Demand</th>
                    <th className="py-3.5 px-3 font-semibold text-right">Sessions</th>
                    <th className="py-3.5 px-5 font-semibold text-right">Sales (TZS)</th>
                    <th className="py-3.5 px-5 font-semibold text-right">Profit (TZS)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-[#252B37]">
                  {serviceMetrics.map((item, idx) => {
                    const isFast = item.qtySoldInPeriod >= 2 || (idx < 2 && item.qtySoldInPeriod > 0);
                    return (
                      <tr key={item.id} className="hover:bg-slate-500/5">
                        <td className="py-4 px-5 font-semibold">{item.name}</td>
                        <td className="py-4 px-3">
                          <span
                            className={`font-semibold text-xs ${
                              isFast
                                ? 'text-amber-700 dark:text-amber-400'
                                : item.qtySoldInPeriod === 0
                                ? 'text-rose-600 dark:text-rose-400'
                                : 'text-slate-500'
                            }`}
                          >
                            {isFast
                              ? 'High Demand'
                              : item.qtySoldInPeriod === 0
                              ? 'No Bookings'
                              : 'Steady'}
                          </span>
                        </td>
                        <td className="py-4 px-3 text-right font-mono-num font-bold">
                          {item.qtySoldInPeriod}
                        </td>
                        <td className="py-4 px-5 text-right font-mono-num">
                          {formatTZS(item.revenueInPeriod)}
                        </td>
                        <td className="py-4 px-5 text-right font-mono-num font-semibold text-emerald-700 dark:text-emerald-400">
                          {formatTZS(item.profitInPeriod)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4. ITEM & SERVICE PROFITABILITY REPORT */}
      {showSection('profitability') && (
        <div
          className={`rounded-2xl border overflow-hidden ${
            isDark ? 'bg-[#171B22] border-[#252B37]' : 'bg-white border-[#E8E4DD] shadow-xs'
          }`}
        >
          <div className="p-6 border-b border-slate-200 dark:border-[#252B37] flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="font-display text-xl font-semibold">
                Profit Breakdown for Every Product & Service
              </h3>
              <p className="text-sm opacity-75 mt-1">
                Compare buying/consumable cost against selling price to see which items bring home
                the highest profit in TZS.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                exportJsonToExcel(
                  'Item_Profitability_Report_TZS.xlsx',
                  'Profitability',
                  itemMetrics.map((m) => ({
                    Name: m.name,
                    Type: m.itemType,
                    'Cost Price (TZS)': m.costPrice,
                    'Selling Price (TZS)': m.sellingPrice,
                    'Profit Per Unit (TZS)': m.unitProfit,
                    'Margin %': `${m.marginPct}%`,
                    'Units Sold': m.qtySoldInPeriod,
                    'Total Profit Earned (TZS)': m.profitInPeriod,
                  }))
                )
              }
              className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold cursor-pointer no-print ${
                isDark ? 'border-[#252B37]' : 'border-[#E8E4DD]'
              }`}
            >
              <Download className="w-4 h-4 text-emerald-600" /> Export Excel
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
                  <th className="py-3.5 px-5 font-semibold">Item / Service</th>
                  <th className="py-3.5 px-4 font-semibold">Kind</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Cost</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Selling Price</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Profit Each</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Margin</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Qty Sold</th>
                  <th className="py-3.5 px-5 font-semibold text-right">Total Profit Earned</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-[#252B37]">
                {itemMetrics
                  .sort((a, b) => b.profitInPeriod - a.profitInPeriod)
                  .map((item) => (
                    <tr key={item.id} className="hover:bg-slate-500/5">
                      <td className="py-4 px-5 font-semibold">{item.name}</td>
                      <td className="py-4 px-4 opacity-80 capitalize">{item.itemType}</td>
                      <td className="py-4 px-4 text-right font-mono-num">
                        {formatTZS(item.costPrice)}
                      </td>
                      <td className="py-4 px-4 text-right font-mono-num">
                        {formatTZS(item.sellingPrice)}
                      </td>
                      <td className="py-4 px-4 text-right font-mono-num font-semibold text-emerald-700 dark:text-emerald-400">
                        +{formatTZS(item.unitProfit)}
                      </td>
                      <td className="py-4 px-4 text-right font-mono-num font-semibold">
                        {item.marginPct}%
                      </td>
                      <td className="py-4 px-4 text-right font-mono-num font-bold">
                        {item.qtySoldInPeriod}
                      </td>
                      <td className="py-4 px-5 text-right font-mono-num font-bold text-emerald-700 dark:text-emerald-400">
                        {formatTZS(item.profitInPeriod)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. CUSTOMER & SUPPLIER LEDGER STATEMENTS */}
      {showSection('ledger') && (
        <div
          className={`rounded-2xl border overflow-hidden ${
            isDark ? 'bg-[#171B22] border-[#252B37]' : 'bg-white border-[#E8E4DD] shadow-xs'
          }`}
        >
          <div className="p-6 border-b border-slate-200 dark:border-[#252B37] flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="font-display text-xl font-semibold">
                Customer & Supplier Account Statements
              </h3>
              <p className="text-sm opacity-75 mt-1">
                See every sale, credit purchase, payment received, and running balance for any
                person.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 no-print">
              <div
                className={`inline-flex p-1 rounded-xl border ${
                  isDark ? 'bg-[#0F1217] border-[#252B37]' : 'bg-[#FAF8F5] border-[#E8E4DD]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPartyType('customer');
                    setSelectedPartyId('');
                  }}
                  className={`rounded-lg px-3.5 py-1.5 text-sm font-semibold transition cursor-pointer ${
                    selectedPartyType === 'customer'
                      ? 'bg-emerald-700 text-white'
                      : 'opacity-75'
                  }`}
                >
                  Customers
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPartyType('supplier');
                    setSelectedPartyId('');
                  }}
                  className={`rounded-lg px-3.5 py-1.5 text-sm font-semibold transition cursor-pointer ${
                    selectedPartyType === 'supplier'
                      ? 'bg-amber-700 text-white'
                      : 'opacity-75'
                  }`}
                >
                  Suppliers
                </button>
              </div>

              <select
                value={selectedPartyId}
                onChange={(e) => setSelectedPartyId(e.target.value)}
                className={`rounded-xl border px-4 py-2 text-sm font-semibold ${
                  isDark ? 'bg-[#0F1217] border-[#252B37]' : 'bg-[#FAF8F5] border-[#E8E4DD]'
                }`}
              >
                <option value="">
                  All {selectedPartyType === 'customer' ? 'Customers' : 'Suppliers'}
                </option>
                {(selectedPartyType === 'customer' ? customers : suppliers).map((p) => (
                  <option key={p.id} value={String(p.id)}>
                    {p.name} (Balance: {formatTZS(p.outstandingBalance)})
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() =>
                  exportJsonToExcel(
                    'Account_Statement_TZS.xlsx',
                    'Statement',
                    filteredLedger.map((l) => ({
                      Date: l.entryDate,
                      Name: l.partyName,
                      Type: l.voucherType,
                      Reference: l.voucherNo,
                      Details: l.description,
                      'Billed / Debit (TZS)': l.debit,
                      'Paid / Credit (TZS)': l.credit,
                      'Running Balance (TZS)': l.runningBalance,
                    }))
                  )
                }
                className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold cursor-pointer ${
                  isDark ? 'border-[#252B37]' : 'border-[#E8E4DD]'
                }`}
              >
                <Download className="w-4 h-4 text-emerald-600" /> Export Statement
              </button>
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
                  <th className="py-3.5 px-5 font-semibold">Date</th>
                  <th className="py-3.5 px-4 font-semibold">Name</th>
                  <th className="py-3.5 px-4 font-semibold">Transaction</th>
                  <th className="py-3.5 px-4 font-semibold">Reference</th>
                  <th className="py-3.5 px-5 font-semibold">Description</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Billed (TZS)</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Paid (TZS)</th>
                  <th className="py-3.5 px-5 font-semibold text-right">Remaining Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-[#252B37]">
                {(subTab === 'all_reports'
                  ? ledgerEntries.filter((l) => isWithinDateRange(l.entryDate, startDate, endDate))
                  : filteredLedger
                ).map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-500/5">
                    <td className="py-4 px-5 font-mono-num opacity-80">{entry.entryDate}</td>
                    <td className="py-4 px-4 font-semibold">{entry.partyName}</td>
                    <td className="py-4 px-4 font-medium">{entry.voucherType}</td>
                    <td className="py-4 px-4 font-mono-num font-semibold">{entry.voucherNo}</td>
                    <td className="py-4 px-5 opacity-85">{entry.description}</td>
                    <td className="py-4 px-4 text-right font-mono-num">
                      {Number(entry.debit) > 0 ? formatTZS(entry.debit) : '—'}
                    </td>
                    <td className="py-4 px-4 text-right font-mono-num text-emerald-700 dark:text-emerald-400">
                      {Number(entry.credit) > 0 ? formatTZS(entry.credit) : '—'}
                    </td>
                    <td className="py-4 px-5 text-right font-mono-num font-bold">
                      {formatTZS(entry.runningBalance)}
                    </td>
                  </tr>
                ))}
                {filteredLedger.length === 0 && subTab !== 'all_reports' && (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-base opacity-60">
                      No account activity found for the selected person and date period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
