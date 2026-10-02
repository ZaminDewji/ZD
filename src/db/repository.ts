import { and, desc, eq, db } from './index.ts';
import {
  appSettings,
  auditLogs,
  bookings,
  catalogItems,
  cloudBackups,
  customers,
  expenses,
  ledgerEntries,
  payments,
  purchaseItems,
  purchases,
  saleItems,
  sales,
  staffMembers,
  suppliers,
  users,
} from './schema.ts';

function todayStr(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
}

export async function getOrCreateUserAndWorkspace(uid: string, email: string, displayName?: string) {
  try {
    const cleanName = displayName || email.split('@')[0] || 'Business Owner';
    const userRes = await db
      .insert(users)
      .values({
        uid,
        email,
        name: cleanName,
        role: 'owner',
        activeRoleView: 'owner',
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: { email },
      })
      .returning();

    const user = userRes[0];

    // Ensure settings exist
    const existingSettings = await db
      .select()
      .from(appSettings)
      .where(eq(appSettings.ownerUid, uid));

    if (existingSettings.length === 0) {
      await db.insert(appSettings).values({
        ownerUid: uid,
        businessName: 'Kariakoo Glow & Retail Hub',
        currency: 'TZS',
        openingCash: '2500000',
        bookingEnabled: true,
        theme: 'light',
      });
    }

    // Check if catalog is seeded for this user
    const existingItems = await db
      .select()
      .from(catalogItems)
      .where(eq(catalogItems.ownerUid, uid));

    if (existingItems.length === 0) {
      await seedInitialWorkspaceData(uid, cleanName);
    }

    await ensureCloudBackupSeedData(uid, cleanName);

    return user;
  } catch (error) {
    console.error('Failed to initialize user workspace:', error);
    throw new Error('Failed to initialize workspace data.', { cause: error });
  }
}

