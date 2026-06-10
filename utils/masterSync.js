import mongoose from 'mongoose';
import CityMaster from '../models/CityMaster.js';
import CountryMaster from '../models/CountryMaster.js';
import StateMaster from '../models/StateMaster.js';
import LocationMaster from '../models/LocationMaster.js';
import PropertyTypeMaster from '../models/PropertyTypeMaster.js';
import RoomTypeMaster from '../models/RoomTypeMaster.js';
import ExperienceMaster from '../models/ExperienceMaster.js';
import AmenitiesMaster from '../models/AmenitiesMaster.js';
import Property from '../models/Property.js';

// Normalize to Title Case: "villa" -> "Villa", "HOMESTAY" -> "Homestay"
const toTitleCase = (str) => {
  if (!str || typeof str !== 'string') return str;
  return str.trim().charAt(0).toUpperCase() + str.trim().slice(1).toLowerCase();
};

// Fully capitalize each word: "super deluxe" -> "Super Deluxe"
const toTitleCaseWords = (str) => {
  if (!str || typeof str !== 'string') return str;
  return str.trim().split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
};

export const syncPropertyMasters = async (propertyData) => {
  try {
    // 1. Property Type — always store in Title Case
    if (propertyData.type && typeof propertyData.type === 'string') {
      const normalizedType = toTitleCase(propertyData.type);
      const pType = await PropertyTypeMaster.findOne({ name: new RegExp(`^${normalizedType}$`, 'i') });
      if (!pType) {
        await PropertyTypeMaster.create({ name: normalizedType });
      } else if (pType.name !== normalizedType) {
        // Fix casing in existing record
        pType.name = normalizedType;
        await pType.save();
      }
    }

    // 2. City
    if (propertyData.city && typeof propertyData.city === 'string') {
      const normalizedCity = toTitleCaseWords(propertyData.city);
      const city = await CityMaster.findOne({ cityName: new RegExp(`^${normalizedCity}$`, 'i') });
      if (!city) await CityMaster.create({ cityName: normalizedCity });
    }

    // 3. Location
    if (propertyData.location && typeof propertyData.location === 'string') {
      const loc = await LocationMaster.findOne({ locationName: new RegExp(`^${propertyData.location}$`, 'i') });
      if (!loc) await LocationMaster.create({ locationName: propertyData.location, locationType: 'Area' });
    }

    // 4. State
    if (propertyData.state && typeof propertyData.state === 'string') {
      const normalizedState = toTitleCaseWords(propertyData.state);
      const state = await StateMaster.findOne({ stateName: new RegExp(`^${normalizedState}$`, 'i') });
      if (!state) await StateMaster.create({ stateName: normalizedState });
    }

    // 5. Country
    if (propertyData.country && typeof propertyData.country === 'string') {
      const normalizedCountry = toTitleCaseWords(propertyData.country);
      const country = await CountryMaster.findOne({ countryName: new RegExp(`^${normalizedCountry}$`, 'i') });
      if (!country) await CountryMaster.create({ countryName: normalizedCountry, dialCode: '+91', currencyCode: 'INR', currencySymbol: '₹' });
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
        if (!ex) continue;
        const exStr = String(ex).trim();
        if (!exStr || /^[0-9a-fA-F]{24}$/.test(exStr)) continue; // Robust skip for MongoDB ObjectIds
        const exists = await ExperienceMaster.findOne({ experienceName: new RegExp(`^${exStr}$`, 'i') });
        if (!exists) await ExperienceMaster.create({ experienceName: exStr });
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
        if (/^[0-9a-fA-F]{24}$/.test(ex)) continue; // Skip MongoDB ObjectIds
        const exists = await ExperienceMaster.findOne({ experienceName: new RegExp(`^${ex}$`, 'i') });
        if (!exists) await ExperienceMaster.create({ experienceName: ex });
      }
    }
  } catch (err) {
    console.error('Error syncing room masters:', err.message);
  }
};

// One-time cleanup: merges duplicate property types and fixes casing on all properties
export const cleanupPropertyTypeDuplicates = async () => {
  try {
    console.log('[Cleanup] Starting property type deduplication...');
    const allTypes = await PropertyTypeMaster.find({});

    // Group by lowercase name
    const groups = new Map();
    for (const t of allTypes) {
      const key = (t.name || '').trim().toLowerCase();
      if (!key) continue;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(t);
    }

    for (const [key, group] of groups.entries()) {
      // Canonical = first uppercase-starting, or toTitleCase of the key
      const canonical = group.find(t => /^[A-Z]/.test(t.name)) || group[0];
      const canonicalName = canonical.name.trim().charAt(0).toUpperCase() + canonical.name.trim().slice(1);

      // Fix the canonical record's casing
      if (canonical.name !== canonicalName) {
        canonical.name = canonicalName;
        await canonical.save();
      }

      // Delete duplicates
      const dupes = group.filter(t => t._id.toString() !== canonical._id.toString());
      for (const dupe of dupes) {
        console.log(`[Cleanup] Removing duplicate: "${dupe.name}" (keeping "${canonicalName}")`);
        await PropertyTypeMaster.findByIdAndDelete(dupe._id);
      }

      // Fix all properties that have non-canonical casing
      await Property.updateMany(
        { type: { $regex: new RegExp(`^${key}$`, 'i'), $ne: canonicalName } },
        { $set: { type: canonicalName } }
      );
    }

    console.log('[Cleanup] Property type deduplication complete.');
  } catch (err) {
    console.error('[Cleanup] Error deduplicating property types:', err.message);
  }
};
