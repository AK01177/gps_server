const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/safetrack', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Device Schema
const deviceSchema = new mongoose.Schema({
  deviceId: { type: String, unique: true, required: true },
  name: { type: String, required: true },
  lastLocation: {
    latitude: Number,
    longitude: Number,
    timestamp: { type: Date, default: Date.now }
  }
});

const Device = mongoose.model('Device', deviceSchema);

// Routes

// Home route for testing
app.get('/', (req, res) => {
  res.json({ 
    message: "SafeTrack GPS API is running!", 
    status: "active",
    endpoints: {
      "POST /api/location/update": "Update device location",
      "GET /api/location/:deviceId": "Get device location"
    }
  });
});

// Update device location
app.post('/api/location/update', async (req, res) => {
  try {
    const { deviceId, name, latitude, longitude } = req.body;
    
    if (!deviceId || !name || !latitude || !longitude) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const device = await Device.findOneAndUpdate(
      { deviceId },
      {
        deviceId,
        name,
        lastLocation: {
          latitude,
          longitude,
          timestamp: new Date()
        }
      },
      { upsert: true, new: true }
    );

    res.json({ success: true, device });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get device location
app.get('/api/location/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const device = await Device.findOne({ deviceId });
    
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    res.json(device);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Admin login route
app.post('/api/admin/login', (req, res) => {
  const { email, password } = req.body;

  if (
    email === process.env.ADMIN_EMAIL &&
    password === process.env.ADMIN_PASSWORD
  ) {
    return res.json({ success: true });
  }

  res.status(401).json({ success: false, message: 'Invalid credentials' });
});

// Admin fetch all devices
app.get('/api/admin/devices', async (req, res) => {
  const auth = req.headers.authorization;

  if (auth !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const devices = await Device.find();
  res.json(devices);
});
