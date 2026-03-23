import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();

import authRoutes from './routes/auth.js';
import organizationsRoutes from './routes/organizations.js';
import clientsRoutes from './routes/clients.js';
import sectorsRoutes from './routes/sectors.js';
import equipmentsRoutes from './routes/equipments.js';
import serviceOrdersRoutes from './routes/service-orders.js';
import usersRoutes from './routes/users.js';
import asaasRoutes from './routes/asaas.js';
import uploadRoutes from './routes/upload.js';
import catalogRoutes from './routes/catalog.js';
import ordersRoutes from './routes/orders.js';

const app = express();
const PORT = process.env.PORT || 3333;



// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads', 'logos');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Health check
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/organizations', organizationsRoutes);
app.use('/api/clients', clientsRoutes);
app.use('/api/sectors', sectorsRoutes);
app.use('/api/equipments', equipmentsRoutes);
app.use('/api/service-orders', serviceOrdersRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/asaas', asaasRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/catalog', catalogRoutes);
app.use('/api/orders', ordersRoutes);

// Global error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
});

app.listen(PORT, () => {
    console.log(`🚀 MaintQR API running on port ${PORT}`);
    console.log(`📁 Uploads served from /uploads`);
});

export default app;
