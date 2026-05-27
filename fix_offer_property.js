import fs from 'fs';
let content = fs.readFileSync('/home/sama/tripinvilla/server/routes/offers.js', 'utf8');

const replacement = `    let property = await Property.findById(property_id);
    if (!property) {
      const { default: PropertyMaster } = await import('../models/PropertyMaster.js');
      const pm = await PropertyMaster.findById(property_id);
      if (pm) {
        property = {
          _id: pm._id,
          name: pm.propertyName,
          location: pm.location,
          type: pm.propertyType,
          rooms: pm.rooms || [],
          amenities: pm.amenityTypes || pm.amenities || [],
          price: pm.propertyPrice || pm.price || 0
        };
      }
    }
    if (!property) return res.status(404).json({ message: 'Property not found' });`;

content = content.replace(
  "const property = await Property.findById(property_id);\n    if (!property) return res.status(404).json({ message: 'Property not found' });",
  replacement
);

fs.writeFileSync('/home/sama/tripinvilla/server/routes/offers.js', content);
console.log('Done');
