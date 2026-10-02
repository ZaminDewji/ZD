import { relations } from 'drizzle-orm';
import { boolean, integer, numeric, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  name: text('name').notNull().default('Business Owner'),
  role: text('role').notNull().default('owner'), // 'owner' | 'salesperson' | 'receptionist'
  activeRoleView: text('active_role_view').notNull().default('owner'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const appSettings = pgTable('app_settings', {
  id: serial('id').primaryKey(),
  ownerUid: text('owner_uid').notNull().unique(),
  businessName: text('business_name').notNull().default('Kariakoo Glow & Retail Hub'),
  currency: text('currency').notNull().default('TZS'),
  openingCash: numeric('opening_cash', { precision: 14, scale: 2 }).notNull().default('2500000'),
  bookingEnabled: boolean('booking_enabled').notNull().default(true),
  manufacturingEnabled: boolean('manufacturing_enabled').notNull().default(true),
  theme: text('theme').notNull().default('light'),
  backupEnabled: boolean('backup_enabled').notNull().default(false),
  backupFrequency: text('backup_frequency').notNull().default('daily'), // 'daily' | 'weekly'
  backupDayOfWeek: text('backup_day_of_week').notNull().default('Sunday'),
  backupTime: text('backup_time').notNull().default('02:00'),
  backupBucketUri: text('backup_bucket_uri')
    .notNull()
    .default('gs://innate-protocol-6wh4c.firebasestorage.app/backups/tallylite-tzs'),
  backupRetentionDays: integer('backup_retention_days').notNull().default(30),
  lastBackupAt: timestamp('last_backup_at'),
  nextBackupAt: text('next_backup_at').notNull().default(''),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const cloudBackups = pgTable('cloud_backups', {
  id: serial('id').primaryKey(),
  ownerUid: text('owner_uid').notNull(),
  backupRef: text('backup_ref').notNull(),
  triggerType: text('trigger_type').notNull().default('scheduled_daily'), // 'scheduled_daily' | 'scheduled_weekly' | 'manual'
  frequency: text('frequency').notNull().default('daily'),
  bucketUri: text('bucket_uri').notNull(),
  objectPath: text('object_path').notNull(),
  status: text('status').notNull().default('completed'),
  recordsCount: integer('records_count').notNull().default(0),
  sizeBytes: integer('size_bytes').notNull().default(0),
  snapshotJson: text('snapshot_json').notNull().default('{}'),
  triggeredBy: text('triggered_by').notNull().default('Automated Scheduler'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const staffMembers = pgTable('staff_members', {
  id: serial('id').primaryKey(),
  ownerUid: text('owner_uid').notNull(),
  name: text('name').notNull(),
  email: text('email').notNull().default(''),
  phone: text('phone').notNull().default(''),
  role: text('role').notNull().default('salesperson'), // 'owner' | 'salesperson' | 'receptionist'
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

export const catalogItems = pgTable('catalog_items', {
  id: serial('id').primaryKey(),
  ownerUid: text('owner_uid').notNull(),
  name: text('name').notNull(),
  itemType: text('item_type').notNull().default('product'), // 'product' | 'service' | 'raw_material'
  unit: text('unit').notNull().default('pcs'), // 'pcs' | 'ml' | 'L' | 'g' | 'kg' | 'bottles'
  sku: text('sku').notNull().default(''),
  category: text('category').notNull().default('General'),
  costPrice: numeric('cost_price', { precision: 14, scale: 2 }).notNull().default('0'),
  sellingPrice: numeric('selling_price', { precision: 14, scale: 2 }).notNull().default('0'),
  openingStock: integer('opening_stock').notNull().default(0),
  purchasedQty: integer('purchased_qty').notNull().default(0),
  soldQty: integer('sold_qty').notNull().default(0),
  adjustedQty: integer('adjusted_qty').notNull().default(0),
  currentStock: integer('current_stock').notNull().default(0),
  reorderLevel: integer('reorder_level').notNull().default(5),
  durationMins: integer('duration_mins').notNull().default(30),
  isDeleted: boolean('is_deleted').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

export const bomFormulas = pgTable('bom_formulas', {
  id: serial('id').primaryKey(),
  ownerUid: text('owner_uid').notNull(),
  finishedProductId: integer('finished_product_id').notNull(),
  finishedProductName: text('finished_product_name').notNull(),
  formulaName: text('formula_name').notNull(),
  laborAndPackagingCost: numeric('labor_and_packaging_cost', { precision: 14, scale: 2 }).notNull().default('0'),
  ingredientsJson: text('ingredients_json').notNull().default('[]'),
  estimatedUnitCost: numeric('estimated_unit_cost', { precision: 14, scale: 2 }).notNull().default('0'),
  notes: text('notes').notNull().default(''),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const productionBatches = pgTable('production_batches', {
  id: serial('id').primaryKey(),
  ownerUid: text('owner_uid').notNull(),
  batchNo: text('batch_no').notNull(),
  productionDate: text('production_date').notNull(), // YYYY-MM-DD
  bomId: integer('bom_id'),
  finishedProductId: integer('finished_product_id').notNull(),
  finishedProductName: text('finished_product_name').notNull(),
  quantityProduced: integer('quantity_produced').notNull().default(1),
  totalMaterialCost: numeric('total_material_cost', { precision: 14, scale: 2 }).notNull().default('0'),
  additionalCost: numeric('additional_cost', { precision: 14, scale: 2 }).notNull().default('0'),
  totalBatchCost: numeric('total_batch_cost', { precision: 14, scale: 2 }).notNull().default('0'),
  unitManufacturedCost: numeric('unit_manufactured_cost', { precision: 14, scale: 2 }).notNull().default('0'),
  ingredientsUsedJson: text('ingredients_used_json').notNull().default('[]'),
  staffName: text('staff_name').notNull().default('Owner'),
  notes: text('notes').notNull().default(''),
  createdAt: timestamp('created_at').defaultNow(),
});

export const customers = pgTable('customers', {
  id: serial('id').primaryKey(),
  ownerUid: text('owner_uid').notNull(),
  name: text('name').notNull(),
  phone: text('phone').notNull().default(''),
  email: text('email').notNull().default(''),
  openingBalance: numeric('opening_balance', { precision: 14, scale: 2 }).notNull().default('0'),
  totalCreditSales: numeric('total_credit_sales', { precision: 14, scale: 2 }).notNull().default('0'),
  totalPaymentsReceived: numeric('total_payments_received', { precision: 14, scale: 2 }).notNull().default('0'),
  outstandingBalance: numeric('outstanding_balance', { precision: 14, scale: 2 }).notNull().default('0'),
  notes: text('notes').notNull().default(''),
  createdAt: timestamp('created_at').defaultNow(),
});

export const suppliers = pgTable('suppliers', {
  id: serial('id').primaryKey(),
  ownerUid: text('owner_uid').notNull(),
  name: text('name').notNull(),
  phone: text('phone').notNull().default(''),
  email: text('email').notNull().default(''),
  openingBalance: numeric('opening_balance', { precision: 14, scale: 2 }).notNull().default('0'),
  totalCreditPurchases: numeric('total_credit_purchases', { precision: 14, scale: 2 }).notNull().default('0'),
  totalPaymentsMade: numeric('total_payments_made', { precision: 14, scale: 2 }).notNull().default('0'),
  outstandingBalance: numeric('outstanding_balance', { precision: 14, scale: 2 }).notNull().default('0'),
  notes: text('notes').notNull().default(''),
  createdAt: timestamp('created_at').defaultNow(),
});

export const sales = pgTable('sales', {
  id: serial('id').primaryKey(),
  ownerUid: text('owner_uid').notNull(),
  invoiceNo: text('invoice_no').notNull(),
  saleDate: text('sale_date').notNull(), // YYYY-MM-DD
  customerId: integer('customer_id'),
  customerName: text('customer_name').notNull().default('Walk-in Customer'),
  staffName: text('staff_name').notNull().default('Owner'),
  paymentMethod: text('payment_method').notNull().default('cash'), // 'cash' | 'mobile_money' | 'card' | 'credit'
  paymentStatus: text('payment_status').notNull().default('paid'), // 'paid' | 'partly_paid' | 'unpaid'
  totalAmount: numeric('total_amount', { precision: 14, scale: 2 }).notNull().default('0'),
  totalCost: numeric('total_cost', { precision: 14, scale: 2 }).notNull().default('0'),
  amountPaid: numeric('amount_paid', { precision: 14, scale: 2 }).notNull().default('0'),
  balanceDue: numeric('balance_due', { precision: 14, scale: 2 }).notNull().default('0'),
  bookingId: integer('booking_id'),
  isLocked: boolean('is_locked').notNull().default(true),
  isDeleted: boolean('is_deleted').notNull().default(false),
  notes: text('notes').notNull().default(''),
  createdAt: timestamp('created_at').defaultNow(),
});

export const saleItems = pgTable('sale_items', {
  id: serial('id').primaryKey(),
  ownerUid: text('owner_uid').notNull(),
  saleId: integer('sale_id').notNull(),
  itemId: integer('item_id').notNull(),
  itemName: text('item_name').notNull(),
  itemType: text('item_type').notNull(), // 'product' | 'service'
  quantity: integer('quantity').notNull().default(1),
  unitPrice: numeric('unit_price', { precision: 14, scale: 2 }).notNull().default('0'),
  unitCost: numeric('unit_cost', { precision: 14, scale: 2 }).notNull().default('0'),
  lineTotal: numeric('line_total', { precision: 14, scale: 2 }).notNull().default('0'),
  lineProfit: numeric('line_profit', { precision: 14, scale: 2 }).notNull().default('0'),
  saleDate: text('sale_date').notNull(),
});

export const purchases = pgTable('purchases', {
  id: serial('id').primaryKey(),
  ownerUid: text('owner_uid').notNull(),
  billNo: text('bill_no').notNull(),
  purchaseDate: text('purchase_date').notNull(), // YYYY-MM-DD
  supplierId: integer('supplier_id'),
  supplierName: text('supplier_name').notNull(),
  paymentMethod: text('payment_method').notNull().default('cash'),
  paymentStatus: text('payment_status').notNull().default('paid'), // 'paid' | 'partly_paid' | 'unpaid'
  totalAmount: numeric('total_amount', { precision: 14, scale: 2 }).notNull().default('0'),
  amountPaid: numeric('amount_paid', { precision: 14, scale: 2 }).notNull().default('0'),
  balanceDue: numeric('balance_due', { precision: 14, scale: 2 }).notNull().default('0'),
  staffName: text('staff_name').notNull().default('Owner'),
  isDeleted: boolean('is_deleted').notNull().default(false),
  notes: text('notes').notNull().default(''),
  createdAt: timestamp('created_at').defaultNow(),
});

export const purchaseItems = pgTable('purchase_items', {
  id: serial('id').primaryKey(),
  ownerUid: text('owner_uid').notNull(),
  purchaseId: integer('purchase_id').notNull(),
  itemId: integer('item_id').notNull(),
  itemName: text('item_name').notNull(),
  quantity: integer('quantity').notNull().default(1),
  unitCost: numeric('unit_cost', { precision: 14, scale: 2 }).notNull().default('0'),
  lineTotal: numeric('line_total', { precision: 14, scale: 2 }).notNull().default('0'),
  purchaseDate: text('purchase_date').notNull(),
});

export const expenses = pgTable('expenses', {
  id: serial('id').primaryKey(),
  ownerUid: text('owner_uid').notNull(),
  voucherNo: text('voucher_no').notNull(),
  expenseDate: text('expense_date').notNull(), // YYYY-MM-DD
  category: text('category').notNull(),
  description: text('description').notNull(),
  amount: numeric('amount', { precision: 14, scale: 2 }).notNull().default('0'),
  paymentMethod: text('payment_method').notNull().default('cash'), // 'cash' | 'mobile_money' | 'card'
  paymentStatus: text('payment_status').notNull().default('paid'), // 'paid' | 'unpaid'
  staffName: text('staff_name').notNull().default('Owner'),
  isDeleted: boolean('is_deleted').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

export const payments = pgTable('payments', {
  id: serial('id').primaryKey(),
  ownerUid: text('owner_uid').notNull(),
  receiptNo: text('receipt_no').notNull(),
  paymentDate: text('payment_date').notNull(), // YYYY-MM-DD
  paymentType: text('payment_type').notNull(), // 'customer_receipt' | 'supplier_payment'
  partyId: integer('party_id').notNull(),
  partyName: text('party_name').notNull(),
  referenceInvoiceId: integer('reference_invoice_id'),
  referenceInvoiceNo: text('reference_invoice_no').notNull().default(''),
  amount: numeric('amount', { precision: 14, scale: 2 }).notNull().default('0'),
  paymentMethod: text('payment_method').notNull().default('cash'), // 'cash' | 'mobile_money' | 'card'
  staffName: text('staff_name').notNull().default('Owner'),
  notes: text('notes').notNull().default(''),
  createdAt: timestamp('created_at').defaultNow(),
});

export const bookings = pgTable('bookings', {
  id: serial('id').primaryKey(),
  ownerUid: text('owner_uid').notNull(),
  bookingNo: text('booking_no').notNull(),
  appointmentDate: text('appointment_date').notNull(), // YYYY-MM-DD
  appointmentTime: text('appointment_time').notNull(), // HH:mm
  customerId: integer('customer_id'),
  customerName: text('customer_name').notNull(),
  customerPhone: text('customer_phone').notNull().default(''),
  assignedStaff: text('assigned_staff').notNull().default('Amina (Spa Specialist)'),
  status: text('status').notNull().default('booked'), // 'booked' | 'arrived' | 'completed' | 'cancelled'
  itemsJson: text('items_json').notNull().default('[]'),
  totalAmount: numeric('total_amount', { precision: 14, scale: 2 }).notNull().default('0'),
  convertedSaleId: integer('converted_sale_id'),
  notes: text('notes').notNull().default(''),
  createdAt: timestamp('created_at').defaultNow(),
});

export const ledgerEntries = pgTable('ledger_entries', {
  id: serial('id').primaryKey(),
  ownerUid: text('owner_uid').notNull(),
  entryDate: text('entry_date').notNull(), // YYYY-MM-DD
  partyType: text('party_type').notNull(), // 'customer' | 'supplier'
  partyId: integer('party_id').notNull(),
  partyName: text('party_name').notNull(),
  voucherType: text('voucher_type').notNull(),
  voucherNo: text('voucher_no').notNull(),
  description: text('description').notNull(),
  debit: numeric('debit', { precision: 14, scale: 2 }).notNull().default('0'),
  credit: numeric('credit', { precision: 14, scale: 2 }).notNull().default('0'),
  runningBalance: numeric('running_balance', { precision: 14, scale: 2 }).notNull().default('0'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  ownerUid: text('owner_uid').notNull(),
  actorName: text('actor_name').notNull(),
  actorRole: text('actor_role').notNull(),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityRef: text('entity_ref').notNull(),
  details: text('details').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const salesRelations = relations(sales, ({ many }) => ({
  items: many(saleItems),
}));

export const saleItemsRelations = relations(saleItems, ({ one }) => ({
  sale: one(sales, {
    fields: [saleItems.saleId],
    references: [sales.id],
  }),
}));

export const purchasesRelations = relations(purchases, ({ many }) => ({
  items: many(purchaseItems),
}));

export const purchaseItemsRelations = relations(purchaseItems, ({ one }) => ({
  purchase: one(purchases, {
    fields: [purchaseItems.purchaseId],
    references: [purchases.id],
  }),
}));
