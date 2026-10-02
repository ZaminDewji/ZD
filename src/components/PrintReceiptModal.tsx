import React, { useState } from 'react';
import { Printer, Download, X, CheckCircle2, FileText, Receipt } from 'lucide-react';
import { Customer, Sale, SaleItem } from '../types.ts';
import { formatTZS } from '../utils/format.ts';

interface PrintReceiptModalProps {
  sale: Sale | null;
  saleItems: SaleItem[];
  customer?: Customer | null;
  businessName: string;
  onClose: () => void;
  isDark: boolean;
}

export const PrintReceiptModal: React.FC<PrintReceiptModalProps> = ({
  sale,
  saleItems,
  customer,
  businessName,
  onClose,
  isDark,
}) => {
  const [layoutMode, setLayoutMode] = useState<'invoice' | 'thermal'>('invoice');

  if (!sale) return null;

  const items = saleItems.filter((si) => si.saleId === sale.id);
  const totalAmount = Number(sale.totalAmount || 0);
  const amountPaid = Number(sale.amountPaid || 0);
  const balanceDue = Number(sale.balanceDue || 0);

  const handleTriggerPrint = () => {
    window.print();
  };

  const handleDownloadPrintableHtml = () => {
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Receipt_${sale.invoiceNo}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #111827; margin: 0; padding: 32px; background: #ffffff; }
    .container { max-width: ${layoutMode === 'thermal' ? '340px' : '760px'}; margin: 0 auto; border: 1px solid #e5e7eb; padding: ${layoutMode === 'thermal' ? '20px' : '36px'}; border-radius: 8px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #047857; padding-bottom: 16px; margin-bottom: 20px; }
    .title { font-size: ${layoutMode === 'thermal' ? '18px' : '24px'}; font-weight: 700; color: #065f46; margin: 0; }
    .subtitle { font-size: 12px; color: #4b5563; margin-top: 4px; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; }
    th { background: #f9fafb; text-align: left; padding: 10px 8px; border-bottom: 1px solid #d1d5db; font-weight: 600; }
    td { padding: 10px 8px; border-bottom: 1px solid #e5e7eb; }
    .right { text-align: right; font-variant-numeric: tabular-nums; }
    .totals { margin-left: auto; width: ${layoutMode === 'thermal' ? '100%' : '280px'}; font-size: 14px; }
    .totals-row { display: flex; justify-content: space-between; padding: 6px 0; }
    .totals-row.bold { font-weight: 700; font-size: 16px; border-top: 2px solid #111827; padding-top: 10px; margin-top: 4px; }
    .footer { margin-top: 28px; padding-top: 16px; border-top: 1px dashed #d1d5db; text-align: center; font-size: 12px; color: #6b7280; }
    @media print { body { padding: 0; } .container { border: none; } }
  </style>
</head>
<body onload="window.print()">
  <div class="container">
    <div class="header">
      <div>
        <h1 class="title">${businessName}</h1>
        <div class="subtitle">Official Customer Sales Receipt · Currency: TZS</div>
      </div>
      <div class="right">
        <div style="font-weight:700; font-size:15px;">${sale.invoiceNo}</div>
        <div class="subtitle">Date: ${sale.saleDate}</div>
      </div>
    </div>
    <div class="meta-grid">
      <div>
        <strong>Billed To:</strong><br/>
        ${sale.customerName}<br/>
        ${customer?.phone ? `Tel: ${customer.phone}<br/>` : ''}
        ${customer?.email ? `${customer.email}` : ''}
      </div>
      <div class="right">
        <strong>Payment Method:</strong> ${sale.paymentMethod.replace('_', ' ').toUpperCase()}<br/>
        <strong>Status:</strong> ${balanceDue > 0 ? 'CREDIT / BALANCE DUE' : 'PAID IN FULL'}<br/>
        <strong>Served By:</strong> ${sale.staffName}
      </div>
    </div>
    <table>
      <thead>
        <tr>
          <th>Item / Service</th>
          <th class="right">Qty</th>
          <th class="right">Unit Price</th>
          <th class="right">Total (TZS)</th>
        </tr>
      </thead>
      <tbody>
        ${items
          .map(
            (it) => `<tr>
          <td>${it.itemName} <span style="color:#6b7280;font-size:11px;">(${it.itemType === 'service' ? 'Service' : 'Product'})</span></td>
          <td class="right">${it.quantity}</td>
          <td class="right">${formatTZS(it.unitPrice)}</td>
          <td class="right"><strong>${formatTZS(it.lineTotal)}</strong></td>
        </tr>`
          )
          .join('')}
      </tbody>
    </table>
    <div class="totals">
      <div class="totals-row bold">
        <span>Total Amount:</span>
        <span>${formatTZS(totalAmount)}</span>
      </div>
      <div class="totals-row" style="color:#047857;">
        <span>Amount Paid:</span>
        <span>${formatTZS(amountPaid)}</span>
      </div>
      <div class="totals-row" style="color:${balanceDue > 0 ? '#b45309' : '#374151'}; font-weight:600;">
        <span>Balance Due:</span>
        <span>${formatTZS(balanceDue)}</span>
      </div>
    </div>
    ${sale.notes ? `<div style="margin-top:16px;font-size:12px;color:#4b5563;"><strong>Notes:</strong> ${sale.notes}</div>` : ''}
    <div class="footer">
      Thank you for choosing ${businessName}!<br/>
      Printed on ${new Date().toLocaleDateString()}
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Receipt_${sale.invoiceNo}_${sale.saleDate}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-xs overflow-y-auto print:static print:bg-white print:p-0 print:block">
      <div
        className={`w-full max-w-3xl rounded-2xl border shadow-2xl overflow-hidden my-8 print:my-0 print:max-w-none print:border-none print:shadow-none print:rounded-none ${
          isDark
            ? 'bg-[#171B22] border-[#252B37] text-slate-100 print:bg-white print:text-slate-900'
            : 'bg-white border-[#E8E4DD] text-slate-900'
        }`}
      >
        {/* Top Action Bar (Hidden when printing) */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 bg-emerald-700 text-white print:hidden">
          <div className="flex items-center gap-2.5">
            <Printer className="w-5 h-5" />
            <div>
              <h3 className="font-display text-lg font-semibold leading-tight">
                Customer Receipt & Invoice Preview
              </h3>
              <p className="text-xs text-emerald-100">
                {sale.invoiceNo} · Ready for A4 / Thermal Printer or Save as PDF
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Layout Switcher */}
            <div className="inline-flex rounded-xl bg-emerald-800/80 p-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setLayoutMode('invoice')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition cursor-pointer whitespace-nowrap ${
                  layoutMode === 'invoice'
                    ? 'bg-white text-emerald-900 shadow-xs'
                    : 'text-emerald-100 hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Standard Invoice (A4)</span>
              </button>
              <button
                type="button"
                onClick={() => setLayoutMode('thermal')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition cursor-pointer whitespace-nowrap ${
                  layoutMode === 'thermal'
                    ? 'bg-white text-emerald-900 shadow-xs'
                    : 'text-emerald-100 hover:text-white'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>POS Thermal (80mm)</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleTriggerPrint}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white text-emerald-900 hover:bg-emerald-50 px-4 py-2 text-xs font-bold shadow-xs transition cursor-pointer whitespace-nowrap"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save PDF</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPrintableHtml}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white border border-emerald-600 px-3.5 py-2 text-xs font-semibold transition cursor-pointer whitespace-nowrap"
              title="Download standalone printable receipt file"
            >
              <Download className="w-4 h-4" />
              <span>Download Receipt</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 hover:bg-emerald-800 text-white transition cursor-pointer"
              title="Close Preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-6 md:p-8 bg-slate-100/70 dark:bg-[#0F1217] print:bg-white print:p-0 flex justify-center">
          <div
            id="printable-receipt-area"
            className={`w-full bg-white text-slate-900 rounded-xl border border-slate-200 shadow-sm print:border-none print:shadow-none print:rounded-none transition-all ${
              layoutMode === 'thermal' ? 'max-w-[380px] p-6' : 'max-w-2xl p-8 md:p-10'
            }`}
          >
            {/* Receipt Header */}
            <div
              className={`border-b-2 border-emerald-700 pb-5 mb-6 ${
                layoutMode === 'thermal'
                  ? 'text-center space-y-2'
                  : 'flex items-start justify-between gap-4'
              }`}
            >
              <div>
                <div className="inline-flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-emerald-700 text-white font-mono-num font-bold text-xs flex items-center justify-center">
                    TZS
                  </span>
                  <h2 className="font-display text-xl md:text-2xl font-bold text-slate-900">
                    {businessName}
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Official Sales Receipt & Tax Invoice · Tanzanian Shillings (TZS)
                </p>
              </div>

              <div className={layoutMode === 'thermal' ? 'pt-2' : 'text-right'}>
                <div className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                  {balanceDue > 0 ? 'Credit Invoice' : 'Paid Receipt'}
                </div>
                <div className="font-mono-num text-lg font-bold text-slate-900">
                  {sale.invoiceNo}
                </div>
                <div className="text-xs font-mono-num text-slate-500">Date: {sale.saleDate}</div>
              </div>
            </div>

            {/* Customer & Payment Metadata */}
            <div
              className={`grid gap-4 pb-5 mb-5 border-b border-slate-200 text-xs ${
                layoutMode === 'thermal' ? 'grid-cols-1' : 'grid-cols-2'
              }`}
            >
              <div className="space-y-1">
                <div className="text-slate-400 font-semibold">Customer Details</div>
                <div className="font-semibold text-sm text-slate-900">{sale.customerName}</div>
                {customer?.phone && (
                  <div className="font-mono-num text-slate-600">Tel: {customer.phone}</div>
                )}
                {customer?.email && <div className="text-slate-600">{customer.email}</div>}
              </div>

              <div className={`space-y-1 ${layoutMode === 'thermal' ? '' : 'text-right'}`}>
                <div className="text-slate-400 font-semibold">Transaction Details</div>
                <div className="text-slate-700">
                  Payment Method:{' '}
                  <span className="font-semibold capitalize">
                    {sale.paymentMethod.replace('_', ' ')}
                  </span>
                </div>
                <div className="text-slate-700">
                  Served By: <span className="font-semibold">{sale.staffName}</span>
                </div>
                <div className="text-slate-700">
                  Status:{' '}
                  <span
                    className={`font-semibold ${
                      balanceDue > 0 ? 'text-amber-700' : 'text-emerald-700'
                    }`}
                  >
                    {balanceDue > 0 ? 'Partly Paid / Credit' : 'Paid in Full'}
                  </span>
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="mb-6">
              <table className="w-full text-left border-collapse text-xs md:text-sm">
                <thead>
                  <tr className="border-b border-slate-300 text-slate-600">
                    <th className="py-2.5 pr-2 font-semibold">Description</th>
                    <th className="py-2.5 px-2 font-semibold text-right">Qty</th>
                    <th className="py-2.5 px-2 font-semibold text-right">Unit Price</th>
                    <th className="py-2.5 pl-2 font-semibold text-right">Total (TZS)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {items.length > 0 ? (
                    items.map((item) => (
                      <tr key={item.id}>
                        <td className="py-3 pr-2">
                          <div className="font-semibold text-slate-900">{item.itemName}</div>
                          <div className="text-[11px] text-slate-500 capitalize">
                            {item.itemType === 'service' ? 'Service / Session' : 'Retail Product'}
                          </div>
                        </td>
                        <td className="py-3 px-2 text-right font-mono-num font-semibold text-slate-800">
                          {item.quantity}
                        </td>
                        <td className="py-3 px-2 text-right font-mono-num text-slate-600">
                          {formatTZS(item.unitPrice)}
                        </td>
                        <td className="py-3 pl-2 text-right font-mono-num font-bold text-slate-900">
                          {formatTZS(item.lineTotal)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="py-3 pr-2 font-semibold text-slate-900">
                        Consolidated Sale ({sale.invoiceNo})
                      </td>
                      <td className="py-3 px-2 text-right font-mono-num">1</td>
                      <td className="py-3 px-2 text-right font-mono-num">
                        {formatTZS(sale.totalAmount)}
                      </td>
                      <td className="py-3 pl-2 text-right font-mono-num font-bold">
                        {formatTZS(sale.totalAmount)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Totals Summary Box */}
            <div className="flex justify-end border-t border-slate-200 pt-4">
              <div className={layoutMode === 'thermal' ? 'w-full space-y-2' : 'w-72 space-y-2'}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Subtotal ({items.reduce((s, i) => s + i.quantity, 0)} items)</span>
                  <span className="font-mono-num font-semibold text-slate-900">
                    {formatTZS(totalAmount)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-base font-bold border-t border-slate-300 pt-2 text-slate-900">
                  <span>Total Invoice</span>
                  <span className="font-mono-num">{formatTZS(totalAmount)}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-emerald-700 font-semibold">
                  <span>Amount Paid</span>
                  <span className="font-mono-num">{formatTZS(amountPaid)}</span>
                </div>
                <div
                  className={`flex items-center justify-between text-sm font-bold pt-2 border-t border-slate-200 ${
                    balanceDue > 0 ? 'text-amber-700' : 'text-slate-600'
                  }`}
                >
                  <span>Balance Due</span>
                  <span className="font-mono-num">{formatTZS(balanceDue)}</span>
                </div>
              </div>
            </div>

            {sale.notes && (
              <div className="mt-5 rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600">
                <span className="font-semibold text-slate-800">Notes: </span>
                {sale.notes}
              </div>
            )}

            {/* Receipt Footer */}
            <div className="mt-8 pt-4 border-t border-dashed border-slate-300 text-center space-y-1">
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Thank you for your business!</span>
              </div>
              <p className="text-[11px] text-slate-500">
                {businessName} · Keep this receipt for your records
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