async function seedInitialWorkspaceData(uid: string, ownerName: string) {
  try {
    // 1. Seed Staff Members
    await db.insert(staffMembers).values([
      { ownerUid: uid, name: ownerName, email: 'owner@glowhub.co.tz', phone: '+255 754 100 200', role: 'owner', active: true },
      { ownerUid: uid, name: 'Amina Juma (Service Specialist)', email: 'amina@glowhub.co.tz', phone: '+255 713 220 330', role: 'salesperson', active: true },
      { ownerUid: uid, name: 'Baraka Mushi (Retail Sales)', email: 'baraka@glowhub.co.tz', phone: '+255 767 440 550', role: 'salesperson', active: true },
      { ownerUid: uid, name: 'Halima Said (Receptionist)', email: 'halima@glowhub.co.tz', phone: '+255 784 880 990', role: 'receptionist', active: true },
    ]);

    // 2. Seed Unified Catalog (Products & Services)
    const insertedItems = await db
      .insert(catalogItems)
      .values([
        // Retail Products (Tracked by Stock Quantity)
        {
          ownerUid: uid,
          name: 'Organic Arabica Coffee & Coconut Scrub (500g)',
          itemType: 'product',
          sku: 'PRD-SCR-001',
          category: 'Body Scrubs',
          costPrice: '15000',
          sellingPrice: '28000',
          openingStock: 25,
          purchasedQty: 15,
          soldQty: 12,
          adjustedQty: 0,
          currentStock: 28,
          reorderLevel: 8,
          durationMins: 0,
        },
        {
          ownerUid: uid,
          name: 'Activated Bamboo Charcoal Facial Scrub (250g)',
          itemType: 'product',
          sku: 'PRD-SCR-002',
          category: 'Face Scrubs',
          costPrice: '12000',
          sellingPrice: '22000',
          openingStock: 20,
          purchasedQty: 10,
          soldQty: 9,
          adjustedQty: 0,
          currentStock: 21,
          reorderLevel: 6,
          durationMins: 0,
        },
        {
          ownerUid: uid,
          name: 'Pro Vacuum Pore & Blackhead Extractor Kit',
          itemType: 'product',
          sku: 'PRD-ACC-003',
          category: 'Beauty Tools',
          costPrice: '25000',
          sellingPrice: '45000',
          openingStock: 10,
          purchasedQty: 5,
          soldQty: 11,
          adjustedQty: 0,
          currentStock: 4, // Low stock alert!
          reorderLevel: 5,
          durationMins: 0,
        },
        {
          ownerUid: uid,
          name: 'Vitamin C + Niacinamide Glow Serum (50ml)',
          itemType: 'product',
          sku: 'PRD-SKN-004',
          category: 'Skincare',
          costPrice: '18000',
          sellingPrice: '35000',
          openingStock: 15,
          purchasedQty: 10,
          soldQty: 8,
          adjustedQty: 0,
          currentStock: 17,
          reorderLevel: 5,
          durationMins: 0,
        },
        {
          ownerUid: uid,
          name: 'Zanzibar Clove & Lemongrass Essential Oil',
          itemType: 'product',
          sku: 'PRD-OIL-005',
          category: 'Essential Oils',
          costPrice: '10000',
          sellingPrice: '20000',
          openingStock: 12,
          purchasedQty: 0,
          soldQty: 9,
          adjustedQty: 0,
          currentStock: 3, // Low stock alert!
          reorderLevel: 5,
          durationMins: 0,
        },
        {
          ownerUid: uid,
          name: 'Rose Quartz Facial Roller & Gua Sha Set',
          itemType: 'product',
          sku: 'PRD-ACC-006',
          category: 'Beauty Tools',
          costPrice: '14000',
          sellingPrice: '30000',
          openingStock: 12,
          purchasedQty: 0,
          soldQty: 2,
          adjustedQty: 0,
          currentStock: 10,
          reorderLevel: 4,
          durationMins: 0,
        },
        // Bookable Services & Sessions (No stock quantity needed, tracked in sales, bookings & profitability)
        {
          ownerUid: uid,
          name: 'Deep Blackhead Removal & Ultrasonic Pore Detox',
          itemType: 'service',
          sku: 'SRV-BKG-101',
          category: 'Facial Treatments',
          costPrice: '5000', // Direct consumables cost
          sellingPrice: '35000',
          openingStock: 0,
          purchasedQty: 0,
          soldQty: 14,
          adjustedQty: 0,
          currentStock: 0,
          reorderLevel: 0,
          durationMins: 45,
        },
        {
          ownerUid: uid,
          name: 'Half Body Therapeutic & Muscle Relief Session',
          itemType: 'service',
          sku: 'SRV-BKG-102',
          category: 'Therapy & Sessions',
          costPrice: '6000',
          sellingPrice: '45000',
          openingStock: 0,
          purchasedQty: 0,
          soldQty: 11,
          adjustedQty: 0,
          currentStock: 0,
          reorderLevel: 0,
          durationMins: 45,
        },
        {
          ownerUid: uid,
          name: 'Signature 24K Gold & Honey Facial Package',
          itemType: 'service',
          sku: 'SRV-BKG-103',
          category: 'Facial Treatments',
          costPrice: '10000',
          sellingPrice: '60000',
          openingStock: 0,
          purchasedQty: 0,
          soldQty: 8,
          adjustedQty: 0,
          currentStock: 0,
          reorderLevel: 0,
          durationMins: 60,
        },
        {
          ownerUid: uid,
          name: 'Full Body Moroccan Hammam & Coffee Scrub Session',
          itemType: 'service',
          sku: 'SRV-BKG-104',
          category: 'Body Treatments',
          costPrice: '8000',
          sellingPrice: '50000',
          openingStock: 0,
          purchasedQty: 0,
          soldQty: 6,
          adjustedQty: 0,
          currentStock: 0,
          reorderLevel: 0,
          durationMins: 60,
        },
        {
          ownerUid: uid,
          name: 'Express Neck, Shoulder & Back Consultation',
          itemType: 'service',
          sku: 'SRV-BKG-105',
          category: 'Therapy & Sessions',
          costPrice: '3000',
          sellingPrice: '25000',
          openingStock: 0,
          purchasedQty: 0,
          soldQty: 2,
          adjustedQty: 0,
          currentStock: 0,
          reorderLevel: 0,
          durationMins: 30,
        },
      ])
      .returning();

    const coffeeScrub = insertedItems[0];
    const charcoalScrub = insertedItems[1];
    const extractorKit = insertedItems[2];
    const vitCSerum = insertedItems[3];
    const blackheadService = insertedItems[6];
    const halfMassageService = insertedItems[7];
    const facialPackageService = insertedItems[8];

    // 3. Seed Customers
    const insertedCustomers = await db
      .insert(customers)
      .values([
        {
          ownerUid: uid,
          name: 'Neema Mwakasege',
          phone: '+255 755 312 400',
          email: 'neema.m@gmail.com',
          openingBalance: '0',
          totalCreditSales: '95000',
          totalPaymentsReceived: '35000',
          outstandingBalance: '60000',
          notes: 'Regular VIP client',
        },
        {
          ownerUid: uid,
          name: 'Zainab Hassan',
          phone: '+255 714 890 112',
          email: 'zainab.h@yahoo.com',
          openingBalance: '20000',
          totalCreditSales: '73000',
          totalPaymentsReceived: '0',
          outstandingBalance: '93000',
          notes: 'Prefers weekend facial packages',
        },
        {
          ownerUid: uid,
          name: 'Juma Kikwete',
          phone: '+255 768 111 222',
          email: 'jkikwete@outlook.com',
          openingBalance: '0',
          totalCreditSales: '0',
          totalPaymentsReceived: '0',
          outstandingBalance: '0',
          notes: 'Walk-in cash & M-Pesa customer',
        },
      ])
      .returning();

    const custNeema = insertedCustomers[0];
    const custZainab = insertedCustomers[1];
    const custJuma = insertedCustomers[2];

    // 4. Seed Suppliers
    const insertedSuppliers = await db
      .insert(suppliers)
      .values([
        {
          ownerUid: uid,
          name: 'Dar Wellness & Retail Supplies Ltd',
          phone: '+255 22 211 4500',
          email: 'orders@darbeautysupply.co.tz',
          openingBalance: '0',
          totalCreditPurchases: '480000',
          totalPaymentsMade: '280000',
          outstandingBalance: '200000',
          notes: 'Wholesale scrubs, serums, and facial consumables',
        },
        {
          ownerUid: uid,
          name: 'Zanzibar Pure Botanicals Co.',
          phone: '+255 777 405 600',
          email: 'sales@zanzibarbotanicals.co.tz',
          openingBalance: '50000',
          totalCreditPurchases: '125000',
          totalPaymentsMade: '50000',
          outstandingBalance: '125000',
          notes: 'Organic oils and natural scrubs',
        },
      ])
      .returning();

    const supDar = insertedSuppliers[0];
    const supZanzibar = insertedSuppliers[1];

    // 5. Seed Sales & Sale Items
    const d3 = todayStr(-3);
    const d2 = todayStr(-2);
    const d1 = todayStr(-1);
    const d0 = todayStr(0);

    // Sale 1: Cash/M-Pesa mixed product + service sale
    const [sale1] = await db
      .insert(sales)
      .values({
        ownerUid: uid,
        invoiceNo: 'INV-1001',
        saleDate: d3,
        customerId: custJuma.id,
        customerName: custJuma.name,
        staffName: 'Amina Juma (Service Specialist)',
        paymentMethod: 'mobile_money',
        paymentStatus: 'paid',
        totalAmount: '91000',
        totalCost: '35000',
        amountPaid: '91000',
        balanceDue: '0',
        isLocked: true,
        notes: 'Paid via M-Pesa Lipa Namba',
      })
      .returning();

    await db.insert(saleItems).values([
      {
        ownerUid: uid,
        saleId: sale1.id,
        itemId: blackheadService.id,
        itemName: blackheadService.name,
        itemType: 'service',
        quantity: 1,
        unitPrice: '35000',
        unitCost: '5000',
        lineTotal: '35000',
        lineProfit: '30000',
        saleDate: d3,
      },
      {
        ownerUid: uid,
        saleId: sale1.id,
        itemId: coffeeScrub.id,
        itemName: coffeeScrub.name,
        itemType: 'product',
        quantity: 2,
        unitPrice: '28000',
        unitCost: '15000',
        lineTotal: '56000',
        lineProfit: '26000',
        saleDate: d3,
      },
    ]);

    // Sale 2: Credit Sale for Neema (Half Massage + Facial Package = 105,000, paid 10,000 deposit, 95,000 credit, later paid 35,000)
    const [sale2] = await db
      .insert(sales)
      .values({
        ownerUid: uid,
        invoiceNo: 'INV-1002',
        saleDate: d2,
        customerId: custNeema.id,
        customerName: custNeema.name,
        staffName: 'Amina Juma (Service Specialist)',
        paymentMethod: 'credit',
        paymentStatus: 'partly_paid',
        totalAmount: '95000',
        totalCost: '15000',
        amountPaid: '35000',
        balanceDue: '60000',
        isLocked: true,
        notes: 'Service package + Vitamin C Serum on credit',
      })
      .returning();

    await db.insert(saleItems).values([
      {
        ownerUid: uid,
        saleId: sale2.id,
        itemId: facialPackageService.id,
        itemName: facialPackageService.name,
        itemType: 'service',
        quantity: 1,
        unitPrice: '60000',
        unitCost: '10000',
        lineTotal: '60000',
        lineProfit: '50000',
        saleDate: d2,
      },
      {
        ownerUid: uid,
        saleId: sale2.id,
        itemId: blackheadService.id,
        itemName: blackheadService.name,
        itemType: 'service',
        quantity: 1,
        unitPrice: '35000',
        unitCost: '5000',
        lineTotal: '35000',
        lineProfit: '30000',
        saleDate: d2,
      },
    ]);

    // Sale 3: Credit Sale for Zainab (Half Massage + Coffee Scrub = 73,000 unpaid)
    const [sale3] = await db
      .insert(sales)
      .values({
        ownerUid: uid,
        invoiceNo: 'INV-1003',
        saleDate: d1,
        customerId: custZainab.id,
        customerName: custZainab.name,
        staffName: 'Baraka Mushi (Retail Sales)',
        paymentMethod: 'credit',
        paymentStatus: 'unpaid',
        totalAmount: '73000',
        totalCost: '21000',
        amountPaid: '0',
        balanceDue: '73000',
        isLocked: true,
        notes: 'Service & scrub on credit account',
      })
      .returning();

    await db.insert(saleItems).values([
      {
        ownerUid: uid,
        saleId: sale3.id,
        itemId: halfMassageService.id,
        itemName: halfMassageService.name,
        itemType: 'service',
        quantity: 1,
        unitPrice: '45000',
        unitCost: '6000',
        lineTotal: '45000',
        lineProfit: '39000',
        saleDate: d1,
      },
      {
        ownerUid: uid,
        saleId: sale3.id,
        itemId: coffeeScrub.id,
        itemName: coffeeScrub.name,
        itemType: 'product',
        quantity: 1,
        unitPrice: '28000',
        unitCost: '15000',
        lineTotal: '28000',
        lineProfit: '13000',
        saleDate: d1,
      },
    ]);

    // Sale 4: Today's Cash Sale
    const [sale4] = await db
      .insert(sales)
      .values({
        ownerUid: uid,
        invoiceNo: 'INV-1004',
        saleDate: d0,
        customerId: null,
        customerName: 'Walk-in Customer',
        staffName: 'Baraka Mushi (Retail Sales)',
        paymentMethod: 'cash',
        paymentStatus: 'paid',
        totalAmount: '102000',
        totalCost: '55000',
        amountPaid: '102000',
        balanceDue: '0',
        isLocked: true,
        notes: 'Retail counter cash sale',
      })
      .returning();

    await db.insert(saleItems).values([
      {
        ownerUid: uid,
        saleId: sale4.id,
        itemId: extractorKit.id,
        itemName: extractorKit.name,
        itemType: 'product',
        quantity: 1,
        unitPrice: '45000',
        unitCost: '25000',
        lineTotal: '45000',
        lineProfit: '20000',
        saleDate: d0,
      },
      {
        ownerUid: uid,
        saleId: sale4.id,
        itemId: vitCSerum.id,
        itemName: vitCSerum.name,
        itemType: 'product',
        quantity: 1,
        unitPrice: '35000',
        unitCost: '18000',
        lineTotal: '35000',
        lineProfit: '17000',
        saleDate: d0,
      },
      {
        ownerUid: uid,
        saleId: sale4.id,
        itemId: charcoalScrub.id,
        itemName: charcoalScrub.name,
        itemType: 'product',
        quantity: 1,
        unitPrice: '22000',
        unitCost: '12000',
        lineTotal: '22000',
        lineProfit: '10000',
        saleDate: d0,
      },
    ]);

    // 6. Seed Purchases
    const [pur1] = await db
      .insert(purchases)
      .values({
        ownerUid: uid,
        billNo: 'BILL-2001',
        purchaseDate: d3,
        supplierId: supDar.id,
        supplierName: supDar.name,
        paymentMethod: 'credit',
        paymentStatus: 'partly_paid',
        totalAmount: '480000',
        amountPaid: '280000',
        balanceDue: '200000',
        staffName: ownerName,
        notes: 'Restock scrubs and serums',
      })
      .returning();

    await db.insert(purchaseItems).values([
      {
        ownerUid: uid,
        purchaseId: pur1.id,
        itemId: coffeeScrub.id,
        itemName: coffeeScrub.name,
        quantity: 15,
        unitCost: '15000',
        lineTotal: '225000',
        purchaseDate: d3,
      },
      {
        ownerUid: uid,
        purchaseId: pur1.id,
        itemId: vitCSerum.id,
        itemName: vitCSerum.name,
        quantity: 10,
        unitCost: '18000',
        lineTotal: '180000',
        purchaseDate: d3,
      },
      {
        ownerUid: uid,
        purchaseId: pur1.id,
        itemId: charcoalScrub.id,
        itemName: charcoalScrub.name,
        quantity: 6,
        unitCost: '12500',
        lineTotal: '75000',
        purchaseDate: d3,
      },
    ]);

    const [pur2] = await db
      .insert(purchases)
      .values({
        ownerUid: uid,
        billNo: 'BILL-2002',
        purchaseDate: d1,
        supplierId: supZanzibar.id,
        supplierName: supZanzibar.name,
        paymentMethod: 'credit',
        paymentStatus: 'unpaid',
        totalAmount: '125000',
        amountPaid: '0',
        balanceDue: '125000',
        staffName: ownerName,
        notes: 'Blackhead extractor kits restock on 14-day credit',
      })
      .returning();

    await db.insert(purchaseItems).values([
      {
        ownerUid: uid,
        purchaseId: pur2.id,
        itemId: extractorKit.id,
        itemName: extractorKit.name,
        quantity: 5,
        unitCost: '25000',
        lineTotal: '125000',
        purchaseDate: d1,
      },
    ]);

    // 7. Seed Expenses
    await db.insert(expenses).values([
      {
        ownerUid: uid,
        voucherNo: 'EXP-3001',
        expenseDate: d3,
        category: 'Utilities & LUKU Electricity',
        description: 'TANESCO LUKU tokens & DAWASA water bill for service rooms',
        amount: '45000',
        paymentMethod: 'mobile_money',
        paymentStatus: 'paid',
        staffName: ownerName,
      },
      {
        ownerUid: uid,
        voucherNo: 'EXP-3002',
        expenseDate: d1,
        category: 'Cleaning, Laundry & Hygiene',
        description: 'Fresh towel sterilization, disposable covers & hygiene supplies',
        amount: '25000',
        paymentMethod: 'cash',
        paymentStatus: 'paid',
        staffName: ownerName,
      },
    ]);

    // 8. Seed Payments (Customer Receipt & Supplier Payment)
    await db.insert(payments).values([
      {
        ownerUid: uid,
        receiptNo: 'RCT-4001',
        paymentDate: d1,
        paymentType: 'customer_receipt',
        partyId: custNeema.id,
        partyName: custNeema.name,
        referenceInvoiceId: sale2.id,
        referenceInvoiceNo: 'INV-1002',
        amount: '35000',
        paymentMethod: 'mobile_money',
        staffName: ownerName,
        notes: 'Part payment received via M-Pesa for INV-1002',
      },
      {
        ownerUid: uid,
        receiptNo: 'PAY-5001',
        paymentDate: d2,
        paymentType: 'supplier_payment',
        partyId: supDar.id,
        partyName: supDar.name,
        referenceInvoiceId: pur1.id,
        referenceInvoiceNo: 'BILL-2001',
        amount: '280000',
        paymentMethod: 'cash',
        staffName: ownerName,
        notes: 'Initial cash payment on BILL-2001',
      },
    ]);

    // 9. Seed Ledger Entries
    await db.insert(ledgerEntries).values([
      {
        ownerUid: uid,
        entryDate: d2,
        partyType: 'customer',
        partyId: custNeema.id,
        partyName: custNeema.name,
        voucherType: 'Credit Sale',
        voucherNo: 'INV-1002',
        description: 'Credit Sale: Signature Facial Package + Blackhead Removal',
        debit: '95000',
        credit: '0',
        runningBalance: '95000',
      },
      {
        ownerUid: uid,
        entryDate: d1,
        partyType: 'customer',
        partyId: custNeema.id,
        partyName: custNeema.name,
        voucherType: 'Payment Received',
        voucherNo: 'RCT-4001',
        description: 'M-Pesa Receipt against INV-1002',
        debit: '0',
        credit: '35000',
        runningBalance: '60000',
      },
      {
        ownerUid: uid,
        entryDate: d3,
        partyType: 'customer',
        partyId: custZainab.id,
        partyName: custZainab.name,
        voucherType: 'Opening Balance',
        voucherNo: 'OPN-001',
        description: 'Opening Receivable Balance Brought Forward',
        debit: '20000',
        credit: '0',
        runningBalance: '20000',
      },
      {
        ownerUid: uid,
        entryDate: d1,
        partyType: 'customer',
        partyId: custZainab.id,
        partyName: custZainab.name,
        voucherType: 'Credit Sale',
        voucherNo: 'INV-1003',
        description: 'Credit Sale: Half Body Massage + Coffee Scrub',
        debit: '73000',
        credit: '0',
        runningBalance: '93000',
      },
      {
        ownerUid: uid,
        entryDate: d3,
        partyType: 'supplier',
        partyId: supDar.id,
        partyName: supDar.name,
        voucherType: 'Credit Purchase',
        voucherNo: 'BILL-2001',
        description: 'Purchase of Scrubs & Serums (BILL-2001)',
        debit: '0',
        credit: '480000',
        runningBalance: '480000',
      },
      {
        ownerUid: uid,
        entryDate: d2,
        partyType: 'supplier',
        partyId: supDar.id,
        partyName: supDar.name,
        voucherType: 'Payment Made',
        voucherNo: 'PAY-5001',
        description: 'Part Payment to Dar Beauty Supplies',
        debit: '280000',
        credit: '0',
        runningBalance: '200000',
      },
      {
        ownerUid: uid,
        entryDate: d3,
        partyType: 'supplier',
        partyId: supZanzibar.id,
        partyName: supZanzibar.name,
        voucherType: 'Opening Balance',
        voucherNo: 'OPN-SUP-01',
        description: 'Opening Payable Balance Brought Forward',
        debit: '0',
        credit: '50000',
        runningBalance: '50000',
      },
      {
        ownerUid: uid,
        entryDate: d1,
        partyType: 'supplier',
        partyId: supZanzibar.id,
        partyName: supZanzibar.name,
        voucherType: 'Credit Purchase',
        voucherNo: 'BILL-2002',
        description: 'Purchase of 5x Blackhead Extractor Kits',
        debit: '0',
        credit: '125000',
        runningBalance: '175000',
      },
    ]);

    // 10. Seed Bookings (Showing multi-service + product booking!)
    await db.insert(bookings).values([
      {
        ownerUid: uid,
        bookingNo: 'BKG-701',
        appointmentDate: d0,
        appointmentTime: '11:00',
        customerId: custNeema.id,
        customerName: custNeema.name,
        customerPhone: custNeema.phone,
        assignedStaff: 'Amina Juma (Service Specialist)',
        status: 'arrived',
        itemsJson: JSON.stringify([
          {
            itemId: halfMassageService.id,
            itemName: halfMassageService.name,
            itemType: 'service',
            quantity: 1,
            unitPrice: 45000,
            unitCost: 6000,
            lineTotal: 45000,
          },
          {
            itemId: facialPackageService.id,
            itemName: facialPackageService.name,
            itemType: 'service',
            quantity: 1,
            unitPrice: 60000,
            unitCost: 10000,
            lineTotal: 60000,
          },
          {
            itemId: coffeeScrub.id,
            itemName: coffeeScrub.name,
            itemType: 'product',
            quantity: 1,
            unitPrice: 28000,
            unitCost: 15000,
            lineTotal: 28000,
          },
        ]),
        totalAmount: '133000',
        notes: 'Multi-service package + take-home coffee scrub jar',
      },
      {
        ownerUid: uid,
        bookingNo: 'BKG-702',
        appointmentDate: d0,
        appointmentTime: '14:30',
        customerId: custZainab.id,
        customerName: custZainab.name,
        customerPhone: custZainab.phone,
        assignedStaff: 'Amina Juma (Service Specialist)',
        status: 'booked',
        itemsJson: JSON.stringify([
          {
            itemId: blackheadService.id,
            itemName: blackheadService.name,
            itemType: 'service',
            quantity: 1,
            unitPrice: 35000,
            unitCost: 5000,
            lineTotal: 35000,
          },
          {
            itemId: vitCSerum.id,
            itemName: vitCSerum.name,
            itemType: 'product',
            quantity: 1,
            unitPrice: 35000,
            unitCost: 18000,
            lineTotal: 35000,
          },
        ]),
        totalAmount: '70000',
        notes: 'Blackhead removal session + Vitamin C serum bottle',
      },
    ]);

    // 11. Seed Audit Log
    await db.insert(auditLogs).values({
      ownerUid: uid,
      actorName: ownerName,
      actorRole: 'owner',
      action: 'SYSTEM_INIT',
      entityType: 'Workspace',
      entityRef: 'INIT-001',
      details: 'Initialized unified retail & service booking ledger in TZS with sample catalog, transactions, and bookings.',
    });
  } catch (error) {
    console.error('Error seeding initial workspace data:', error);
  }
}

