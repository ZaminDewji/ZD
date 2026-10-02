import * as XLSX from 'xlsx';

export function formatTZS(value: number | string | undefined | null): string {
  const num = Number(value || 0);
  if (Number.isNaN(num)) return 'TZS 0';
  const absFormatted = Math.round(Math.abs(num)).toLocaleString('en-US');
  return num < 0 ? `-TZS ${absFormatted}` : `TZS ${absFormatted}`;
}

export function isWithinDateRange(dateStr: string, startDate: string, endDate: string): boolean {
  if (!dateStr) return true;
  const clean = dateStr.slice(0, 10);
  if (startDate && clean < startDate) return false;
  if (endDate && clean > endDate) return false;
  return true;
}

export function downloadInventoryTemplateExcel() {
  const sampleRows = [
    {
      'Item Name': 'Turmeric & Honey Brightening Scrub (400g)',
      'Type (Product/Service)': 'Product',
      'SKU': 'PRD-SCR-101',
      'Category': 'Body Scrubs',
      'Cost Price (TZS)': 14000,
      'Selling Price (TZS)': 26000,
      'Opening Stock': 20,
      'Reorder Level': 5,
      'Duration (Mins)': 0,
    },
    {
      'Item Name': 'Salicylic Acid Blackhead Dissolving Serum (30ml)',
      'Type (Product/Service)': 'Product',
      'SKU': 'PRD-SKN-102',
      'Category': 'Skincare',
      'Cost Price (TZS)': 16000,
      'Selling Price (TZS)': 32000,
      'Opening Stock': 15,
      'Reorder Level': 5,
      'Duration (Mins)': 0,
    },
    {
      'Item Name': 'Stainless Steel Comedone & Blackhead Tool Set',
      'Type (Product/Service)': 'Product',
      'SKU': 'PRD-ACC-103',
      'Category': 'Beauty Tools',
      'Cost Price (TZS)': 8000,
      'Selling Price (TZS)': 18000,
      'Opening Stock': 30,
      'Reorder Level': 8,
      'Duration (Mins)': 0,
    },
    {
      'Item Name': 'Deep Pore Blackhead Extraction & Steam Facial',
      'Type (Product/Service)': 'Service',
      'SKU': 'SRV-BKG-201',
      'Category': 'Consultations & Treatments',
      'Cost Price (TZS)': 5000,
      'Selling Price (TZS)': 40000,
      'Opening Stock': 0,
      'Reorder Level': 0,
      'Duration (Mins)': 45,
    },
    {
      'Item Name': 'Half Body Aromatherapy & Back Scrub Package',
      'Type (Product/Service)': 'Service',
      'SKU': 'SRV-BKG-202',
      'Category': 'Therapy & Sessions',
      'Cost Price (TZS)': 7000,
      'Selling Price (TZS)': 55000,
      'Opening Stock': 0,
      'Reorder Level': 0,
      'Duration (Mins)': 60,
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleRows);
  worksheet['!cols'] = [
    { wch: 44 },
    { wch: 22 },
    { wch: 16 },
    { wch: 20 },
    { wch: 18 },
    { wch: 18 },
    { wch: 15 },
    { wch: 15 },
    { wch: 16 },
  ];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory_And_Services');
  XLSX.writeFile(workbook, 'The_System_Anchor_Inventory_Services_Template.xlsx');
}

export function downloadPartyTemplateExcel() {
  const sampleRows = [
    {
      'Name': 'Mariam Mwinyi',
      'Party Type (Customer/Supplier)': 'Customer',
      'Phone': '+255 754 321 987',
      'Email': 'mariam.mwinyi@gmail.com',
      'Opening Balance (TZS)': 45000,
      'Notes': 'VIP Client (Credit Balance brought forward)',
    },
    {
      'Name': 'Kelvin Massawe',
      'Party Type (Customer/Supplier)': 'Customer',
      'Phone': '+255 715 654 321',
      'Email': 'kmassawe@yahoo.com',
      'Opening Balance (TZS)': 0,
      'Notes': 'Regular walk-in buyer',
    },
    {
      'Name': 'Arusha Organic Cosmetics Distributors',
      'Party Type (Customer/Supplier)': 'Supplier',
      'Phone': '+255 767 900 100',
      'Email': 'supply@arushaorganics.co.tz',
      'Opening Balance (TZS)': 150000,
      'Notes': 'Supplier of scrubs and facial oils',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleRows);
  worksheet['!cols'] = [
    { wch: 34 },
    { wch: 28 },
    { wch: 20 },
    { wch: 28 },
    { wch: 22 },
    { wch: 45 },
  ];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Customers_And_Suppliers');
  XLSX.writeFile(workbook, 'The_System_Anchor_Customers_Suppliers_Template.xlsx');
}

export function exportJsonToExcel(filename: string, sheetName: string, rows: Record<string, any>[]) {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
}

export async function parseUploadedExcel(file: File): Promise<{
  headers: string[];
  rows: Record<string, any>[];
}> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
  return { headers, rows };
}
