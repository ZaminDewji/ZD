import React, { useState } from 'react';
import {
  Download,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  Package,
  Users,
  Sparkles,
  ArrowRight,
  HelpCircle,
} from 'lucide-react';
import {
  downloadInventoryTemplateExcel,
  downloadPartyTemplateExcel,
  exportJsonToExcel,
  formatTZS,
  parseUploadedExcel,
} from '../utils/format.ts';

interface ExcelImportViewProps {
  onImportRows: (payload: {
    importType: 'catalog' | 'parties';
    rows: Record<string, any>[];
  }) => Promise<{ importedCount: number }>;
  isDark: boolean;
}

export const ExcelImportView: React.FC<ExcelImportViewProps> = ({ onImportRows, isDark }) => {
  const [importType, setImportType] = useState<'catalog' | 'parties'>('catalog');
  const [fileName, setFileName] = useState('');
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, any>[]>([]);
  const [importing, setImporting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorRows, setErrorRows] = useState<Record<string, any>[]>([]);

  const [colMap, setColMap] = useState<Record<string, string>>({});

  const autoGuessMapping = (headers: string[], mode: 'catalog' | 'parties') => {
    const map: Record<string, string> = {};
    const findHeader = (keywords: string[]) =>
      headers.find((h) => keywords.some((k) => h.toLowerCase().includes(k))) || '';

    if (mode === 'catalog') {
      map.name = findHeader(['item name', 'product name', 'service name', 'name']);
      map.itemType = findHeader(['type', 'product/service']);
      map.sku = findHeader(['sku', 'code']);
      map.category = findHeader(['category', 'group']);
      map.costPrice = findHeader(['cost', 'purchase']);
      map.sellingPrice = findHeader(['selling', 'price', 'rate']);
      map.openingStock = findHeader(['opening', 'stock', 'qty', 'quantity']);
      map.reorderLevel = findHeader(['reorder', 'min']);
      map.durationMins = findHeader(['duration', 'min']);
    } else {
      map.name = findHeader(['customer name', 'supplier name', 'name', 'party']);
      map.partyType = findHeader(['party type', 'type']);
      map.phone = findHeader(['phone', 'mobile', 'tel']);
      map.email = findHeader(['email', 'mail']);
      map.openingBalance = findHeader(['opening', 'balance', 'due']);
      map.notes = findHeader(['note', 'remark', 'address']);
    }
    setColMap(map);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setSuccessMsg('');
    setErrorRows([]);
    try {
      const { headers, rows } = await parseUploadedExcel(file);
      setRawHeaders(headers);
      setRawRows(rows);
      autoGuessMapping(headers, importType);
    } catch (err) {
      console.error('Excel parse error:', err);
    }
  };

  const getMappedPreviewRows = () => {
    const valid: Record<string, any>[] = [];
    const invalid: Record<string, any>[] = [];

    rawRows.forEach((r, idx) => {
      const name = String(r[colMap.name] ?? '').trim();
      if (!name) {
        invalid.push({ Row: idx + 2, Reason: 'Missing Name', ...r });
        return;
      }
      if (importType === 'catalog') {
        const sellingPrice = Number(r[colMap.sellingPrice] ?? 0);
        if (Number.isNaN(sellingPrice) || sellingPrice < 0) {
          invalid.push({ Row: idx + 2, Reason: 'Invalid Selling Price', ...r });
          return;
        }
        valid.push({
          name,
          itemType: String(r[colMap.itemType] || 'Product'),
          sku: String(r[colMap.sku] || ''),
          category: String(r[colMap.category] || 'General'),
          costPrice: Number(r[colMap.costPrice] || 0),
          sellingPrice,
          openingStock: Number(r[colMap.openingStock] || 0),
          reorderLevel: Number(r[colMap.reorderLevel] || 5),
          durationMins: Number(r[colMap.durationMins] || 30),
        });
      } else {
        valid.push({
          name,
          partyType: String(r[colMap.partyType] || 'Customer'),
          phone: String(r[colMap.phone] || ''),
          email: String(r[colMap.email] || ''),
          openingBalance: Number(r[colMap.openingBalance] || 0),
          notes: String(r[colMap.notes] || ''),
        });
      }
    });

    return { valid, invalid };
  };

  const { valid: previewValid, invalid: previewInvalid } = getMappedPreviewRows();

  const handleConfirmImport = async () => {
    if (previewValid.length === 0) return;
    setImporting(true);
    try {
      const res = await onImportRows({
        importType,
        rows: previewValid,
      });
      setSuccessMsg(
        `Great! ${res.importedCount} ${
          importType === 'catalog' ? 'Products & Services' : 'Customers & Suppliers'
        } have been added to your business.`
      );
      setErrorRows(previewInvalid);
      setRawRows([]);
      setFileName('');
    } finally {
      setImporting(false);
    }
  };

  const catalogFields = [
    { key: 'name', label: 'Item or Service Name *' },
    { key: 'itemType', label: 'Type (Product or Service)' },
    { key: 'category', label: 'Category / Group' },
    { key: 'costPrice', label: 'Buying Cost (TZS)' },
    { key: 'sellingPrice', label: 'Selling Price (TZS) *' },
    { key: 'openingStock', label: 'Starting Stock Quantity' },
    { key: 'reorderLevel', label: 'Low Stock Alert Level' },
    { key: 'durationMins', label: 'Session Duration (Minutes)' },
  ];

  const partyFields = [
    { key: 'name', label: 'Full Name *' },
    { key: 'partyType', label: 'Role (Customer or Supplier)' },
    { key: 'phone', label: 'Phone Number' },
    { key: 'email', label: 'Email Address' },
    { key: 'openingBalance', label: 'Starting Balance Owed (TZS)' },
    { key: 'notes', label: 'Notes or Address' },
  ];

  const activeFields = importType === 'catalog' ? catalogFields : partyFields;

  return (
    <div className="space-y-8">
      {/* STEP 1: READY-MADE EXCEL TEMPLATES */}
      <div
        className={`rounded-2xl border p-6 md:p-8 ${
          isDark ? 'bg-[#171B22] border-[#252B37]' : 'bg-white border-[#E8E4DD] shadow-xs'
        }`}
      >
        <div className="max-w-3xl">
          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
            01. Start With Ready-Made Excel Templates
          </p>
          <h2 className="font-display text-2xl font-semibold mt-1">
            Set Up Your Products & Services in Minutes Using Excel
          </h2>
          <p className="text-base opacity-75 mt-2 leading-relaxed">
            Don’t want to type items one by one? Download our ready-to-use Excel templates below.
            They already include example columns for Tanzanian Shilling (TZS) prices, stock
            quantities, bookable services or consultations, and customer credit balances.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
          <div
            className={`rounded-xl border p-5 flex flex-col justify-between gap-4 ${
              isDark ? 'bg-[#0F1217] border-[#252B37]' : 'bg-[#FAF8F5] border-[#E8E4DD]'
            }`}
          >
            <div>
              <div className="flex items-center gap-2.5 text-emerald-700 dark:text-emerald-400 font-semibold text-base">
                <Package className="w-5 h-5" />
                <span>Products & Services Template</span>
              </div>
              <p className="text-sm opacity-75 mt-1.5 leading-relaxed">
                Includes ready-made columns for Product Name, Service Name, Buying Cost (TZS),
                Selling Price (TZS), Starting Stock, and Low-Stock Alert levels.
              </p>
            </div>
            <button
              type="button"
              onClick={downloadInventoryTemplateExcel}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 px-5 py-3 text-sm font-semibold text-white transition cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download Products & Services Excel (.xlsx)</span>
            </button>
          </div>

          <div
            className={`rounded-xl border p-5 flex flex-col justify-between gap-4 ${
              isDark ? 'bg-[#0F1217] border-[#252B37]' : 'bg-[#FAF8F5] border-[#E8E4DD]'
            }`}
          >
            <div>
              <div className="flex items-center gap-2.5 text-amber-700 dark:text-amber-400 font-semibold text-base">
                <Users className="w-5 h-5" />
                <span>Customers & Suppliers Template</span>
              </div>
              <p className="text-sm opacity-75 mt-1.5 leading-relaxed">
                Includes ready-made columns for Customer Name, Supplier Name, Phone Number, Email,
                and any existing Unpaid Credit Balance (TZS).
              </p>
            </div>
            <button
              type="button"
              onClick={downloadPartyTemplateExcel}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-amber-700 hover:bg-amber-800 px-5 py-3 text-sm font-semibold text-white transition cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download Customers & Suppliers Excel (.xlsx)</span>
            </button>
          </div>
        </div>
      </div>

      {/* SUCCESS FEEDBACK BANNER */}
      {successMsg && (
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-base font-semibold text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 className="w-6 h-6 shrink-0" />
            <span>{successMsg}</span>
          </div>
          {errorRows.length > 0 && (
            <button
              type="button"
              onClick={() =>
                exportJsonToExcel('Skipped_Import_Rows.xlsx', 'Skipped_Rows', errorRows)
              }
              className="rounded-xl bg-amber-700 px-4 py-2.5 text-sm font-semibold text-white"
            >
              Download {errorRows.length} Skipped Rows (.xlsx)
            </button>
          )}
        </div>
      )}

      {/* STEP 2: UPLOAD & IMPORT */}
      <div
        className={`rounded-2xl border p-6 md:p-8 space-y-6 ${
          isDark ? 'bg-[#171B22] border-[#252B37]' : 'bg-white border-[#E8E4DD] shadow-xs'
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-200 dark:border-[#252B37] pb-6">
          <div>
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
              02. Upload Your Filled Excel File
            </p>
            <h3 className="font-display text-xl font-semibold mt-1">
              Choose What You Are Importing Today
            </h3>
          </div>

          {/* Interactive Segmented Control */}
          <div
            className={`inline-flex p-1.5 rounded-xl border ${
              isDark ? 'bg-[#0F1217] border-[#252B37]' : 'bg-[#FAF8F5] border-[#E8E4DD]'
            }`}
          >
            <button
              type="button"
              onClick={() => {
                setImportType('catalog');
                if (rawHeaders.length) autoGuessMapping(rawHeaders, 'catalog');
              }}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition cursor-pointer ${
                importType === 'catalog'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'opacity-75 hover:opacity-100'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>Products & Services</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setImportType('parties');
                if (rawHeaders.length) autoGuessMapping(rawHeaders, 'parties');
              }}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition cursor-pointer ${
                importType === 'parties'
                  ? 'bg-amber-700 text-white shadow-xs'
                  : 'opacity-75 hover:opacity-100'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Customers & Suppliers</span>
            </button>
          </div>
        </div>

        {/* Friendly File Dropzone */}
        <label
          className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 flex flex-col items-center justify-center text-center transition ${
            isDark
              ? 'border-emerald-500/40 bg-[#0F1217] hover:bg-emerald-950/20'
              : 'border-emerald-600/40 bg-[#FAF8F5] hover:bg-emerald-50/50'
          }`}
        >
          <div className="w-12 h-12 rounded-2xl bg-emerald-600/15 text-emerald-700 dark:text-emerald-400 flex items-center justify-center mb-3">
            <Upload className="w-6 h-6" />
          </div>
          <span className="text-base font-semibold">
            {fileName
              ? `Selected File: ${fileName}`
              : `Click here to select your ${
                  importType === 'catalog' ? 'Products & Services' : 'Customers & Suppliers'
                } Excel file`}
          </span>
          <span className="text-sm opacity-65 mt-1">
            Supports Excel (.xlsx, .xls) and CSV files • Automatically matches your columns
          </span>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileChange}
            className="hidden"
          />
        </label>

        {/* STEP 3: PREVIEW & CONFIRM */}
        {rawRows.length > 0 && (
          <div className="space-y-6 pt-4 border-t border-slate-200 dark:border-[#252B37]">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h4 className="font-display text-lg font-semibold">
                  03. Check Column Matching & Preview ({previewValid.length} Ready to Import)
                </h4>
                <p className="text-sm opacity-75">
                  We matched your Excel columns automatically. You can adjust any column below if
                  needed.
                </p>
              </div>
              <button
                type="button"
                disabled={importing || previewValid.length === 0}
                onClick={handleConfirmImport}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 px-6 py-3 text-sm font-semibold text-white shadow-sm transition cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {importing
                    ? 'Importing into Shop...'
                    : `Confirm & Import ${previewValid.length} Records`}
                </span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {activeFields.map((field) => (
                <div
                  key={field.key}
                  className={`rounded-xl border p-3.5 ${
                    isDark ? 'bg-[#0F1217] border-[#252B37]' : 'bg-[#FAF8F5] border-[#E8E4DD]'
                  }`}
                >
                  <label className="block text-xs font-semibold opacity-75 mb-1.5">
                    {field.label}
                  </label>
                  <select
                    value={colMap[field.key] || ''}
                    onChange={(e) => setColMap((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    className={`w-full rounded-lg border px-3 py-2 text-sm font-medium ${
                      isDark ? 'bg-[#171B22] border-[#252B37]' : 'bg-white border-slate-300'
                    }`}
                  >
                    <option value="">-- Not Mapped --</option>
                    {rawHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            {/* Preview Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-[#252B37]">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr
                    className={`border-b ${
                      isDark
                        ? 'bg-[#0F1217] border-[#252B37] text-slate-300'
                        : 'bg-[#FAF8F5] border-[#E8E4DD] text-slate-600'
                    }`}
                  >
                    {importType === 'catalog' ? (
                      <>
                        <th className="py-3.5 px-4 font-semibold">Name</th>
                        <th className="py-3.5 px-4 font-semibold">Type</th>
                        <th className="py-3.5 px-4 font-semibold">Category</th>
                        <th className="py-3.5 px-4 font-semibold text-right">Buying Cost</th>
                        <th className="py-3.5 px-4 font-semibold text-right">Selling Price</th>
                        <th className="py-3.5 px-4 font-semibold text-right">Starting Stock</th>
                      </>
                    ) : (
                      <>
                        <th className="py-3.5 px-4 font-semibold">Full Name</th>
                        <th className="py-3.5 px-4 font-semibold">Role</th>
                        <th className="py-3.5 px-4 font-semibold">Phone</th>
                        <th className="py-3.5 px-4 font-semibold text-right">Opening Balance</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-[#252B37]">
                  {previewValid.slice(0, 8).map((row, i) => (
                    <tr key={i}>
                      {importType === 'catalog' ? (
                        <>
                          <td className="py-3 px-4 font-semibold">{row.name}</td>
                          <td className="py-3 px-4">{row.itemType}</td>
                          <td className="py-3 px-4 opacity-80">{row.category}</td>
                          <td className="py-3 px-4 text-right font-mono-num">
                            {formatTZS(row.costPrice)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono-num font-semibold text-emerald-700 dark:text-emerald-400">
                            {formatTZS(row.sellingPrice)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono-num">{row.openingStock}</td>
                        </>
                      ) : (
                        <>
                          <td className="py-3 px-4 font-semibold">{row.name}</td>
                          <td className="py-3 px-4">{row.partyType}</td>
                          <td className="py-3 px-4 font-mono-num">{row.phone}</td>
                          <td className="py-3 px-4 text-right font-mono-num font-semibold">
                            {formatTZS(row.openingBalance)}
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