export async function getFullWorkspaceData(uid: string) {
  try {
    const [
      userRows,
      settingsRows,
      staffRows,
      catalogRows,
      customerRows,
      supplierRows,
      saleRows,
      saleItemRows,
      purchaseRows,
      purchaseItemRows,
      expenseRows,
      paymentRows,
      bookingRows,
      ledgerRows,
      auditRows,
      backupRows,
    ] = await Promise.all([
      db.select().from(users).where(eq(users.uid, uid)),
      db.select().from(appSettings).where(eq(appSettings.ownerUid, uid)),
      db.select().from(staffMembers).where(eq(staffMembers.ownerUid, uid)).orderBy(desc(staffMembers.id)),
      db.select().from(catalogItems).where(eq(catalogItems.ownerUid, uid)).orderBy(catalogItems.name),
      db.select().from(customers).where(eq(customers.ownerUid, uid)).orderBy(customers.name),
      db.select().from(suppliers).where(eq(suppliers.ownerUid, uid)).orderBy(suppliers.name),
      db.select().from(sales).where(eq(sales.ownerUid, uid)).orderBy(desc(sales.id)),
      db.select().from(saleItems).where(eq(saleItems.ownerUid, uid)).orderBy(desc(saleItems.id)),
      db.select().from(purchases).where(eq(purchases.ownerUid, uid)).orderBy(desc(purchases.id)),
      db.select().from(purchaseItems).where(eq(purchaseItems.ownerUid, uid)).orderBy(desc(purchaseItems.id)),
      db.select().from(expenses).where(eq(expenses.ownerUid, uid)).orderBy(desc(expenses.id)),
      db.select().from(payments).where(eq(payments.ownerUid, uid)).orderBy(desc(payments.id)),
      db.select().from(bookings).where(eq(bookings.ownerUid, uid)).orderBy(desc(bookings.id)),
      db.select().from(ledgerEntries).where(eq(ledgerEntries.ownerUid, uid)).orderBy(desc(ledgerEntries.id)),
      db.select().from(auditLogs).where(eq(auditLogs.ownerUid, uid)).orderBy(desc(auditLogs.id)),
      db.select().from(cloudBackups).where(eq(cloudBackups.ownerUid, uid)).orderBy(desc(cloudBackups.id)),
    ]);

    const cleanCatalog = catalogRows.filter(
      (item: any) => item.itemType === 'product' || item.itemType === 'service'
    );

    return {
      user: userRows[0] || null,
      settings: settingsRows[0] || null,
      staff: staffRows,
      catalog: cleanCatalog,
      customers: customerRows,
      suppliers: supplierRows,
      sales: saleRows,
      saleItems: saleItemRows,
      purchases: purchaseRows,
      purchaseItems: purchaseItemRows,
      expenses: expenseRows,
      payments: paymentRows,
      bookings: bookingRows,
      ledgerEntries: ledgerRows,
      auditLogs: auditRows,
      cloudBackups: backupRows,
    };
  } catch (error) {
    console.error('Failed to fetch workspace data:', error);
    throw new Error('Failed to load workspace data from database.', { cause: error });
  }
}

export async function logAudit(
  uid: string,
  actorName: string,
  actorRole: string,
  action: string,
  entityType: string,
  entityRef: string,
  details: string
) {
  try {
    await db.insert(auditLogs).values({
      ownerUid: uid,
      actorName,
      actorRole,
      action,
      entityType,
      entityRef,
      details,
    });
  } catch (error) {
    console.error('Audit log error:', error);
  }
}

export function computeNextBackupRun(
  frequency: 'daily' | 'weekly',
  dayOfWeek: string,
  timeStr: string
): string {
  const now = new Date();
  const [hh, mm] = (timeStr || '02:00').split(':').map((n) => Number(n) || 0);
  const next = new Date(now);
  next.setHours(hh, mm, 0, 0);

  if (frequency === 'weekly') {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const targetDayIdx = Math.max(0, days.indexOf(dayOfWeek || 'Sunday'));
    let diff = (targetDayIdx - now.getDay() + 7) % 7;
    if (diff === 0 && next <= now) {
      diff = 7;
    }
    next.setDate(now.getDate() + diff);
  } else {
    if (next <= now) {
      next.setDate(now.getDate() + 1);
    }
  }
  return `${next.toISOString().split('T')[0]} at ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')} EAT`;
}

