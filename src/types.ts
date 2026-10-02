export type RoleType = 'owner' | 'salesperson' | 'receptionist';

export interface UserProfile {
  id: number;
  uid: string;
  email: string;
  name: string;
  role: RoleType;
  activeRoleView: RoleType;
}

export interface AppSettings {
  id: number;
  ownerUid: string;
  businessName: string;
  currency: string;
  openingCash: string;
  bookingEnabled: boolean;
  theme: 'light' | 'dark';
  backupEnabled?: boolean;
  backupFrequency?: 'daily' | 'weekly';
  backupDayOfWeek?: string;
  backupTime?: string;
  backupBucketUri?: string;
  backupRetentionDays?: number;
  lastBackupAt?: string | null;
  nextBackupAt?: string;
}

export interface CloudBackupRecord {
  id: number;
  ownerUid: string;
  backupRef: string;
  triggerType: 'scheduled_daily' | 'scheduled_weekly' | 'manual';
  frequency: string;
  bucketUri: string;
  objectPath: string;
  status: string;
  recordsCount: number;
  sizeBytes: number;
  snapshotJson: string;
  triggeredBy: string;
  createdAt: string;
}

export interface StaffMember {
  id: number;
  ownerUid: string;
  name: string;
  email: string;
  phone: string;
  role: RoleType;
  active: boolean;
}

export interface CatalogItem {
  id: number;
  ownerUid: string;
  name: string;
  itemType: 'product' | 'service';
  unit?: string;
  sku: string;
  category: string;
  costPrice: string;
  sellingPrice: string;
  openingStock: number;
  purchasedQty: number;
  soldQty: number;
  adjustedQty: number;
  currentStock: number;
  reorderLevel: number;
  durationMins: number;
  isDeleted: boolean;
}

export interface Customer {
  id: number;
  ownerUid: string;
  name: string;
  phone: string;
  email: string;
  openingBalance: string;
  totalCreditSales: string;
  totalPaymentsReceived: string;
  outstandingBalance: string;
  notes: string;
}

export interface Supplier {
  id: number;
  ownerUid: string;
  name: string;
  phone: string;
  email: string;
  openingBalance: string;
  totalCreditPurchases: string;
  totalPaymentsMade: string;
  outstandingBalance: string;
  notes: string;
}

export interface Sale {
  id: number;
  ownerUid: string;
  invoiceNo: string;
  saleDate: string;
  customerId: number | null;
  customerName: string;
  staffName: string;
  paymentMethod: 'cash' | 'mobile_money' | 'card' | 'credit';
  paymentStatus: 'paid' | 'partly_paid' | 'unpaid';
  totalAmount: string;
  totalCost: string;
  amountPaid: string;
  balanceDue: string;
  bookingId: number | null;
  isLocked: boolean;
  isDeleted: boolean;
  notes: string;
}

export interface SaleItem {
  id: number;
  ownerUid: string;
  saleId: number;
  itemId: number;
  itemName: string;
  itemType: 'product' | 'service';
  quantity: number;
  unitPrice: string;
  unitCost: string;
  lineTotal: string;
  lineProfit: string;
  saleDate: string;
}

export interface Purchase {
  id: number;
  ownerUid: string;
  billNo: string;
  purchaseDate: string;
  supplierId: number | null;
  supplierName: string;
  paymentMethod: 'cash' | 'mobile_money' | 'card' | 'credit';
  paymentStatus: 'paid' | 'partly_paid' | 'unpaid';
  totalAmount: string;
  amountPaid: string;
  balanceDue: string;
  staffName: string;
  isDeleted: boolean;
  notes: string;
}

export interface PurchaseItem {
  id: number;
  ownerUid: string;
  purchaseId: number;
  itemId: number;
  itemName: string;
  quantity: number;
  unitCost: string;
  lineTotal: string;
  purchaseDate: string;
}

export interface Expense {
  id: number;
  ownerUid: string;
  voucherNo: string;
  expenseDate: string;
  category: string;
  description: string;
  amount: string;
  paymentMethod: 'cash' | 'mobile_money' | 'card';
  paymentStatus: 'paid' | 'unpaid';
  staffName: string;
  isDeleted: boolean;
}

export interface Payment {
  id: number;
  ownerUid: string;
  receiptNo: string;
  paymentDate: string;
  paymentType: 'customer_receipt' | 'supplier_payment';
  partyId: number;
  partyName: string;
  referenceInvoiceId: number | null;
  referenceInvoiceNo: string;
  amount: string;
  paymentMethod: 'cash' | 'mobile_money' | 'card';
  staffName: string;
  notes: string;
}

export interface BookingLineItem {
  itemId: number;
  itemName: string;
  itemType: 'product' | 'service';
  quantity: number;
  unitPrice: number;
  unitCost: number;
  lineTotal: number;
}

export interface Booking {
  id: number;
  ownerUid: string;
  bookingNo: string;
  appointmentDate: string;
  appointmentTime: string;
  customerId: number | null;
  customerName: string;
  customerPhone: string;
  assignedStaff: string;
  status: 'booked' | 'arrived' | 'completed' | 'cancelled';
  itemsJson: string;
  totalAmount: string;
  convertedSaleId: number | null;
  notes: string;
}

export interface LedgerEntry {
  id: number;
  ownerUid: string;
  entryDate: string;
  partyType: 'customer' | 'supplier';
  partyId: number;
  partyName: string;
  voucherType: string;
  voucherNo: string;
  description: string;
  debit: string;
  credit: string;
  runningBalance: string;
}

export interface AuditLog {
  id: number;
  ownerUid: string;
  actorName: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityRef: string;
  details: string;
  createdAt: string;
}

export interface WorkspaceData {
  user: UserProfile | null;
  settings: AppSettings | null;
  staff: StaffMember[];
  catalog: CatalogItem[];
  customers: Customer[];
  suppliers: Supplier[];
  sales: Sale[];
  saleItems: SaleItem[];
  purchases: Purchase[];
  purchaseItems: PurchaseItem[];
  expenses: Expense[];
  payments: Payment[];
  bookings: Booking[];
  ledgerEntries: LedgerEntry[];
  auditLogs: AuditLog[];
  cloudBackups?: CloudBackupRecord[];
}
