import fs from 'fs';
import path from 'path';
import * as schema from './schema.ts';

const STORE_FILE_PATH = path.resolve(process.cwd(), '.tallylite-store.json');

interface StoreShape {
  counters: Record<string, number>;
  tables: Record<string, Record<string, Record<string, any>>>;
}

let memoryStore: StoreShape | null = null;

function loadStore(): StoreShape {
  if (memoryStore) return memoryStore;
  try {
    if (fs.existsSync(STORE_FILE_PATH)) {
      const raw = fs.readFileSync(STORE_FILE_PATH, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && parsed.tables && parsed.counters) {
        memoryStore = parsed as StoreShape;
        return memoryStore;
      }
    }
  } catch (err) {
    console.warn('Initializing fresh workspace store:', err);
  }
  memoryStore = {
    counters: {},
    tables: {},
  };
  return memoryStore;
}

function persistStore() {
  if (!memoryStore) return;
  try {
    fs.writeFileSync(STORE_FILE_PATH, JSON.stringify(memoryStore, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to persist store to disk:', err);
  }
}

const TABLE_ENTRIES: Array<[any, string]> = [
  [schema.users, 'users'],
  [schema.appSettings, 'app_settings'],
  [schema.cloudBackups, 'cloud_backups'],
  [schema.staffMembers, 'staff_members'],
  [schema.catalogItems, 'catalog_items'],
  [schema.bomFormulas, 'bom_formulas'],
  [schema.productionBatches, 'production_batches'],
  [schema.customers, 'customers'],
  [schema.suppliers, 'suppliers'],
  [schema.sales, 'sales'],
  [schema.saleItems, 'sale_items'],
  [schema.purchases, 'purchases'],
  [schema.purchaseItems, 'purchase_items'],
  [schema.expenses, 'expenses'],
  [schema.payments, 'payments'],
  [schema.bookings, 'bookings'],
  [schema.ledgerEntries, 'ledger_entries'],
  [schema.auditLogs, 'audit_logs'],
];

const TABLE_NAME_MAP = new Map<any, string>();
const COL_TO_PROP_MAP = new WeakMap<any, string>();

for (const [tableObj, tableName] of TABLE_ENTRIES) {
  TABLE_NAME_MAP.set(tableObj, tableName);
  for (const [propKey, colVal] of Object.entries(tableObj)) {
    if (colVal && typeof colVal === 'object') {
      COL_TO_PROP_MAP.set(colVal, propKey);
    }
  }
}

function getTableName(table: any): string {
  const found = TABLE_NAME_MAP.get(table);
  if (!found) {
    throw new Error('Unknown table passed to database adapter');
  }
  return found;
}

function getPropName(col: any): string {
  if (typeof col === 'string') return col;
  const mapped = COL_TO_PROP_MAP.get(col);
  if (mapped) return mapped;
  if (col && typeof col.name === 'string') {
    return col.name.replace(/_([a-z])/g, (_: string, c: string) => c.toUpperCase());
  }
  throw new Error('Unable to resolve column property name');
}

export interface FilterEq {
  type: 'eq';
  prop: string;
  val: any;
}

export interface FilterAnd {
  type: 'and';
  conds: FilterCondition[];
}

export type FilterCondition = FilterEq | FilterAnd;

export interface OrderDesc {
  type: 'desc';
  prop: string;
}

export function eq(col: any, val: any): FilterEq {
  return { type: 'eq', prop: getPropName(col), val };
}

export function and(...conds: Array<FilterCondition | undefined | null>): FilterAnd {
  return {
    type: 'and',
    conds: conds.filter((c): c is FilterCondition => Boolean(c)),
  };
}

export function desc(col: any): OrderDesc {
  return { type: 'desc', prop: getPropName(col) };
}

function matchesCondition(row: Record<string, any>, cond?: FilterCondition | null): boolean {
  if (!cond) return true;
  if (cond.type === 'eq') {
    return row[cond.prop] === cond.val;
  }
  if (cond.type === 'and') {
    return cond.conds.every((c) => matchesCondition(row, c));
  }
  return true;
}

function sanitizeRecord(obj: Record<string, any>): Record<string, any> {
  const clean: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    if (v instanceof Date) {
      clean[k] = v.toISOString();
    } else {
      clean[k] = v;
    }
  }
  return clean;
}

function getTableDefaults(tableName: string, nowIso: string): Record<string, any> {
  switch (tableName) {
    case 'users':
      return {
        name: 'Business Owner',
        role: 'owner',
        activeRoleView: 'owner',
        createdAt: nowIso,
      };
    case 'app_settings':
      return {
        businessName: 'Kariakoo Glow & Retail Hub',
        currency: 'TZS',
        openingCash: '2500000',
        bookingEnabled: true,
        manufacturingEnabled: false,
        theme: 'light',
        backupEnabled: false,
        backupFrequency: 'daily',
        backupDayOfWeek: 'Sunday',
        backupTime: '02:00',
        backupBucketUri: 'gs://innate-protocol-6wh4c.firebasestorage.app/backups/tallylite-tzs',
        backupRetentionDays: 30,
        lastBackupAt: null,
        nextBackupAt: '',
        updatedAt: nowIso,
      };
    case 'cloud_backups':
      return {
        triggerType: 'scheduled_daily',
        frequency: 'daily',
        status: 'completed',
        recordsCount: 0,
        sizeBytes: 0,
        snapshotJson: '{}',
        triggeredBy: 'Automated Scheduler',
        createdAt: nowIso,
      };
    case 'staff_members':
      return {
        email: '',
        phone: '',
        role: 'salesperson',
        active: true,
        createdAt: nowIso,
      };
    case 'catalog_items':
      return {
        itemType: 'product',
        unit: 'pcs',
        sku: '',
        category: 'General',
        costPrice: '0',
        sellingPrice: '0',
        openingStock: 0,
        purchasedQty: 0,
        soldQty: 0,
        adjustedQty: 0,
        currentStock: 0,
        reorderLevel: 5,
        durationMins: 30,
        isDeleted: false,
        createdAt: nowIso,
      };
    case 'customers':
      return {
        phone: '',
        email: '',
        openingBalance: '0',
        totalCreditSales: '0',
        totalPaymentsReceived: '0',
        outstandingBalance: '0',
        notes: '',
        createdAt: nowIso,
      };
    case 'suppliers':
      return {
        phone: '',
        email: '',
        openingBalance: '0',
        totalCreditPurchases: '0',
        totalPaymentsMade: '0',
        outstandingBalance: '0',
        notes: '',
        createdAt: nowIso,
      };
    case 'sales':
      return {
        customerId: null,
        customerName: 'Walk-in Customer',
        staffName: 'Owner',
        paymentMethod: 'cash',
        paymentStatus: 'paid',
        totalAmount: '0',
        totalCost: '0',
        amountPaid: '0',
        balanceDue: '0',
        bookingId: null,
        isLocked: true,
        isDeleted: false,
        notes: '',
        createdAt: nowIso,
      };
    case 'sale_items':
      return {
        quantity: 1,
        unitPrice: '0',
        unitCost: '0',
        lineTotal: '0',
        lineProfit: '0',
      };
    case 'purchases':
      return {
        supplierId: null,
        paymentMethod: 'cash',
        paymentStatus: 'paid',
        totalAmount: '0',
        amountPaid: '0',
        balanceDue: '0',
        staffName: 'Owner',
        isDeleted: false,
        notes: '',
        createdAt: nowIso,
      };
    case 'purchase_items':
      return {
        quantity: 1,
        unitCost: '0',
        lineTotal: '0',
      };
    case 'expenses':
      return {
        amount: '0',
        paymentMethod: 'cash',
        paymentStatus: 'paid',
        staffName: 'Owner',
        isDeleted: false,
        createdAt: nowIso,
      };
    case 'payments':
      return {
        referenceInvoiceId: null,
        referenceInvoiceNo: '',
        amount: '0',
        paymentMethod: 'cash',
        staffName: 'Owner',
        notes: '',
        createdAt: nowIso,
      };
    case 'bookings':
      return {
        customerId: null,
        customerPhone: '',
        assignedStaff: 'Amina (Spa Specialist)',
        status: 'booked',
        itemsJson: '[]',
        totalAmount: '0',
        convertedSaleId: null,
        notes: '',
        createdAt: nowIso,
      };
    case 'ledger_entries':
      return {
        debit: '0',
        credit: '0',
        runningBalance: '0',
        createdAt: nowIso,
      };
    case 'audit_logs':
      return {
        createdAt: nowIso,
      };
    default:
      return {};
  }
}

function getTableBucket(tableName: string): Record<string, Record<string, any>> {
  const store = loadStore();
  if (!store.tables[tableName]) {
    store.tables[tableName] = {};
  }
  return store.tables[tableName];
}

function allocateIds(tableName: string, count: number): number[] {
  const store = loadStore();
  const current = Number(store.counters[tableName] || 0);
  const ids: number[] = [];
  for (let i = 1; i <= count; i++) {
    ids.push(current + i);
  }
  store.counters[tableName] = current + count;
  return ids;
}

function queryMatchingDocs(
  tableName: string,
  cond?: FilterCondition | null
): Array<{ id: string; data: Record<string, any> }> {
  const bucket = getTableBucket(tableName);
  const results: Array<{ id: string; data: Record<string, any> }> = [];
  for (const [docId, data] of Object.entries(bucket)) {
    if (matchesCondition(data, cond)) {
      results.push({ id: docId, data });
    }
  }
  return results;
}

class SelectBuilder {
  private tableName = '';
  private condition: FilterCondition | null = null;
  private orderSpec: { prop: string; dir: 'asc' | 'desc' } | null = null;

  from(table: any): this {
    this.tableName = getTableName(table);
    return this;
  }

  where(cond: FilterCondition): this {
    this.condition = cond;
    return this;
  }

  orderBy(orderArg: any): this {
    if (orderArg && typeof orderArg === 'object' && orderArg.type === 'desc') {
      this.orderSpec = { prop: orderArg.prop, dir: 'desc' };
    } else {
      this.orderSpec = { prop: getPropName(orderArg), dir: 'asc' };
    }
    return this;
  }

  async execute(): Promise<any[]> {
    const docs = queryMatchingDocs(this.tableName, this.condition);
    const rows = docs.map((d) => ({ ...d.data }));

    if (this.orderSpec) {
      const { prop, dir } = this.orderSpec;
      rows.sort((a, b) => {
        const va = a[prop];
        const vb = b[prop];
        if (va === vb) return 0;
        if (typeof va === 'number' && typeof vb === 'number') {
          return dir === 'asc' ? va - vb : vb - va;
        }
        const sa = String(va ?? '');
        const sb = String(vb ?? '');
        return dir === 'asc' ? sa.localeCompare(sb) : sb.localeCompare(sa);
      });
    } else {
      rows.sort((a, b) => Number(a.id || 0) - Number(b.id || 0));
    }

    return rows;
  }

  then<TResult1 = any[], TResult2 = never>(
    onfulfilled?: ((value: any[]) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }
}

class InsertBuilder {
  private tableName: string;
  private rowsToInsert: Array<Record<string, any>> = [];
  private conflictConfig: { targetProp: string; set: Record<string, any> } | null = null;

  constructor(table: any) {
    this.tableName = getTableName(table);
  }

  values(valOrArray: Record<string, any> | Array<Record<string, any>>): this {
    this.rowsToInsert = Array.isArray(valOrArray) ? valOrArray : [valOrArray];
    return this;
  }

  onConflictDoUpdate(cfg: { target: any; set: Record<string, any> }): this {
    this.conflictConfig = {
      targetProp: getPropName(cfg.target),
      set: cfg.set,
    };
    return this;
  }

  returning(): this {
    return this;
  }

  async execute(): Promise<any[]> {
    if (this.rowsToInsert.length === 0) return [];
    const bucket = getTableBucket(this.tableName);
    const nowIso = new Date().toISOString();
    const defaults = getTableDefaults(this.tableName, nowIso);

    if (this.conflictConfig && this.rowsToInsert.length === 1) {
      const raw = this.rowsToInsert[0];
      const targetProp = this.conflictConfig.targetProp;
      const targetVal = raw[targetProp];

      const existingEntry = Object.entries(bucket).find(
        ([, rowData]) => rowData[targetProp] === targetVal
      );
      if (existingEntry) {
        const [docId, existingData] = existingEntry;
        const updatedData = sanitizeRecord({
          ...existingData,
          ...this.conflictConfig.set,
        });
        bucket[docId] = updatedData;
        persistStore();
        return [{ ...updatedData }];
      }
    }

    const allocatedIds = allocateIds(this.tableName, this.rowsToInsert.length);
    const insertedRows: any[] = [];

    for (let i = 0; i < this.rowsToInsert.length; i++) {
      const raw = this.rowsToInsert[i];
      const id = raw.id !== undefined ? Number(raw.id) : allocatedIds[i];
      const fullRow = sanitizeRecord({
        ...defaults,
        ...raw,
        id,
      });
      bucket[String(id)] = fullRow;
      insertedRows.push({ ...fullRow });
    }

    persistStore();
    return insertedRows;
  }

  then<TResult1 = any[], TResult2 = never>(
    onfulfilled?: ((value: any[]) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }
}

class UpdateBuilder {
  private tableName: string;
  private updateValues: Record<string, any> = {};
  private condition: FilterCondition | null = null;

  constructor(table: any) {
    this.tableName = getTableName(table);
  }

  set(values: Record<string, any>): this {
    this.updateValues = values;
    return this;
  }

  where(cond: FilterCondition): this {
    this.condition = cond;
    return this;
  }

  returning(): this {
    return this;
  }

  async execute(): Promise<any[]> {
    const matching = queryMatchingDocs(this.tableName, this.condition);
    if (matching.length === 0) return [];

    const bucket = getTableBucket(this.tableName);
    const updatedRows: any[] = [];
    const cleanPatch = sanitizeRecord(this.updateValues);

    for (const item of matching) {
      const merged = {
        ...item.data,
        ...cleanPatch,
      };
      bucket[item.id] = merged;
      updatedRows.push({ ...merged });
    }

    persistStore();
    return updatedRows;
  }

  then<TResult1 = any[], TResult2 = never>(
    onfulfilled?: ((value: any[]) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }
}

export const db = {
  select: () => new SelectBuilder(),
  insert: (table: any) => new InsertBuilder(table),
  update: (table: any) => new UpdateBuilder(table),
};