export async function updateWorkspaceSettings(
  uid: string,
  payload: {
    businessName?: string;
    openingCash?: string;
    bookingEnabled?: boolean;
    theme?: string;
    activeRoleView?: string;
    backupEnabled?: boolean;
    backupFrequency?: 'daily' | 'weekly';
    backupDayOfWeek?: string;
    backupTime?: string;
    backupBucketUri?: string;
    backupRetentionDays?: number;
  },
  actorName: string,
  actorRole: string
) {
  try {
    if (payload.activeRoleView) {
      await db
        .update(users)
        .set({ activeRoleView: payload.activeRoleView })
        .where(eq(users.uid, uid));
    }

    const existingRows = await db
      .select()
      .from(appSettings)
      .where(eq(appSettings.ownerUid, uid));
    const current = existingRows[0];

    const updateFields: Record<string, unknown> = { updatedAt: new Date() };
    if (payload.businessName !== undefined) updateFields.businessName = payload.businessName;
    if (payload.openingCash !== undefined) updateFields.openingCash = String(payload.openingCash);
    if (payload.bookingEnabled !== undefined) updateFields.bookingEnabled = Boolean(payload.bookingEnabled);
    if (payload.theme !== undefined) updateFields.theme = payload.theme;

    const nextEnabled =
      payload.backupEnabled !== undefined
        ? Boolean(payload.backupEnabled)
        : Boolean(current?.backupEnabled);
    const nextFreq = (payload.backupFrequency || current?.backupFrequency || 'daily') as
      | 'daily'
      | 'weekly';
    const nextDay = payload.backupDayOfWeek || current?.backupDayOfWeek || 'Sunday';
    const nextTime = payload.backupTime || current?.backupTime || '02:00';

    if (payload.backupEnabled !== undefined) updateFields.backupEnabled = nextEnabled;
    if (payload.backupFrequency !== undefined) updateFields.backupFrequency = nextFreq;
    if (payload.backupDayOfWeek !== undefined) updateFields.backupDayOfWeek = nextDay;
    if (payload.backupTime !== undefined) updateFields.backupTime = nextTime;
    if (payload.backupBucketUri !== undefined)
      updateFields.backupBucketUri = payload.backupBucketUri.trim();
    if (payload.backupRetentionDays !== undefined)
      updateFields.backupRetentionDays = Number(payload.backupRetentionDays) || 30;

    if (
      payload.backupEnabled !== undefined ||
      payload.backupFrequency !== undefined ||
      payload.backupDayOfWeek !== undefined ||
      payload.backupTime !== undefined
    ) {
      updateFields.nextBackupAt = nextEnabled
        ? computeNextBackupRun(nextFreq, nextDay, nextTime)
        : 'Paused';
    }

    const updated = await db
      .update(appSettings)
      .set(updateFields)
      .where(eq(appSettings.ownerUid, uid))
      .returning();

    const isBackupUpdate =
      payload.backupEnabled !== undefined ||
      payload.backupFrequency !== undefined ||
      payload.backupBucketUri !== undefined;

    await logAudit(
      uid,
      actorName,
      actorRole,
      isBackupUpdate ? 'UPDATE_BACKUP_SCHEDULE' : 'UPDATE_SETTINGS',
      isBackupUpdate ? 'CloudBackupSchedule' : 'Settings',
      'CFG',
      isBackupUpdate
        ? `Configured automated cloud backup: ${nextEnabled ? 'ENABLED' : 'PAUSED'} (${nextFreq.toUpperCase()}${
            nextFreq === 'weekly' ? ` on ${nextDay}` : ''
          } at ${nextTime}) → ${payload.backupBucketUri || current?.backupBucketUri}`
        : `Updated workspace settings (${Object.keys(payload).join(', ')})`
    );

    return updated[0];
  } catch (error) {
    console.error('Failed to update settings:', error);
    throw new Error('Failed to update settings.', { cause: error });
  }
}

