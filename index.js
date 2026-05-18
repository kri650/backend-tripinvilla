import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175'
];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection
import { seedDatabase } from './utils/seeder.js';

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/tripinvilla', {
  serverSelectionTimeoutMS: 1000,
  bufferCommands: false
})
  .then(() => {
    console.log('✅ MongoDB connected');
    seedDatabase().catch(err => console.error('❌ Seeding error:', err));
  })
  .catch(err => console.error('❌ MongoDB error (running in mock mode):', err.message));

// Routes
import authRoutes from './routes/auth.js';
import propertyRoutes from './routes/properties.js';
import enquiryRoutes from './routes/enquiries.js';
import dashboardRoutes from './routes/dashboard.js';
import ownerDashboardRouter from './routes/ownerDashboard.js';
import propertyRequestRoutes from './routes/propertyRequests.js';
import cityRoutes from './routes/cities.js';
import ownerRoutes from './routes/owners.js';
import offerRoutes from './routes/offers.js';
import userRoutes from './routes/users.js';
import bookingRoutes from './routes/bookings.js';
import propertyMasterRoutes from './routes/master/properties.js';
import countryMasterRoutes from './routes/master/countries.js';
import stateMasterRoutes from './routes/master/states.js';
import cityMasterRoutes from './routes/master/cities.js';
import locationMasterRoutes from './routes/master/locations.js';
import destinationMasterRoutes from './routes/master/destinations.js';
import experienceMasterRoutes from './routes/master/experiences.js';
import amenitiesMasterRoutes from './routes/master/amenities.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
app.use('/uploads', express.static(join(__dirname, 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/enquiries', enquiryRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/owner-dashboard', ownerDashboardRouter);
app.use('/api/property-requests', propertyRequestRoutes);
app.use('/api/cities', cityRoutes);
app.use('/api/owners', ownerRoutes);
app.use('/api/offers', offerRoutes);
app.use('/api/users', userRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/master/properties', propertyMasterRoutes);
app.use('/api/master/countries', countryMasterRoutes);
app.use('/api/master/states', stateMasterRoutes);
app.use('/api/master/cities', cityMasterRoutes);
app.use('/api/master/locations', locationMasterRoutes);
app.use('/api/masters/destinations', destinationMasterRoutes);
app.use('/api/masters/experiences', experienceMasterRoutes);
app.use('/api/masters/amenities', amenitiesMasterRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
