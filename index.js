import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://13.127.196.228:5174',
  'http://13.127.196.228:5173',
  'http://13.127.196.228:8000',
  'http://13.127.196.228',
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
  serverSelectionTimeoutMS: 5000,
  bufferCommands: false
})
  .then(() => {
    console.log('✅ MongoDB connected');
    const shouldSeed =
      process.env.SEED_DB === 'true' ||
      (process.env.NODE_ENV === 'development' && process.env.SEED_DB !== 'false');
    if (shouldSeed) {
      seedDatabase().catch(err => console.error('❌ Seeding error:', err));
    }
  })
  .catch(err => {
    console.error('❌ MongoDB connection failed:', err.message);
    console.error('➡️  Start MongoDB locally (27017) or set MONGO_URI in server/.env');
    console.error('➡️  If using Docker: docker compose up -d');
    console.error('➡️  Health check: GET http://localhost:5000/api/health');
  });

// Routes
import authRoutes from './routes/auth.js';
import propertyRoutes from './routes/properties.js';
import enquiryRoutes from './routes/enquiries.js';
import reviewsRouter from './routes/reviews.js';
import dashboardRoutes from './routes/dashboard.js';
import ownerDashboardRouter from './routes/ownerDashboard.js';
import propertyRequestRoutes from './routes/propertyRequests.js';
import cityRoutes from './routes/cities.js';
import ownerRoutes from './routes/owners.js';
import contentRoutes from './routes/content.js';
import offerRoutes from './routes/offers.js';
import userRoutes from './routes/users.js';
import bookingRoutes from './routes/bookings.js';
import propertyMasterRoutes from './routes/master/properties.js';
import propertyTypeMasterRoutes from './routes/master/propertyTypes.js';
import countryMasterRoutes from './routes/master/countries.js';
import stateMasterRoutes from './routes/master/states.js';
import cityMasterRoutes from './routes/master/cities.js';
import locationMasterRoutes from './routes/master/locations.js';
import landmarkMasterRoutes from './routes/master/landmarks.js';
import destinationMasterRoutes from './routes/master/destinations.js';
import experienceMasterRoutes from './routes/master/experiences.js';
import amenitiesMasterRoutes from './routes/master/amenities.js';
import pricingRuleRoutes from './routes/pricingRules.js';
import subscriptionRoutes from './routes/subscription.js';
import searchRoutes from './routes/searchRoutes.js';
import supportVideoRoutes from './routes/supportVideos.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
app.use('/uploads', express.static(join(__dirname, 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/enquiries', enquiryRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/owner-dashboard', ownerDashboardRouter);
app.use('/api/property-requests', propertyRequestRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/cities', cityRoutes);
app.use('/api/owners', ownerRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/offers', offerRoutes);
app.use('/api/users', userRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/master/properties', propertyMasterRoutes);
app.use('/api/master/property-types', propertyTypeMasterRoutes);
app.use('/api/admin/properties', propertyMasterRoutes);
app.use('/api/admin/countries', countryMasterRoutes);
app.use('/api/master/countries', countryMasterRoutes);
app.use('/api/admin/states', stateMasterRoutes);
app.use('/api/master/states', stateMasterRoutes);
app.use('/api/admin/cities', cityMasterRoutes);
app.use('/api/master/cities', cityMasterRoutes);
app.use('/api/admin/locations', locationMasterRoutes);
app.use('/api/admin/landmarks', landmarkMasterRoutes);
app.use('/api/master/locations', locationMasterRoutes);
app.use('/api/reviews', reviewsRouter);
// Back-compat aliases (some clients use /api/master/*)
app.use('/api/master/destinations', destinationMasterRoutes);
app.use('/api/master/experiences', experienceMasterRoutes);
app.use('/api/admin/amenities', amenitiesMasterRoutes);
app.use('/api/master/landmarks', landmarkMasterRoutes);
app.use('/api/master/amenities', amenitiesMasterRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/masters/countries', countryMasterRoutes);
app.use('/api/masters/states', stateMasterRoutes);
app.use('/api/masters/cities', cityMasterRoutes);
app.use('/api/masters/locations', locationMasterRoutes);
app.use('/api/masters/destinations', destinationMasterRoutes);
app.use('/api/masters/experiences', experienceMasterRoutes);
app.use('/api/admin/experiences', experienceMasterRoutes);
app.use('/api/pricing-rules', pricingRuleRoutes);
app.use('/api/support-videos', supportVideoRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(err.status || 500).json({ 
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