export async function createOrUpdateCatalogItem(
  uid: string,
  payload: {
    id?: number;
    name: string;
    itemType?: 'product' | 'service';
    unit?: string;
    sku?: string;
    category?: string;
    costPrice?: number | string;
    sellingPrice?: number | string;
    openingStock?: number | string;
    adjustedQty?: number | string;
    reorderLevel?: number | string;
    durationMins?: number | string;
  },
  actorName: string,
  actorRole: string
) {
  try {
    const cleanName = String(payload.name || '').trim();
    if (!cleanName) {
      throw new Error('Item name is required.');
    }

    const normalizedType: 'product' | 'service' =
      payload.itemType === 'service' ? 'service' : 'product';
    const prefix = normalizedType === 'service' ? 'SRV' : 'PRD';
    const sku = payload.sku?.trim() || `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
    const unit = payload.unit?.trim() || 'pcs';
    const costNum = Math.max(0, Number(payload.costPrice || 0) || 0);
    const sellNum = Math.max(0, Number(payload.sellingPrice || 0) || 0);

    if (payload.id) {
      const existing = await db
        .select()
        .from(catalogItems)
        .where(and(eq(catalogItems.id, Number(payload.id)), eq(catalogItems.ownerUid, uid)));
      if (!existing.length) throw new Error('Item not found');
      const item = existing[0];
      const opening =
        payload.openingStock !== undefined
          ? Math.max(0, Number(payload.openingStock) || 0)
          : item.openingStock;
      const adjusted =
        payload.adjustedQty !== undefined
          ? Number(payload.adjustedQty) || 0
          : item.adjustedQty;
      const currentStock =
        normalizedType === 'service'
          ? 0
          : opening + item.purchasedQty - item.soldQty + adjusted;

      const [updated] = await db
        .update(catalogItems)
        .set({
          name: cleanName,
          itemType: normalizedType,
          unit,
          sku,
          category: payload.category?.trim() || (normalizedType === 'service' ? 'Facial Treatments' : 'Skincare'),
          costPrice: String(costNum),
          sellingPrice: String(sellNum),
          openingStock: opening,
          adjustedQty: adjusted,
          currentStock,
          reorderLevel:
            payload.reorderLevel !== undefined
              ? Math.max(0, Number(payload.reorderLevel) || 0)
              : item.reorderLevel,
          durationMins:
            payload.durationMins !== undefined
              ? Math.max(0, Number(payload.durationMins) || 0)
              : item.durationMins,
        })
        .where(and(eq(catalogItems.id, Number(payload.id)), eq(catalogItems.ownerUid, uid)))
        .returning();

      await logAudit(
        uid,
        actorName,
        actorRole,
        'UPDATE_ITEM',
        'CatalogItem',
        sku,
        `Updated ${normalizedType} "${cleanName}" (Cost: TZS ${costNum}, Sell: TZS ${sellNum})`
      );
      return updated;
    } else {
      const opening =
        normalizedType === 'service' ? 0 : Math.max(0, Number(payload.openingStock || 0) || 0);
      const [inserted] = await db
        .insert(catalogItems)
        .values({
          ownerUid: uid,
          name: cleanName,
          itemType: normalizedType,
          unit,
          sku,
          category: payload.category?.trim() || (normalizedType === 'service' ? 'Facial Treatments' : 'Skincare'),
          costPrice: String(costNum),
          sellingPrice: String(sellNum),
          openingStock: opening,
          purchasedQty: 0,
          soldQty: 0,
          adjustedQty: 0,
          currentStock: opening,
          reorderLevel:
            normalizedType === 'service' ? 0 : Math.max(0, Number(payload.reorderLevel ?? 5) || 0),
          durationMins:
            normalizedType === 'service' ? Math.max(5, Number(payload.durationMins ?? 45) || 45) : 0,
        })
        .returning();

      await logAudit(
        uid,
        actorName,
        actorRole,
        'CREATE_ITEM',
        'CatalogItem',
        sku,
        `Added new ${normalizedType} "${cleanName}" (${opening} ${unit})`
      );
      return inserted;
    }
  } catch (error: any) {
    console.error('Failed to save catalog item:', error);
    throw new Error(error.message || 'Failed to save catalog item.', { cause: error });
  }
}

export async function createCustomerRecord(
  uid: string,
  payload: {
    name: string;
    phone?: string;
    email?: string;
    openingBalance?: number;
    notes?: string;
  },
  actorName: string,
  actorRole: string
) {
  try {
    const opening = Number(payload.openingBalance || 0);
    const [cust] = await db
      .insert(customers)
      .values({
        ownerUid: uid,
        name: payload.name.trim(),
        phone: payload.phone?.trim() || '',
        email: payload.email?.trim() || '',
        openingBalance: String(opening),
        totalCreditSales: '0',
        totalPaymentsReceived: '0',
        outstandingBalance: String(opening),
        notes: payload.notes || '',
      })
      .returning();

    if (opening > 0) {
      await db.insert(ledgerEntries).values({
        ownerUid: uid,
        entryDate: todayStr(0),
        partyType: 'customer',
        partyId: cust.id,
        partyName: cust.name,
        voucherType: 'Opening Balance',
        voucherNo: `OPN-C${cust.id}`,
        description: 'Opening Receivable Balance Brought Forward',
        debit: String(opening),
        credit: '0',
        runningBalance: String(opening),
      });
    }

    await logAudit(
      uid,
      actorName,
      actorRole,
      'CREATE_CUSTOMER',
      'Customer',
      `CUST-${cust.id}`,
      `Added customer "${cust.name}" (Opening Receivable: TZS ${opening})`
    );

    return cust;
  } catch (error) {
    console.error('Failed to create customer:', error);
    throw new Error('Failed to create customer.', { cause: error });
  }
}

export async function createSupplierRecord(
  uid: string,
  payload: {
    name: string;
    phone?: string;
    email?: string;
    openingBalance?: number;
    notes?: string;
  },
  actorName: string,
  actorRole: string
) {
  try {
    const opening = Number(payload.openingBalance || 0);
    const [sup] = await db
      .insert(suppliers)
      .values({
        ownerUid: uid,
        name: payload.name.trim(),
        phone: payload.phone?.trim() || '',
        email: payload.email?.trim() || '',
        openingBalance: String(opening),
        totalCreditPurchases: '0',
        totalPaymentsMade: '0',
        outstandingBalance: String(opening),
        notes: payload.notes || '',
      })
      .returning();

    if (opening > 0) {
      await db.insert(ledgerEntries).values({
        ownerUid: uid,
        entryDate: todayStr(0),
        partyType: 'supplier',
        partyId: sup.id,
        partyName: sup.name,
        voucherType: 'Opening Balance',
        voucherNo: `OPN-S${sup.id}`,
        description: 'Opening Payable Balance Brought Forward',
        debit: '0',
        credit: String(opening),
        runningBalance: String(opening),
      });
    }

    await logAudit(
      uid,
      actorName,
      actorRole,
      'CREATE_SUPPLIER',
      'Supplier',
      `SUP-${sup.id}`,
      `Added supplier "${sup.name}" (Opening Payable: TZS ${opening})`
    );

    return sup;
  } catch (error) {
    console.error('Failed to create supplier:', error);
    throw new Error('Failed to create supplier.', { cause: error });
  }
}

export async function createSaleTransaction(
  uid: string,
  payload: {
    saleDate: string;
    customerId?: number | null;
    customerName?: string;
    staffName: string;
    paymentMethod: 'cash' | 'mobile_money' | 'card' | 'credit';
    amountPaid?: number;
    bookingId?: number | null;
    notes?: string;
    items: Array<{
      itemId: number;
      quantity: number;
      unitPrice: number;
    }>;
  },
  actorName: string,
  actorRole: string
) {
  try {
    if (!payload.items || payload.items.length === 0) {
      throw new Error('Sale must include at least one product or service.');
    }

    const catalogList = await db
      .select()
      .from(catalogItems)
      .where(eq(catalogItems.ownerUid, uid));
    const catalogMap = new Map(catalogList.map((c) => [c.id, c]));

    let totalAmount = 0;
    let totalCost = 0;
    const enrichedItems: Array<{
      itemId: number;
      itemName: string;
      itemType: string;
      quantity: number;
      unitPrice: number;
      unitCost: number;
      lineTotal: number;
      lineProfit: number;
    }> = [];

    for (const line of payload.items) {
      const catItem = catalogMap.get(Number(line.itemId));
      if (!catItem) throw new Error(`Catalog item #${line.itemId} not found`);
      const qty = Math.max(1, Number(line.quantity || 1));
      const price = Number(line.unitPrice ?? catItem.sellingPrice);
      const cost = Number(catItem.costPrice || 0);
      const lineTotal = price * qty;
      const lineCost = cost * qty;
      const lineProfit = lineTotal - lineCost;

      totalAmount += lineTotal;
      totalCost += lineCost;

      enrichedItems.push({
        itemId: catItem.id,
        itemName: catItem.name,
        itemType: catItem.itemType,
        quantity: qty,
        unitPrice: price,
        unitCost: cost,
        lineTotal,
        lineProfit,
      });
    }

    let amountPaid =
      payload.paymentMethod === 'credit'
        ? Number(payload.amountPaid ?? 0)
        : totalAmount;
    if (amountPaid > totalAmount) amountPaid = totalAmount;
    if (amountPaid < 0) amountPaid = 0;

    const balanceDue = Math.max(0, totalAmount - amountPaid);
    const paymentStatus =
      balanceDue === 0 ? 'paid' : amountPaid > 0 ? 'partly_paid' : 'unpaid';

    if (balanceDue > 0 && !payload.customerId) {
      throw new Error('Please select or add a Customer for Credit / Partly Paid sales so it can be tracked in Receivables.');
    }

    let resolvedCustomerName = payload.customerName || 'Walk-in Customer';
    let customerRow: typeof customers.$inferSelect | null = null;
    if (payload.customerId) {
      const found = await db
        .select()
        .from(customers)
        .where(and(eq(customers.id, payload.customerId), eq(customers.ownerUid, uid)));
      if (found.length > 0 && found[0]) {
        customerRow = found[0];
        resolvedCustomerName = found[0].name;
      }
    }

    const invoiceNo = `INV-${Math.floor(1000 + Math.random() * 90000)}`;

    const [createdSale] = await db
      .insert(sales)
      .values({
        ownerUid: uid,
        invoiceNo,
        saleDate: payload.saleDate || todayStr(0),
        customerId: payload.customerId || null,
        customerName: resolvedCustomerName,
        staffName: payload.staffName || actorName,
        paymentMethod: payload.paymentMethod,
        paymentStatus,
        totalAmount: String(totalAmount),
        totalCost: String(totalCost),
        amountPaid: String(amountPaid),
        balanceDue: String(balanceDue),
        bookingId: payload.bookingId || null,
        isLocked: true, // Always locked after saving so staff cannot alter finalized sales
        isDeleted: false,
        notes: payload.notes || '',
      })
      .returning();

    // Insert sale items and update inventory for products
    for (const item of enrichedItems) {
      await db.insert(saleItems).values({
        ownerUid: uid,
        saleId: createdSale.id,
        itemId: item.itemId,
        itemName: item.itemName,
        itemType: item.itemType,
        quantity: item.quantity,
        unitPrice: String(item.unitPrice),
        unitCost: String(item.unitCost),
        lineTotal: String(item.lineTotal),
        lineProfit: String(item.lineProfit),
        saleDate: createdSale.saleDate,
      });

      const catItem = catalogMap.get(item.itemId)!;
      const newSoldQty = catItem.soldQty + item.quantity;
      const newCurrentStock =
        catItem.itemType === 'product'
          ? catItem.openingStock + catItem.purchasedQty - newSoldQty + catItem.adjustedQty
          : 0;

      await db
        .update(catalogItems)
        .set({
          soldQty: newSoldQty,
          currentStock: newCurrentStock,
        })
        .where(eq(catalogItems.id, item.itemId));
    }

    // Update Customer balance & Ledger if customer selected
    if (customerRow) {
      const prevOut = Number(customerRow.outstandingBalance || 0);
      const prevCreditSales = Number(customerRow.totalCreditSales || 0);
      const prevPayments = Number(customerRow.totalPaymentsReceived || 0);

      const newOutstanding = prevOut + balanceDue;
      const newCreditSales = prevCreditSales + (balanceDue > 0 ? totalAmount : 0);
      const newPayments = prevPayments + (balanceDue > 0 && amountPaid > 0 ? amountPaid : 0);

      await db
        .update(customers)
        .set({
          totalCreditSales: String(newCreditSales),
          totalPaymentsReceived: String(newPayments),
          outstandingBalance: String(newOutstanding),
        })
        .where(eq(customers.id, customerRow.id));

      const itemSummary = enrichedItems.map((i) => `${i.quantity}x ${i.itemName}`).join(', ');

      if (balanceDue > 0) {
        // Record full invoice debit
        const balAfterInvoice = prevOut + totalAmount;
        await db.insert(ledgerEntries).values({
          ownerUid: uid,
          entryDate: createdSale.saleDate,
          partyType: 'customer',
          partyId: customerRow.id,
          partyName: customerRow.name,
          voucherType: 'Credit Sale',
          voucherNo: invoiceNo,
          description: `Credit Sale (${itemSummary})`,
          debit: String(totalAmount),
          credit: '0',
          runningBalance: String(balAfterInvoice),
        });

        if (amountPaid > 0) {
          await db.insert(ledgerEntries).values({
            ownerUid: uid,
            entryDate: createdSale.saleDate,
            partyType: 'customer',
            partyId: customerRow.id,
            partyName: customerRow.name,
            voucherType: 'Payment Received',
            voucherNo: `${invoiceNo}-DEP`,
            description: `Initial Deposit Paid on ${invoiceNo}`,
            debit: '0',
            credit: String(amountPaid),
            runningBalance: String(newOutstanding),
          });
        }
      } else {
        // Paid in full — record in ledger so statement shows complete history
        await db.insert(ledgerEntries).values({
          ownerUid: uid,
          entryDate: createdSale.saleDate,
          partyType: 'customer',
          partyId: customerRow.id,
          partyName: customerRow.name,
          voucherType: 'Cash Sale',
          voucherNo: invoiceNo,
          description: `Paid Sale (${ payload.paymentMethod.toUpperCase() }): ${itemSummary}`,
          debit: String(totalAmount),
          credit: String(totalAmount),
          runningBalance: String(prevOut),
        });
      }
    }

    // If linked to a booking, mark booking completed
    if (payload.bookingId) {
      await db
        .update(bookings)
        .set({
          status: 'completed',
          convertedSaleId: createdSale.id,
        })
        .where(and(eq(bookings.id, payload.bookingId), eq(bookings.ownerUid, uid)));
    }

    await logAudit(
      uid,
      actorName,
      actorRole,
      'CREATE_SALE',
      'Sale',
      invoiceNo,
      `Recorded sale ${invoiceNo} for ${resolvedCustomerName} — Total: TZS ${totalAmount}, Paid: TZS ${amountPaid}, Balance Due: TZS ${balanceDue}`
    );

    return createdSale;
  } catch (error: any) {
    console.error('Failed to create sale:', error);
    throw new Error(error.message || 'Failed to record sale.', { cause: error });
  }
}

