import mongoose from 'mongoose';
import CityMaster from '../models/CityMaster.js';
import CountryMaster from '../models/CountryMaster.js';
import StateMaster from '../models/StateMaster.js';
import LocationMaster from '../models/LocationMaster.js';
import PropertyTypeMaster from '../models/PropertyTypeMaster.js';
import RoomTypeMaster from '../models/RoomTypeMaster.js';
import ExperienceMaster from '../models/ExperienceMaster.js';
import AmenitiesMaster from '../models/AmenitiesMaster.js';

export const syncPropertyMasters = async (propertyData) => {
  try {
    // 1. Property Type
    if (propertyData.type && typeof propertyData.type === 'string') {
      const pType = await PropertyTypeMaster.findOne({ name: new RegExp(`^${propertyData.type}$`, 'i') });
      if (!pType) await PropertyTypeMaster.create({ name: propertyData.type });
    }

    // 2. City
    if (propertyData.city && typeof propertyData.city === 'string') {
      const city = await CityMaster.findOne({ cityName: new RegExp(`^${propertyData.city}$`, 'i') });
      if (!city) await CityMaster.create({ cityName: propertyData.city });
    }

    // 3. Location
    if (propertyData.location && typeof propertyData.location === 'string') {
      const loc = await LocationMaster.findOne({ locationName: new RegExp(`^${propertyData.location}$`, 'i') });
      if (!loc) await LocationMaster.create({ locationName: propertyData.location, locationType: 'Area' });
    }

    // 4. State
    if (propertyData.state && typeof propertyData.state === 'string') {
      const state = await StateMaster.findOne({ stateName: new RegExp(`^${propertyData.state}$`, 'i') });
      if (!state) await StateMaster.create({ stateName: propertyData.state });
    }

    // 5. Country
    if (propertyData.country && typeof propertyData.country === 'string') {
      const country = await CountryMaster.findOne({ countryName: new RegExp(`^${propertyData.country}$`, 'i') });
      if (!country) await CountryMaster.create({ countryName: propertyData.country, dialCode: '+91', currencyCode: 'INR', currencySymbol: '₹' });
    }

    // 6. Amenities
    if (Array.isArray(propertyData.amenities)) {
      for (const am of propertyData.amenities) {
        if (!am || typeof am !== 'string') continue;
        const exists = await AmenitiesMaster.findOne({ amenitiesName: new RegExp(`^${am}$`, 'i') });
        if (!exists) await AmenitiesMaster.create({ amenitiesName: am, amenitiesCategory: 'Basic' });
      }
    }

    // 7. Experiences
    if (Array.isArray(propertyData.experiences)) {
      for (const ex of propertyData.experiences) {
        if (!ex || typeof ex !== 'string') continue;
        const exists = await ExperienceMaster.findOne({ experienceName: new RegExp(`^${ex}$`, 'i') });
        if (!exists) await ExperienceMaster.create({ experienceName: ex });
      }
    }
  } catch (err) {
    console.error('Error syncing property masters:', err.message);
  }
};

export const syncRoomMasters = async (roomData) => {
  try {
    // 1. Room Type
    if (roomData.room_type && typeof roomData.room_type === 'string') {
      const rType = await RoomTypeMaster.findOne({ name: new RegExp(`^${roomData.room_type}$`, 'i') });
      if (!rType) await RoomTypeMaster.create({ name: roomData.room_type });
    }

    // 2. Amenities
    if (Array.isArray(roomData.amenities_types)) {
      for (const am of roomData.amenities_types) {
        if (!am || typeof am !== 'string') continue;
        const exists = await AmenitiesMaster.findOne({ amenitiesName: new RegExp(`^${am}$`, 'i') });
        if (!exists) await AmenitiesMaster.create({ amenitiesName: am, amenitiesCategory: 'Basic' });
      }
    }

    // 3. Experiences
    if (Array.isArray(roomData.experiences)) {
      for (const ex of roomData.experiences) {
        if (!ex || typeof ex !== 'string') continue;
        const exists = await ExperienceMaster.findOne({ experienceName: new RegExp(`^${ex}$`, 'i') });
        if (!exists) await ExperienceMaster.create({ experienceName: ex });
      }
    }
  } catch (err) {
    console.error('Error syncing room masters:', err.message);
  }
};
