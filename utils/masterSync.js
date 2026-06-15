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
import PropertyMaster from '../models/PropertyMaster.js';

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

    // A. Country First
    let countryObj = null;
    let countryIdVal = propertyData.countryId;
    if (propertyData.country && typeof propertyData.country === 'string') {
      const normalizedCountry = toTitleCaseWords(propertyData.country);
      countryObj = await CountryMaster.findOne({ countryName: new RegExp(`^${normalizedCountry}$`, 'i') });
      if (!countryObj) {
        countryObj = await CountryMaster.create({ 
          countryName: normalizedCountry, 
          dialCode: '-', 
          currencyCode: '-', 
          currencySymbol: '-' 
        });
      }
      countryIdVal = countryObj._id;
    } else if (countryIdVal) {
      countryObj = await CountryMaster.findById(countryIdVal);
    }

    // B. State Second
    let stateObj = null;
    let stateIdVal = propertyData.stateId;
    if (propertyData.state && typeof propertyData.state === 'string') {
      const normalizedState = toTitleCaseWords(propertyData.state);
      stateObj = await StateMaster.findOne({ stateName: new RegExp(`^${normalizedState}$`, 'i') });
      if (!stateObj) {
        stateObj = await StateMaster.create({ 
          stateName: normalizedState,
          countryId: countryIdVal || undefined
        });
      } else {
        if (countryIdVal && String(stateObj.countryId) !== String(countryIdVal)) {
          stateObj.countryId = countryIdVal;
          await stateObj.save();
        }
      }
      stateIdVal = stateObj._id;
    } else if (stateIdVal) {
      stateObj = await StateMaster.findById(stateIdVal);
      if (stateObj && countryIdVal && String(stateObj.countryId) !== String(countryIdVal)) {
        stateObj.countryId = countryIdVal;
        await stateObj.save();
      }
    }

    // C. City Third
    let cityObj = null;
    let cityIdVal = propertyData.cityId;
    if (propertyData.city && typeof propertyData.city === 'string') {
      const normalizedCity = toTitleCaseWords(propertyData.city);
      const query = { cityName: new RegExp(`^${normalizedCity}$`, 'i') };
      if (stateIdVal) {
        query.stateId = stateIdVal;
      }
      cityObj = await CityMaster.findOne(query);
      if (!cityObj) {
        cityObj = await CityMaster.create({ 
          cityName: normalizedCity,
          stateId: stateIdVal || undefined,
          countryId: countryIdVal || undefined
        });
      } else {
        let updated = false;
        if (stateIdVal && String(cityObj.stateId) !== String(stateIdVal)) {
          cityObj.stateId = stateIdVal;
          updated = true;
        }
        if (countryIdVal && String(cityObj.countryId) !== String(countryIdVal)) {
          cityObj.countryId = countryIdVal;
          updated = true;
        }
        if (updated) await cityObj.save();
      }
      cityIdVal = cityObj._id;
    } else if (cityIdVal) {
      cityObj = await CityMaster.findById(cityIdVal);
      if (cityObj) {
        let updated = false;
        if (stateIdVal && String(cityObj.stateId) !== String(stateIdVal)) {
          cityObj.stateId = stateIdVal;
          updated = true;
        }
        if (countryIdVal && String(cityObj.countryId) !== String(countryIdVal)) {
          cityObj.countryId = countryIdVal;
          updated = true;
        }
        if (updated) await cityObj.save();
      }
    }

    // D. Location (Area) Fourth
    let locObj = null;
    let locationIdVal = propertyData.locationId;

    const hierarchyParts = [];
    if (cityObj) hierarchyParts.push(cityObj.cityName);
    if (stateObj) hierarchyParts.push(stateObj.stateName);
    if (countryObj) hierarchyParts.push(countryObj.countryName);
    const parentLocationStr = hierarchyParts.join(' → ');

    const mappedLandmarks = Array.isArray(propertyData.landmarks) 
      ? propertyData.landmarks.map(lm => ({
          name: lm.landmark_name || lm.name || 'Unknown Landmark',
          popularity: lm.landmark_type || lm.type || 'Tourist Popular',
          images: lm.landmark_image_url || lm.image || lm.img ? [lm.landmark_image_url || lm.image || lm.img] : []
        }))
      : [];

    if (propertyData.location && typeof propertyData.location === 'string') {
      const locName = propertyData.location;
      const query = { locationName: new RegExp(`^${locName}$`, 'i') };
      if (parentLocationStr) {
        query.parentLocation = new RegExp(`^${parentLocationStr}$`, 'i');
      }
      locObj = await LocationMaster.findOne(query);
      
      if (!locObj) {
        locObj = await LocationMaster.create({ 
          locationName: locName, 
          locationType: 'Area',
          parentLocation: parentLocationStr || undefined,
          landmarks: mappedLandmarks
        });
      } else {
        let updated = false;
        if (parentLocationStr && locObj.parentLocation !== parentLocationStr) {
          locObj.parentLocation = parentLocationStr;
          updated = true;
        }
        if (mappedLandmarks.length > 0) {
          const existingNames = locObj.landmarks.map(l => (l.name || '').toLowerCase());
          for (const newLm of mappedLandmarks) {
            if (!existingNames.includes(newLm.name.toLowerCase())) {
              locObj.landmarks.push(newLm);
              existingNames.push(newLm.name.toLowerCase());
              updated = true;
            }
          }
        }
        if (updated) await locObj.save();
      }
      locationIdVal = locObj._id;
    } else if (locationIdVal) {
      locObj = await LocationMaster.findById(locationIdVal);
      if (locObj) {
        let updated = false;
        if (parentLocationStr && locObj.parentLocation !== parentLocationStr) {
          locObj.parentLocation = parentLocationStr;
          updated = true;
        }
        if (mappedLandmarks.length > 0) {
          const existingNames = locObj.landmarks.map(l => (l.name || '').toLowerCase());
          for (const newLm of mappedLandmarks) {
            if (!existingNames.includes(newLm.name.toLowerCase())) {
              locObj.landmarks.push(newLm);
              existingNames.push(newLm.name.toLowerCase());
              updated = true;
            }
          }
        }
        if (updated) await locObj.save();
      }
    }

    // E. Save relation IDs back to propertyData object to support upstream route creations
    if (countryIdVal) propertyData.countryId = countryIdVal;
    if (stateIdVal) propertyData.stateId = stateIdVal;
    if (cityIdVal) propertyData.cityId = cityIdVal;
    if (locationIdVal) propertyData.locationId = locationIdVal;
    if (countryObj) propertyData.countryName = countryObj.countryName;
    if (stateObj) propertyData.stateName = stateObj.stateName;
    if (cityObj) propertyData.cityName = cityObj.cityName;
    if (locObj) propertyData.locationName = locObj.locationName;

    // F. Direct DB Update for Property and PropertyMaster documents to ensure robustness
    const updates = {};
    if (countryIdVal) {
      updates.countryId = countryIdVal;
      if (countryObj) updates.countryName = countryObj.countryName;
    }
    if (stateIdVal) {
      updates.stateId = stateIdVal;
      if (stateObj) updates.stateName = stateObj.stateName;
    }
    if (cityIdVal) {
      updates.cityId = cityIdVal;
      if (cityObj) updates.cityName = cityObj.cityName;
    }
    if (locationIdVal) {
      updates.locationId = locationIdVal;
      if (locObj) updates.locationName = locObj.locationName;
    }

    if (Object.keys(updates).length > 0) {
      if (propertyData._id && mongoose.isValidObjectId(propertyData._id)) {
        await Property.findByIdAndUpdate(propertyData._id, updates);
        await PropertyMaster.findByIdAndUpdate(propertyData._id, updates);
      }
      if (propertyData.propertyNo) {
        await Property.findOneAndUpdate({ propertyNo: propertyData.propertyNo }, updates);
        await PropertyMaster.findOneAndUpdate({ propertyNo: propertyData.propertyNo }, updates);
      }
      const propName = propertyData.name || propertyData.propertyName;
      if (propName) {
        await Property.findOneAndUpdate({ name: propName }, updates);
        await PropertyMaster.findOneAndUpdate({ propertyName: propName }, updates);
      }
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