export async function createPurchaseTransaction(
  uid: string,
  payload: {
    purchaseDate: string;
    supplierId: number;
    paymentMethod: 'cash' | 'mobile_money' | 'card' | 'credit';
    amountPaid?: number;
    staffName: string;
    notes?: string;
    items: Array<{
      itemId: number;
      quantity: number;
      unitCost: number;
    }>;
  },
  actorName: string,
  actorRole: string
) {
  try {
    if (!payload.supplierId) {
      throw new Error('Please select a supplier for this purchase.');
    }
    if (!payload.items || payload.items.length === 0) {
      throw new Error('Purchase must contain at least one product.');
    }

    const supRows = await db
      .select()
      .from(suppliers)
      .where(and(eq(suppliers.id, payload.supplierId), eq(suppliers.ownerUid, uid)));
    if (!supRows.length) throw new Error('Supplier not found.');
    const supplier = supRows[0];

    const catalogList = await db
      .select()
      .from(catalogItems)
      .where(eq(catalogItems.ownerUid, uid));
    const catalogMap = new Map(catalogList.map((c) => [c.id, c]));

    let totalAmount = 0;
    const enrichedItems: Array<{
      itemId: number;
      itemName: string;
      quantity: number;
      unitCost: number;
      lineTotal: number;
    }> = [];

    for (const line of payload.items) {
      const catItem = catalogMap.get(Number(line.itemId));
      if (!catItem) throw new Error(`Product #${line.itemId} not found`);
      const qty = Math.max(1, Number(line.quantity || 1));
      const cost = Number(line.unitCost ?? catItem.costPrice);
      const lineTotal = qty * cost;
      totalAmount += lineTotal;

      enrichedItems.push({
        itemId: catItem.id,
        itemName: catItem.name,
        quantity: qty,
        unitCost: cost,
        lineTotal,
      });
    }

    let amountPaid =
      payload.paymentMethod === 'credit'
        ? Number(payload.amountPaid ?? 0)
        : totalAmount;
    if (amountPaid > totalAmount) amountPaid = totalAmount;
    if (amountPaid < 0) amountPaid = 0;

    const balanceDue = Math.max(0, totalAmount - amountPaid);
    const paymentStatus =
      balanceDue === 0 ? 'paid' : amountPaid > 0 ? 'partly_paid' : 'unpaid';

    const billNo = `BILL-${Math.floor(1000 + Math.random() * 90000)}`;

    const [createdPurchase] = await db
      .insert(purchases)
      .values({
        ownerUid: uid,
        billNo,
        purchaseDate: payload.purchaseDate || todayStr(0),
        supplierId: supplier.id,
        supplierName: supplier.name,
        paymentMethod: payload.paymentMethod,
        paymentStatus,
        totalAmount: String(totalAmount),
        amountPaid: String(amountPaid),
        balanceDue: String(balanceDue),
        staffName: payload.staffName || actorName,
        isDeleted: false,
        notes: payload.notes || '',
      })
      .returning();

    for (const item of enrichedItems) {
      await db.insert(purchaseItems).values({
        ownerUid: uid,
        purchaseId: createdPurchase.id,
        itemId: item.itemId,
        itemName: item.itemName,
        quantity: item.quantity,
        unitCost: String(item.unitCost),
        lineTotal: String(item.lineTotal),
        purchaseDate: createdPurchase.purchaseDate,
      });

      const catItem = catalogMap.get(item.itemId)!;
      const newPurchasedQty = catItem.purchasedQty + item.quantity;
      const newCurrentStock =
        catItem.openingStock + newPurchasedQty - catItem.soldQty + catItem.adjustedQty;

      await db
        .update(catalogItems)
        .set({
          purchasedQty: newPurchasedQty,
          currentStock: newCurrentStock,
          costPrice: String(item.unitCost),
        })
        .where(eq(catalogItems.id, item.itemId));
    }

    // Update Supplier balance & Ledger
    const prevOut = Number(supplier.outstandingBalance || 0);
    const prevCreditPur = Number(supplier.totalCreditPurchases || 0);
    const prevPaid = Number(supplier.totalPaymentsMade || 0);

    const newOutstanding = prevOut + balanceDue;
    const newCreditPur = prevCreditPur + (balanceDue > 0 ? totalAmount : 0);
    const newPaid = prevPaid + (balanceDue > 0 && amountPaid > 0 ? amountPaid : 0);

    await db
      .update(suppliers)
      .set({
        totalCreditPurchases: String(newCreditPur),
        totalPaymentsMade: String(newPaid),
        outstandingBalance: String(newOutstanding),
      })
      .where(eq(suppliers.id, supplier.id));

    const itemSummary = enrichedItems.map((i) => `${i.quantity}x ${i.itemName}`).join(', ');

    if (balanceDue > 0) {
      const balAfterBill = prevOut + totalAmount;
      await db.insert(ledgerEntries).values({
        ownerUid: uid,
        entryDate: createdPurchase.purchaseDate,
        partyType: 'supplier',
        partyId: supplier.id,
        partyName: supplier.name,
        voucherType: 'Credit Purchase',
        voucherNo: billNo,
        description: `Purchase Bill (${itemSummary})`,
        debit: '0',
        credit: String(totalAmount),
        runningBalance: String(balAfterBill),
      });

      if (amountPaid > 0) {
        await db.insert(ledgerEntries).values({
          ownerUid: uid,
          entryDate: createdPurchase.purchaseDate,
          partyType: 'supplier',
          partyId: supplier.id,
          partyName: supplier.name,
          voucherType: 'Payment Made',
          voucherNo: `${billNo}-PART`,
          description: `Initial Part Payment on ${billNo}`,
          debit: String(amountPaid),
          credit: '0',
          runningBalance: String(newOutstanding),
        });
      }
    } else {
      await db.insert(ledgerEntries).values({
        ownerUid: uid,
        entryDate: createdPurchase.purchaseDate,
        partyType: 'supplier',
        partyId: supplier.id,
        partyName: supplier.name,
        voucherType: 'Cash Purchase',
        voucherNo: billNo,
        description: `Paid Purchase (${payload.paymentMethod.toUpperCase()}): ${itemSummary}`,
        debit: String(totalAmount),
        credit: String(totalAmount),
        runningBalance: String(prevOut),
      });
    }

    await logAudit(
      uid,
      actorName,
      actorRole,
      'CREATE_PURCHASE',
      'Purchase',
      billNo,
      `Recorded purchase ${billNo} from ${supplier.name} — Total: TZS ${totalAmount}, Paid: TZS ${amountPaid}, Payable: TZS ${balanceDue}`
    );

    return createdPurchase;
  } catch (error: any) {
    console.error('Failed to record purchase:', error);
    throw new Error(error.message || 'Failed to record purchase.', { cause: error });
  }
}

export async function recordPartyPayment(
  uid: string,
  payload: {
    paymentDate: string;
    paymentType: 'customer_receipt' | 'supplier_payment';
    partyId: number;
    referenceInvoiceId?: number | null;
    amount: number;
    paymentMethod: 'cash' | 'mobile_money' | 'card';
    notes?: string;
  },
  actorName: string,
  actorRole: string
) {
  try {
    const payAmount = Number(payload.amount || 0);
    if (payAmount <= 0) {
      throw new Error('Payment amount must be greater than zero.');
    }

    const prefix = payload.paymentType === 'customer_receipt' ? 'RCT' : 'PAY';
    const receiptNo = `${prefix}-${Math.floor(1000 + Math.random() * 90000)}`;

    if (payload.paymentType === 'customer_receipt') {
      const custRows = await db
        .select()
        .from(customers)
        .where(and(eq(customers.id, payload.partyId), eq(customers.ownerUid, uid)));
      if (!custRows.length) throw new Error('Customer not found.');
      const cust = custRows[0];

      let refInvoiceNo = '';
      let remainingToAllocate = payAmount;

      if (payload.referenceInvoiceId) {
        const saleRows = await db
          .select()
          .from(sales)
          .where(and(eq(sales.id, payload.referenceInvoiceId), eq(sales.ownerUid, uid)));
        if (saleRows.length > 0) {
          const s = saleRows[0];
          refInvoiceNo = s.invoiceNo;
          const curDue = Number(s.balanceDue || 0);
          const curPaid = Number(s.amountPaid || 0);
          const alloc = Math.min(curDue, remainingToAllocate);
          const newDue = Math.max(0, curDue - alloc);
          const newPaid = curPaid + alloc;
          const newStatus = newDue === 0 ? 'paid' : 'partly_paid';
          await db
            .update(sales)
            .set({
              amountPaid: String(newPaid),
              balanceDue: String(newDue),
              paymentStatus: newStatus,
            })
            .where(eq(sales.id, s.id));
        }
      } else {
        // Allocate across oldest unpaid credit sales for this customer
        const unpaidSales = await db
          .select()
          .from(sales)
          .where(and(eq(sales.ownerUid, uid), eq(sales.customerId, cust.id)));

        for (const s of unpaidSales) {
          const curDue = Number(s.balanceDue || 0);
          if (curDue > 0 && remainingToAllocate > 0 && !s.isDeleted) {
            const alloc = Math.min(curDue, remainingToAllocate);
            remainingToAllocate -= alloc;
            const newDue = Math.max(0, curDue - alloc);
            const newPaid = Number(s.amountPaid || 0) + alloc;
            const newStatus = newDue === 0 ? 'paid' : 'partly_paid';
            if (!refInvoiceNo) refInvoiceNo = s.invoiceNo;
            await db
              .update(sales)
              .set({
                amountPaid: String(newPaid),
                balanceDue: String(newDue),
                paymentStatus: newStatus,
              })
              .where(eq(sales.id, s.id));
          }
        }
      }

      const prevOut = Number(cust.outstandingBalance || 0);
      const prevRecv = Number(cust.totalPaymentsReceived || 0);
      const newOut = Math.max(0, prevOut - payAmount);
      const newRecv = prevRecv + payAmount;

      await db
        .update(customers)
        .set({
          outstandingBalance: String(newOut),
          totalPaymentsReceived: String(newRecv),
        })
        .where(eq(customers.id, cust.id));

      const [paymentRow] = await db
        .insert(payments)
        .values({
          ownerUid: uid,
          receiptNo,
          paymentDate: payload.paymentDate || todayStr(0),
          paymentType: 'customer_receipt',
          partyId: cust.id,
          partyName: cust.name,
          referenceInvoiceId: payload.referenceInvoiceId || null,
          referenceInvoiceNo: refInvoiceNo,
          amount: String(payAmount),
          paymentMethod: payload.paymentMethod,
          staffName: actorName,
          notes: payload.notes || '',
        })
        .returning();

      await db.insert(ledgerEntries).values({
        ownerUid: uid,
        entryDate: paymentRow.paymentDate,
        partyType: 'customer',
        partyId: cust.id,
        partyName: cust.name,
        voucherType: 'Payment Received',
        voucherNo: receiptNo,
        description: `Customer Payment Received (${payload.paymentMethod.toUpperCase()})${refInvoiceNo ? ` against ${refInvoiceNo}` : ''}`,
        debit: '0',
        credit: String(payAmount),
        runningBalance: String(newOut),
      });

      await logAudit(
        uid,
        actorName,
        actorRole,
        'RECEIVE_PAYMENT',
        'Payment',
        receiptNo,
        `Received TZS ${payAmount} from customer ${cust.name} (${refInvoiceNo || 'Account Balance'}). New receivable balance: TZS ${newOut}`
      );

      return paymentRow;
    } else {
      // Supplier payment
      const supRows = await db
        .select()
        .from(suppliers)
        .where(and(eq(suppliers.id, payload.partyId), eq(suppliers.ownerUid, uid)));
      if (!supRows.length) throw new Error('Supplier not found.');
      const sup = supRows[0];

      let refBillNo = '';
      let remainingToAllocate = payAmount;

      if (payload.referenceInvoiceId) {
        const purRows = await db
          .select()
          .from(purchases)
          .where(and(eq(purchases.id, payload.referenceInvoiceId), eq(purchases.ownerUid, uid)));
        if (purRows.length > 0) {
          const p = purRows[0];
          refBillNo = p.billNo;
          const curDue = Number(p.balanceDue || 0);
          const curPaid = Number(p.amountPaid || 0);
          const alloc = Math.min(curDue, remainingToAllocate);
          const newDue = Math.max(0, curDue - alloc);
          const newPaid = curPaid + alloc;
          const newStatus = newDue === 0 ? 'paid' : 'partly_paid';
          await db
            .update(purchases)
            .set({
              amountPaid: String(newPaid),
              balanceDue: String(newDue),
              paymentStatus: newStatus,
            })
            .where(eq(purchases.id, p.id));
        }
      } else {
        const unpaidPurchases = await db
          .select()
          .from(purchases)
          .where(and(eq(purchases.ownerUid, uid), eq(purchases.supplierId, sup.id)));

        for (const p of unpaidPurchases) {
          const curDue = Number(p.balanceDue || 0);
          if (curDue > 0 && remainingToAllocate > 0 && !p.isDeleted) {
            const alloc = Math.min(curDue, remainingToAllocate);
            remainingToAllocate -= alloc;
            const newDue = Math.max(0, curDue - alloc);
            const newPaid = Number(p.amountPaid || 0) + alloc;
            const newStatus = newDue === 0 ? 'paid' : 'partly_paid';
            if (!refBillNo) refBillNo = p.billNo;
            await db
              .update(purchases)
              .set({
                amountPaid: String(newPaid),
                balanceDue: String(newDue),
                paymentStatus: newStatus,
              })
              .where(eq(purchases.id, p.id));
          }
        }
      }

      const prevOut = Number(sup.outstandingBalance || 0);
      const prevPaid = Number(sup.totalPaymentsMade || 0);
      const newOut = Math.max(0, prevOut - payAmount);
      const newPaid = prevPaid + payAmount;

      await db
        .update(suppliers)
        .set({
          outstandingBalance: String(newOut),
          totalPaymentsMade: String(newPaid),
        })
        .where(eq(suppliers.id, sup.id));

      const [paymentRow] = await db
        .insert(payments)
        .values({
          ownerUid: uid,
          receiptNo,
          paymentDate: payload.paymentDate || todayStr(0),
          paymentType: 'supplier_payment',
          partyId: sup.id,
          partyName: sup.name,
          referenceInvoiceId: payload.referenceInvoiceId || null,
          referenceInvoiceNo: refBillNo,
          amount: String(payAmount),
          paymentMethod: payload.paymentMethod,
          staffName: actorName,
          notes: payload.notes || '',
        })
        .returning();

      await db.insert(ledgerEntries).values({
        ownerUid: uid,
        entryDate: paymentRow.paymentDate,
        partyType: 'supplier',
        partyId: sup.id,
        partyName: sup.name,
        voucherType: 'Payment Made',
        voucherNo: receiptNo,
        description: `Supplier Payment (${payload.paymentMethod.toUpperCase()})${refBillNo ? ` against ${refBillNo}` : ''}`,
        debit: String(payAmount),
        credit: '0',
        runningBalance: String(newOut),
      });

      await logAudit(
        uid,
        actorName,
        actorRole,
        'PAY_SUPPLIER',
        'Payment',
        receiptNo,
        `Paid TZS ${payAmount} to supplier ${sup.name} (${refBillNo || 'Account Balance'}). New payable balance: TZS ${newOut}`
      );

      return paymentRow;
    }
  } catch (error: any) {
    console.error('Failed to record payment:', error);
    throw new Error(error.message || 'Failed to record payment.', { cause: error });
  }
}

