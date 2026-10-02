import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import * as dotenv from 'dotenv';
import { requireAuth, AuthRequest } from './src/middleware/auth.ts';
import {
  bulkImportExcelRecords,
  createBookingRecord,
  createCustomerRecord,
  createExpenseRecord,
  createOrUpdateCatalogItem,
  createPurchaseTransaction,
  createSaleTransaction,
  createStaffMemberRecord,
  createSupplierRecord,
  getFullWorkspaceData,
  getOrCreateUserAndWorkspace,
  recordPartyPayment,
  runWorkspaceCloudBackup,
  toggleRecordSoftDelete,
  updateBookingStatusOrConvert,
  updateWorkspaceSettings,
} from './src/db/repository.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  const getActorMeta = (req: AuthRequest) => {
    const actorName =
      (req.headers['x-actor-name'] as string) ||
      req.user?.name ||
      req.user?.email?.split('@')[0] ||
      'Owner';
    const actorRole = (req.headers['x-actor-role'] as string) || 'owner';
    return { actorName, actorRole };
  };

  app.get('/api/workspace', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const email = req.user!.email || 'owner@business.co.tz';
      const name = req.user!.name;
      await getOrCreateUserAndWorkspace(uid, email, name);
      const data = await getFullWorkspaceData(uid);
      res.json(data);
    } catch (error: any) {
      console.error('GET /api/workspace error:', error);
      res.status(500).json({ error: error.message || 'Failed to load workspace' });
    }
  });

  app.put('/api/settings', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const { actorName, actorRole } = getActorMeta(req);
      const updated = await updateWorkspaceSettings(uid, req.body, actorName, actorRole);
      const data = await getFullWorkspaceData(uid);
      res.json({ updated, workspace: data });
    } catch (error: any) {
      console.error('PUT /api/settings error:', error);
      res.status(500).json({ error: error.message || 'Failed to update settings' });
    }
  });

  app.post('/api/catalog', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const { actorName, actorRole } = getActorMeta(req);
      const item = await createOrUpdateCatalogItem(uid, req.body, actorName, actorRole);
      const data = await getFullWorkspaceData(uid);
      res.json({ item, workspace: data });
    } catch (error: any) {
      console.error('POST /api/catalog error:', error);
      res.status(500).json({ error: error.message || 'Failed to save catalog item' });
    }
  });

  app.post('/api/customers', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const { actorName, actorRole } = getActorMeta(req);
      const customer = await createCustomerRecord(uid, req.body, actorName, actorRole);
      const data = await getFullWorkspaceData(uid);
      res.json({ customer, workspace: data });
    } catch (error: any) {
      console.error('POST /api/customers error:', error);
      res.status(500).json({ error: error.message || 'Failed to create customer' });
    }
  });

  app.post('/api/suppliers', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const { actorName, actorRole } = getActorMeta(req);
      const supplier = await createSupplierRecord(uid, req.body, actorName, actorRole);
      const data = await getFullWorkspaceData(uid);
      res.json({ supplier, workspace: data });
    } catch (error: any) {
      console.error('POST /api/suppliers error:', error);
      res.status(500).json({ error: error.message || 'Failed to create supplier' });
    }
  });

  app.post('/api/sales', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const { actorName, actorRole } = getActorMeta(req);
      const sale = await createSaleTransaction(uid, req.body, actorName, actorRole);
      const data = await getFullWorkspaceData(uid);
      res.json({ sale, workspace: data });
    } catch (error: any) {
      console.error('POST /api/sales error:', error);
      res.status(400).json({ error: error.message || 'Failed to record sale' });
    }
  });

  app.post('/api/purchases', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const { actorName, actorRole } = getActorMeta(req);
      const purchase = await createPurchaseTransaction(uid, req.body, actorName, actorRole);
      const data = await getFullWorkspaceData(uid);
      res.json({ purchase, workspace: data });
    } catch (error: any) {
      console.error('POST /api/purchases error:', error);
      res.status(400).json({ error: error.message || 'Failed to record purchase' });
    }
  });

  app.post('/api/payments', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const { actorName, actorRole } = getActorMeta(req);
      const payment = await recordPartyPayment(uid, req.body, actorName, actorRole);
      const data = await getFullWorkspaceData(uid);
      res.json({ payment, workspace: data });
    } catch (error: any) {
      console.error('POST /api/payments error:', error);
      res.status(400).json({ error: error.message || 'Failed to record payment' });
    }
  });

  app.post('/api/expenses', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const { actorName, actorRole } = getActorMeta(req);
      const expense = await createExpenseRecord(uid, req.body, actorName, actorRole);
      const data = await getFullWorkspaceData(uid);
      res.json({ expense, workspace: data });
    } catch (error: any) {
      console.error('POST /api/expenses error:', error);
      res.status(400).json({ error: error.message || 'Failed to record expense' });
    }
  });

  app.post('/api/bookings', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const { actorName, actorRole } = getActorMeta(req);
      const booking = await createBookingRecord(uid, req.body, actorName, actorRole);
      const data = await getFullWorkspaceData(uid);
      res.json({ booking, workspace: data });
    } catch (error: any) {
      console.error('POST /api/bookings error:', error);
      res.status(400).json({ error: error.message || 'Failed to create booking' });
    }
  });

  app.put('/api/bookings/:id/status', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const { actorName, actorRole } = getActorMeta(req);
      const bookingId = Number(req.params.id);
      const result = await updateBookingStatusOrConvert(
        uid,
        {
          bookingId,
          ...req.body,
        },
        actorName,
        actorRole
      );
      const data = await getFullWorkspaceData(uid);
      res.json({ ...result, workspace: data });
    } catch (error: any) {
      console.error('PUT /api/bookings/:id/status error:', error);
      res.status(400).json({ error: error.message || 'Failed to update booking' });
    }
  });

  app.post('/api/staff', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const { actorName, actorRole } = getActorMeta(req);
      const staff = await createStaffMemberRecord(uid, req.body, actorName, actorRole);
      const data = await getFullWorkspaceData(uid);
      res.json({ staff, workspace: data });
    } catch (error: any) {
      console.error('POST /api/staff error:', error);
      res.status(400).json({ error: error.message || 'Failed to add staff member' });
    }
  });

  app.post('/api/records/soft-delete', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const { actorName, actorRole } = getActorMeta(req);
      await toggleRecordSoftDelete(uid, req.body, actorName, actorRole);
      const data = await getFullWorkspaceData(uid);
      res.json({ workspace: data });
    } catch (error: any) {
      console.error('POST /api/records/soft-delete error:', error);
      res.status(403).json({ error: error.message || 'Operation not permitted' });
    }
  });

  app.post('/api/import', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const { actorName, actorRole } = getActorMeta(req);
      const result = await bulkImportExcelRecords(uid, req.body, actorName, actorRole);
      const data = await getFullWorkspaceData(uid);
      res.json({ ...result, workspace: data });
    } catch (error: any) {
      console.error('POST /api/import error:', error);
      res.status(400).json({ error: error.message || 'Failed to import Excel records' });
    }
  });

  app.post('/api/backups/run', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const { actorName, actorRole } = getActorMeta(req);
      const backup = await runWorkspaceCloudBackup(uid, req.body || {}, actorName, actorRole);
      const data = await getFullWorkspaceData(uid);
      res.json({ backup, workspace: data });
    } catch (error: any) {
      console.error('POST /api/backups/run error:', error);
      res.status(400).json({ error: error.message || 'Failed to run cloud backup' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`TallyLite TZS Server running on http://localhost:${PORT}`);
  });
}

startServer();