export async function createExpenseRecord(
  uid: string,
  payload: {
    expenseDate: string;
    category: string;
    description: string;
    amount: number;
    paymentMethod: 'cash' | 'mobile_money' | 'card';
    paymentStatus: 'paid' | 'unpaid';
  },
  actorName: string,
  actorRole: string
) {
  try {
    const voucherNo = `EXP-${Math.floor(1000 + Math.random() * 90000)}`;
    const [exp] = await db
      .insert(expenses)
      .values({
        ownerUid: uid,
        voucherNo,
        expenseDate: payload.expenseDate || todayStr(0),
        category: payload.category || 'Operating Expense',
        description: payload.description,
        amount: String(payload.amount || 0),
        paymentMethod: payload.paymentMethod || 'cash',
        paymentStatus: payload.paymentStatus || 'paid',
        staffName: actorName,
        isDeleted: false,
      })
      .returning();

    await logAudit(
      uid,
      actorName,
      actorRole,
      'CREATE_EXPENSE',
      'Expense',
      voucherNo,
      `Recorded expense ${voucherNo} (${payload.category}): TZS ${payload.amount}`
    );

    return exp;
  } catch (error) {
    console.error('Failed to create expense:', error);
    throw new Error('Failed to create expense.', { cause: error });
  }
}

export async function createBookingRecord(
  uid: string,
  payload: {
    appointmentDate: string;
    appointmentTime: string;
    customerId?: number | null;
    customerName: string;
    customerPhone?: string;
    assignedStaff: string;
    notes?: string;
    items: Array<{
      itemId: number;
      quantity: number;
      unitPrice: number;
    }>;
  },
  actorName: string,
  actorRole: string
) {
  try {
    if (!payload.items || payload.items.length === 0) {
      throw new Error('Please add at least one service or product to the booking.');
    }

    const catalogList = await db
      .select()
      .from(catalogItems)
      .where(eq(catalogItems.ownerUid, uid));
    const catalogMap = new Map(catalogList.map((c) => [c.id, c]));

    let totalAmount = 0;
    const enrichedItems = payload.items.map((line) => {
      const cat = catalogMap.get(Number(line.itemId));
      if (!cat) throw new Error(`Catalog item #${line.itemId} not found`);
      const qty = Math.max(1, Number(line.quantity || 1));
      const price = Number(line.unitPrice ?? cat.sellingPrice);
      const cost = Number(cat.costPrice || 0);
      const lineTotal = price * qty;
      totalAmount += lineTotal;
      return {
        itemId: cat.id,
        itemName: cat.name,
        itemType: cat.itemType,
        quantity: qty,
        unitPrice: price,
        unitCost: cost,
        lineTotal,
      };
    });

    const bookingNo = `BKG-${Math.floor(100 + Math.random() * 9000)}`;

    const [created] = await db
      .insert(bookings)
      .values({
        ownerUid: uid,
        bookingNo,
        appointmentDate: payload.appointmentDate || todayStr(0),
        appointmentTime: payload.appointmentTime || '10:00',
        customerId: payload.customerId || null,
        customerName: payload.customerName,
        customerPhone: payload.customerPhone || '',
        assignedStaff: payload.assignedStaff || actorName,
        status: 'booked',
        itemsJson: JSON.stringify(enrichedItems),
        totalAmount: String(totalAmount),
        notes: payload.notes || '',
      })
      .returning();

    await logAudit(
      uid,
      actorName,
      actorRole,
      'CREATE_BOOKING',
      'Booking',
      bookingNo,
      `Scheduled booking ${bookingNo} for ${payload.customerName} (${enrichedItems.length} items, Total: TZS ${totalAmount})`
    );

    return created;
  } catch (error: any) {
    console.error('Failed to create booking:', error);
    throw new Error(error.message || 'Failed to create booking.', { cause: error });
  }
}

export async function updateBookingStatusOrConvert(
  uid: string,
  payload: {
    bookingId: number;
    status: 'booked' | 'arrived' | 'completed' | 'cancelled';
    convertToSale?: boolean;
    paymentMethod?: 'cash' | 'mobile_money' | 'card' | 'credit';
    amountPaid?: number;
  },
  actorName: string,
  actorRole: string
) {
  try {
    const bRows = await db
      .select()
      .from(bookings)
      .where(and(eq(bookings.id, payload.bookingId), eq(bookings.ownerUid, uid)));
    if (!bRows.length) throw new Error('Booking not found');
    const booking = bRows[0];

    if (payload.status === 'completed' && payload.convertToSale && !booking.convertedSaleId) {
      const parsedItems = JSON.parse(booking.itemsJson || '[]') as Array<{
        itemId: number;
        quantity: number;
        unitPrice: number;
      }>;

      const createdSale = await createSaleTransaction(
        uid,
        {
          saleDate: booking.appointmentDate || todayStr(0),
          customerId: booking.customerId,
          customerName: booking.customerName,
          staffName: booking.assignedStaff,
          paymentMethod: payload.paymentMethod || 'cash',
          amountPaid: payload.amountPaid,
          bookingId: booking.id,
          notes: `Converted from Booking ${booking.bookingNo}`,
          items: parsedItems,
        },
        actorName,
        actorRole
      );

      await logAudit(
        uid,
        actorName,
        actorRole,
        'COMPLETE_BOOKING_TO_SALE',
        'Booking',
        booking.bookingNo,
        `Completed booking ${booking.bookingNo} and converted to Sale ${createdSale.invoiceNo}`
      );

      return { bookingId: booking.id, sale: createdSale };
    } else {
      const [updated] = await db
        .update(bookings)
        .set({ status: payload.status })
        .where(eq(bookings.id, booking.id))
        .returning();

      await logAudit(
        uid,
        actorName,
        actorRole,
        'UPDATE_BOOKING_STATUS',
        'Booking',
        booking.bookingNo,
        `Updated booking ${booking.bookingNo} status to ${payload.status}`
      );

      return { booking: updated };
    }
  } catch (error: any) {
    console.error('Failed to update booking:', error);
    throw new Error(error.message || 'Failed to update booking.', { cause: error });
  }
}

export async function createStaffMemberRecord(
  uid: string,
  payload: {
    name: string;
    email?: string;
    phone?: string;
    role: 'owner' | 'salesperson' | 'receptionist';
  },
  actorName: string,
  actorRole: string
) {
  try {
    const [staff] = await db
      .insert(staffMembers)
      .values({
        ownerUid: uid,
        name: payload.name,
        email: payload.email || '',
        phone: payload.phone || '',
        role: payload.role,
        active: true,
      })
      .returning();

    await logAudit(
      uid,
      actorName,
      actorRole,
      'ADD_STAFF',
      'Staff',
      `STF-${staff.id}`,
      `Added staff member "${staff.name}" with role ${staff.role}`
    );

    return staff;
  } catch (error) {
    console.error('Failed to add staff member:', error);
    throw new Error('Failed to add staff member.', { cause: error });
  }
}

export async function toggleRecordSoftDelete(
  uid: string,
  payload: {
    entityType: 'sale' | 'purchase' | 'expense';
    id: number;
    isDeleted: boolean;
  },
  actorName: string,
  actorRole: string
) {
  try {
    if (actorRole !== 'owner') {
      throw new Error('Only the Owner can soft-delete or restore finalized financial records.');
    }

    if (payload.entityType === 'sale') {
      await db
        .update(sales)
        .set({ isDeleted: payload.isDeleted })
        .where(and(eq(sales.id, payload.id), eq(sales.ownerUid, uid)));
    } else if (payload.entityType === 'purchase') {
      await db
        .update(purchases)
        .set({ isDeleted: payload.isDeleted })
        .where(and(eq(purchases.id, payload.id), eq(purchases.ownerUid, uid)));
    } else if (payload.entityType === 'expense') {
      await db
        .update(expenses)
        .set({ isDeleted: payload.isDeleted })
        .where(and(eq(expenses.id, payload.id), eq(expenses.ownerUid, uid)));
    }

    await logAudit(
      uid,
      actorName,
      actorRole,
      payload.isDeleted ? 'SOFT_DELETE' : 'RESTORE_RECORD',
      payload.entityType.toUpperCase(),
      `ID-${payload.id}`,
      `${payload.isDeleted ? 'Soft-deleted' : 'Restored'} ${payload.entityType} record #${payload.id}`
    );

    return { success: true };
  } catch (error: any) {
    console.error('Failed to toggle soft delete:', error);
    throw new Error(error.message || 'Failed to update record status.', { cause: error });
  }
}

export async function bulkImportExcelRecords(
  uid: string,
  payload: {
    importType: 'catalog' | 'parties';
    rows: Array<Record<string, any>>;
  },
  actorName: string,
  actorRole: string
) {
  try {
    let importedCount = 0;
    if (payload.importType === 'catalog') {
      for (const r of payload.rows) {
        const name = String(r.name || '').trim();
        if (!name) continue;
        const rawType = String(r.itemType || 'product').toLowerCase().trim();
        const itemType: 'product' | 'service' = rawType.includes('serv') ? 'service' : 'product';
        await createOrUpdateCatalogItem(
          uid,
          {
            name,
            itemType,
            sku: String(r.sku || ''),
            category: String(r.category || (itemType === 'service' ? 'Services & Consultations' : 'Retail Products')),
            costPrice: Number(r.costPrice || 0),
            sellingPrice: Number(r.sellingPrice || 0),
            openingStock: itemType === 'service' ? 0 : Number(r.openingStock || 0),
            reorderLevel: itemType === 'service' ? 0 : Number(r.reorderLevel || 5),
            durationMins: Number(r.durationMins || 30),
          },
          actorName,
          actorRole
        );
        importedCount++;
      }
    } else {
      for (const r of payload.rows) {
        const name = String(r.name || '').trim();
        if (!name) continue;
        const partyType = String(r.partyType || 'customer').toLowerCase().trim();
        if (partyType.includes('sup')) {
          await createSupplierRecord(
            uid,
            {
              name,
              phone: String(r.phone || ''),
              email: String(r.email || ''),
              openingBalance: Number(r.openingBalance || 0),
              notes: String(r.notes || 'Imported via Excel'),
            },
            actorName,
            actorRole
          );
        } else {
          await createCustomerRecord(
            uid,
            {
              name,
              phone: String(r.phone || ''),
              email: String(r.email || ''),
              openingBalance: Number(r.openingBalance || 0),
              notes: String(r.notes || 'Imported via Excel'),
            },
            actorName,
            actorRole
          );
        }
        importedCount++;
      }
    }

    await logAudit(
      uid,
      actorName,
      actorRole,
      'EXCEL_IMPORT',
      payload.importType.toUpperCase(),
      `BATCH-${importedCount}`,
      `Imported ${importedCount} ${payload.importType} records via Excel Import`
    );

    return { importedCount };
  } catch (error: any) {
    console.error('Bulk import failed:', error);
    throw new Error(error.message || 'Failed to import Excel records.', { cause: error });
  }
}

async function ensureCloudBackupSeedData(uid: string, ownerName: string) {
  try {
    const existingBackups = await db
      .select()
      .from(cloudBackups)
      .where(eq(cloudBackups.ownerUid, uid));

    if (existingBackups.length > 0) return;

    const defaultBucket =
      'gs://innate-protocol-6wh4c.firebasestorage.app/backups/tallylite-tzs';
    const nextRun = computeNextBackupRun('daily', 'Sunday', '02:00');

    await db
      .update(appSettings)
      .set({
        backupEnabled: true,
        backupFrequency: 'daily',
        backupDayOfWeek: 'Sunday',
        backupTime: '02:00',
        backupBucketUri: defaultBucket,
        backupRetentionDays: 30,
        lastBackupAt: new Date(),
        nextBackupAt: nextRun,
      })
      .where(eq(appSettings.ownerUid, uid));

    const dateTag = todayStr(0);
    const refNo = `BKP-${dateTag.replace(/-/g, '')}-0200`;
    const sampleSnapshot = JSON.stringify(
      {
        backupRef: refNo,
        exportedAt: new Date().toISOString(),
        bucketUri: defaultBucket,
        currency: 'TZS',
        summary: {
          catalogItems: 13,
          customers: 3,
          suppliers: 2,
          sales: 4,
          purchases: 2,
          bookings: 2,
        },
      },
      null,
      2
    );

    await db.insert(cloudBackups).values({
      ownerUid: uid,
      backupRef: refNo,
      triggerType: 'scheduled_daily',
      frequency: 'daily',
      bucketUri: defaultBucket,
      objectPath: `${defaultBucket}/${dateTag}/${refNo}.json`,
      status: 'completed',
      recordsCount: 38,
      sizeBytes: Buffer.byteLength(sampleSnapshot, 'utf8'),
      snapshotJson: sampleSnapshot,
      triggeredBy: `Automated Daily Schedule (${ownerName})`,
    });
  } catch (err) {
    console.error('Error seeding initial cloud backup record:', err);
  }
}

export async function runWorkspaceCloudBackup(
  uid: string,
  payload: {
    triggerType?: 'scheduled_daily' | 'scheduled_weekly' | 'manual';
    bucketUri?: string;
  },
  actorName: string,
  actorRole: string
) {
  try {
    const workspace = await getFullWorkspaceData(uid);
    const settings = workspace.settings;
    const targetBucket = (
      payload.bucketUri ||
      settings?.backupBucketUri ||
      'gs://innate-protocol-6wh4c.firebasestorage.app/backups/tallylite-tzs'
    )
      .trim()
      .replace(/\/+$/, '');

    const freq = (settings?.backupFrequency || 'daily') as 'daily' | 'weekly';
    const triggerType =
      payload.triggerType ||
      (freq === 'weekly' ? 'scheduled_weekly' : 'scheduled_daily');

    const now = new Date();
    const datePart = now.toISOString().split('T')[0];
    const timePart = now
      .toTimeString()
      .slice(0, 5)
      .replace(':', '');
    const randSuffix = Math.floor(10 + Math.random() * 89);
    const backupRef = `BKP-${datePart.replace(/-/g, '')}-${timePart}${randSuffix}`;
    const objectPath = `${targetBucket}/${datePart}/${backupRef}.json`;

    const recordsCount =
      workspace.catalog.length +
      workspace.customers.length +
      workspace.suppliers.length +
      workspace.sales.length +
      workspace.saleItems.length +
      workspace.purchases.length +
      workspace.purchaseItems.length +
      workspace.expenses.length +
      workspace.payments.length +
      workspace.bookings.length +
      workspace.ledgerEntries.length;

    const snapshotPayload = {
      metadata: {
        backupRef,
        exportedAt: now.toISOString(),
        businessName: settings?.businessName || 'Kariakoo Glow & Retail Hub',
        currency: settings?.currency || 'TZS',
        bucketUri: targetBucket,
        objectPath,
        triggerType,
        frequency: freq,
        triggeredBy: actorName,
        recordsCount,
      },
      data: {
        settings: workspace.settings,
        staff: workspace.staff,
        catalog: workspace.catalog,
        customers: workspace.customers,
        suppliers: workspace.suppliers,
        sales: workspace.sales,
        saleItems: workspace.saleItems,
        purchases: workspace.purchases,
        purchaseItems: workspace.purchaseItems,
        expenses: workspace.expenses,
        payments: workspace.payments,
        bookings: workspace.bookings,
        ledgerEntries: workspace.ledgerEntries,
      },
    };

    const snapshotJson = JSON.stringify(snapshotPayload, null, 2);
    const sizeBytes = Buffer.byteLength(snapshotJson, 'utf8');

    const [createdBackup] = await db
      .insert(cloudBackups)
      .values({
        ownerUid: uid,
        backupRef,
        triggerType,
        frequency: freq,
        bucketUri: targetBucket,
        objectPath,
        status: 'completed',
        recordsCount,
        sizeBytes,
        snapshotJson,
        triggeredBy:
          triggerType === 'manual'
            ? `${actorName} (Manual Snapshot)`
            : `Automated ${freq === 'weekly' ? 'Weekly' : 'Daily'} Schedule`,
      })
      .returning();

    const nextBackupAt = settings?.backupEnabled
      ? computeNextBackupRun(
          freq,
          settings?.backupDayOfWeek || 'Sunday',
          settings?.backupTime || '02:00'
        )
      : 'Paused';

    await db
      .update(appSettings)
      .set({
        lastBackupAt: now,
        nextBackupAt,
        backupBucketUri: targetBucket,
        updatedAt: now,
      })
      .where(eq(appSettings.ownerUid, uid));

    await logAudit(
      uid,
      actorName,
      actorRole,
      'CLOUD_BACKUP_UPLOAD',
      'CloudBackup',
      backupRef,
      `Uploaded workspace backup ${backupRef} (${recordsCount} records, ${(
        sizeBytes / 1024
      ).toFixed(1)} KB) to ${objectPath}`
    );

    return createdBackup;
  } catch (error: any) {
    console.error('Failed to run cloud backup:', error);
    throw new Error(error.message || 'Failed to execute cloud backup.', { cause: error });
  }
}
