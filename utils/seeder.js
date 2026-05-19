import User from '../models/User.js';
import Property from '../models/Property.js';
import Enquiry from '../models/Enquiry.js';
import Offer from '../models/Offer.js';
import Booking from '../models/Booking.js';

export const seedDatabase = async () => {
  try {
    // 0. Super Admin
    let superAdmin = await User.findOne({ email: 'admin@tripinvilla.com' });
    if (!superAdmin) {
      superAdmin = await User.create({
        name: 'TripInVilla Admin',
        email: 'admin@tripinvilla.com',
        password: 'admin12345',
        role: 'super_admin',
        phone: '+91 90000 00000',
        status: 'Active'
      });
      console.log('✅ Super Admin seeded: admin@tripinvilla.com / admin12345');
    }

    // 1. Owner
    let owner = await User.findOne({ email: 'navin@gmail.com' });
    if (!owner) {
      owner = await User.create({
        name: 'Navin Kumar',
        email: 'navin@gmail.com',
        password: 'password123',
        role: 'owner',
        phone: '+91 99887 76543',
        status: 'Active'
      });
      console.log('✅ Owner seeded: navin@gmail.com / password123');
    }

    // 2. Test User
    let testUser = await User.findOne({ email: 'rohan.sharma@gmail.com' });
    if (!testUser) {
      testUser = await User.create({
        name: 'Rohan Sharma',
        email: 'rohan.sharma@gmail.com',
        password: 'password123',
        role: 'user',
        phone: '+91 98765 43210',
        status: 'Active'
      });
      console.log('✅ Test User seeded: rohan.sharma@gmail.com / password123');
    }

    // 3. Properties
    const propertyCount = await Property.countDocuments();
    if (propertyCount === 0) {
      const mockProps = [
        {
          propertyNo: 'PR-1001',
          name: 'Kasol Himalayan Retreat',
          type: 'Homestay',
          location: 'Kasol, Himachal Pradesh, India',
          city: 'Kasol',
          state: 'Himachal Pradesh',
          price: 2800,
          bedRooms: 3,
          capacity: 6,
          amenities: ['WiFi', 'Barbeque', 'Mountain View', 'Parking', 'Hot Water'],
          images: ['https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&auto=format&fit=crop&q=60'],
          description: 'A serene mountain retreat in the heart of Kasol. Wake up to stunning Parvati Valley views, trek to Kheerganga, and enjoy bonfire evenings. Perfect for solo travelers, couples, and small groups.',
          rating: 4.8,
          totalBookings: 24,
          status: 'Active',
          owner: owner._id
        },
        {
          propertyNo: 'PR-1002',
          name: 'Parvati Valley Wooden Cottage',
          type: 'Cottage',
          location: 'Kasol, Himachal Pradesh, India',
          city: 'Kasol',
          state: 'Himachal Pradesh',
          price: 1800,
          bedRooms: 2,
          capacity: 4,
          amenities: ['WiFi', 'River View', 'Bonfire', 'Hot Water'],
          images: ['https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=600&auto=format&fit=crop&q=60'],
          description: 'Cozy wooden cottage overlooking the Parvati River in Kasol. Ideal for couples and small families who want an authentic Himalayan experience.',
          rating: 4.7,
          totalBookings: 18,
          status: 'Active',
          owner: owner._id
        },
        {
          propertyNo: 'PR-1003',
          name: 'Whispering Palms Villa',
          type: 'Villa',
          location: 'Calangute, Goa, India',
          city: 'Goa',
          state: 'Goa',
          price: 12500,
          bedRooms: 4,
          capacity: 8,
          amenities: ['Private Pool', 'WiFi', 'Beach Access', 'AC', 'Chef on Request'],
          images: ['https://images.unsplash.com/photo-1580587722351-9d9b788c0784?w=600&auto=format&fit=crop&q=60'],
          description: 'Luxurious 4-bedroom beachside villa in Goa with a private infinity pool, lush tropical gardens, and direct beach access. Perfect for families and groups.',
          rating: 4.9,
          totalBookings: 42,
          status: 'Active',
          owner: owner._id
        },
        {
          propertyNo: 'PR-1004',
          name: 'Anjuna Beach Homestay',
          type: 'Homestay',
          location: 'Anjuna, Goa, India',
          city: 'Goa',
          state: 'Goa',
          price: 3200,
          bedRooms: 2,
          capacity: 4,
          amenities: ['WiFi', 'AC', 'Beach Nearby', 'Breakfast'],
          images: ['https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=600&auto=format&fit=crop&q=60'],
          description: 'Charming homestay 5 minutes from Anjuna Beach. Clean, comfortable, and perfectly located near flea markets and vibrant nightlife.',
          rating: 4.6,
          totalBookings: 31,
          status: 'Active',
          owner: owner._id
        },
        {
          propertyNo: 'PR-1005',
          name: 'Snow Valley Homestay',
          type: 'Homestay',
          location: 'Manali, Himachal Pradesh, India',
          city: 'Manali',
          state: 'Himachal Pradesh',
          price: 2200,
          bedRooms: 3,
          capacity: 6,
          amenities: ['WiFi', 'Mountain View', 'Bonfire', 'Hot Water', 'Parking'],
          images: ['https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&auto=format&fit=crop&q=60'],
          description: 'Escape to the peaceful hills of Manali. Perfect for travelers seeking a quiet retreat with spectacular Himalayan views, home-cooked food, and warm hospitality.',
          rating: 4.8,
          totalBookings: 29,
          status: 'Active',
          owner: owner._id
        },
        {
          propertyNo: 'PR-1006',
          name: 'Royal Palm Lake Resort',
          type: 'Resort',
          location: 'Udaipur, Rajasthan, India',
          city: 'Udaipur',
          state: 'Rajasthan',
          price: 8500,
          bedRooms: 12,
          capacity: 24,
          amenities: ['Pool', 'Spa', 'Restaurant', 'Lake View', 'AC', 'WiFi'],
          images: ['https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&auto=format&fit=crop&q=60'],
          description: 'Heritage luxury resort near the iconic Pichola Lake in Udaipur. Palatial rooms, fine dining, rooftop pool with lake views, and genuine Rajasthani hospitality.',
          rating: 4.7,
          totalBookings: 55,
          status: 'Active',
          owner: owner._id
        },
        {
          propertyNo: 'PR-1007',
          name: 'Jaipur Haveli Heritage Stay',
          type: 'Villa',
          location: 'Jaipur, Rajasthan, India',
          city: 'Jaipur',
          state: 'Rajasthan',
          price: 6500,
          bedRooms: 6,
          capacity: 12,
          amenities: ['Pool', 'Heritage Architecture', 'WiFi', 'AC', 'Guided Tours'],
          images: ['https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=600&auto=format&fit=crop&q=60'],
          description: 'Experience royal Rajasthani living in this stunning 18th-century restored haveli in the Pink City. Antique furniture, courtyard gardens, and personalized butler service.',
          rating: 4.9,
          totalBookings: 38,
          status: 'Active',
          owner: owner._id
        },
        {
          propertyNo: 'PR-1008',
          name: 'Shimla Pine Wood Cottage',
          type: 'Cottage',
          location: 'Shimla, Himachal Pradesh, India',
          city: 'Shimla',
          state: 'Himachal Pradesh',
          price: 3500,
          bedRooms: 3,
          capacity: 6,
          amenities: ['WiFi', 'Fireplace', 'Mountain View', 'Hot Water', 'Balcony'],
          images: ['https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=600&auto=format&fit=crop&q=60'],
          description: 'A charming pine-wood cottage in the hills of Shimla with a cozy fireplace and panoramic valley views. Perfect for a romantic getaway or family vacation.',
          rating: 4.8,
          totalBookings: 22,
          status: 'Active',
          owner: owner._id
        },
        {
          propertyNo: 'PR-1009',
          name: 'Munnar Tea Garden Homestay',
          type: 'Homestay',
          location: 'Munnar, Kerala, India',
          city: 'Munnar',
          state: 'Kerala',
          price: 2500,
          bedRooms: 2,
          capacity: 4,
          amenities: ['Tea Plantation View', 'Trekking', 'WiFi', 'Breakfast'],
          images: ['https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=600&auto=format&fit=crop&q=60'],
          description: 'Nestled inside a working tea garden in Munnar, this cozy homestay offers breathtaking misty valley views, guided tea-tasting tours, and local Kerala cuisine.',
          rating: 4.7,
          totalBookings: 16,
          status: 'Active',
          owner: owner._id
        },
        {
          propertyNo: 'PR-1010',
          name: 'Coorg Forest Lodge',
          type: 'Cottage',
          location: 'Coorg, Karnataka, India',
          city: 'Coorg',
          state: 'Karnataka',
          price: 4200,
          bedRooms: 4,
          capacity: 8,
          amenities: ['Rainforest View', 'Trekking', 'Pool', 'WiFi', 'Bonfire'],
          images: ['https://images.unsplash.com/photo-1449034446853-66c86144b0ad?w=600&auto=format&fit=crop&q=60'],
          description: 'A stunning rainforest lodge in the coffee hills of Coorg. Trek through coffee and pepper plantations, spot exotic birds, and unwind in nature\'s embrace.',
          rating: 4.9,
          totalBookings: 27,
          status: 'Active',
          owner: owner._id
        },
        {
          propertyNo: 'PR-1011',
          name: 'Oasis City Apartments',
          type: 'Apartment',
          location: 'Bangalore, Karnataka, India',
          city: 'Bangalore',
          state: 'Karnataka',
          price: 3500,
          bedRooms: 2,
          capacity: 4,
          amenities: ['WiFi', 'AC', 'Gym', 'Metro Nearby', 'Kitchen'],
          images: ['https://images.unsplash.com/photo-1613977257363-707ba9348227?w=600&auto=format&fit=crop&q=60'],
          description: 'Premium 2-BHK serviced apartment in the heart of Bangalore\'s tech corridor. Fully furnished with fast internet, ideal for business travelers and remote workers.',
          rating: 4.6,
          totalBookings: 45,
          status: 'Active',
          owner: owner._id
        },
        {
          propertyNo: 'PR-1012',
          name: 'Nainital Lake View Villa',
          type: 'Villa',
          location: 'Nainital, Uttarakhand, India',
          city: 'Nainital',
          state: 'Uttarakhand',
          price: 5500,
          bedRooms: 3,
          capacity: 6,
          amenities: ['Lake View', 'WiFi', 'Balcony', 'Fireplace', 'Hot Water'],
          images: ['https://images.unsplash.com/photo-1510798831971-661eb04b3739?w=600&auto=format&fit=crop&q=60'],
          description: 'Elegant villa perched above the sparkling Naini Lake offering panoramic views from every room. Enjoy boat rides, mall road strolls, and fresh mountain air.',
          rating: 4.8,
          totalBookings: 19,
          status: 'Active',
          owner: owner._id
        },
        {
          propertyNo: 'PR-1013',
          name: 'Alibaug Sea Breeze Villa',
          type: 'Villa',
          location: 'Alibaug, Maharashtra, India',
          city: 'Alibaug',
          state: 'Maharashtra',
          price: 9800,
          bedRooms: 5,
          capacity: 10,
          amenities: ['Beach Access', 'Private Pool', 'BBQ', 'WiFi', 'AC'],
          images: ['https://images.unsplash.com/photo-1439066615861-d1af74d74000?w=600&auto=format&fit=crop&q=60'],
          description: 'Luxurious beachfront villa in Alibaug, just 2 hours from Mumbai. Private pool, direct beach access, and stunning sea views — perfect for weekend getaways and celebrations.',
          rating: 4.9,
          totalBookings: 33,
          status: 'Active',
          owner: owner._id
        },
        {
          propertyNo: 'PR-1014',
          name: 'Rishikesh Riverside Camp',
          type: 'Homestay',
          location: 'Rishikesh, Uttarakhand, India',
          city: 'Rishikesh',
          state: 'Uttarakhand',
          price: 1900,
          bedRooms: 4,
          capacity: 8,
          amenities: ['River View', 'Yoga', 'Bonfire', 'Rafting', 'WiFi'],
          images: ['https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=600&auto=format&fit=crop&q=60'],
          description: 'Spiritual and adventure stays on the banks of the Ganges in Rishikesh. Daily yoga sessions, white-water rafting, and evening Ganga Aarti walks included.',
          rating: 4.7,
          totalBookings: 47,
          status: 'Active',
          owner: owner._id
        },
        {
          propertyNo: 'PR-1015',
          name: 'Ooty Hill Station Retreat',
          type: 'Cottage',
          location: 'Ooty, Tamil Nadu, India',
          city: 'Ooty',
          state: 'Tamil Nadu',
          price: 2800,
          bedRooms: 3,
          capacity: 6,
          amenities: ['Tea Garden View', 'Fireplace', 'WiFi', 'Hot Water', 'Parking'],
          images: ['https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=600&auto=format&fit=crop&q=60'],
          description: 'Surrounded by eucalyptus forests and tea gardens, this cozy cottage in Ooty is the perfect escape from city life. Enjoy Toy Train rides, Botanical Gardens, and crisp mountain air.',
          rating: 4.8,
          totalBookings: 21,
          status: 'Active',
          owner: owner._id
        }
      ];

      await Property.insertMany(mockProps);
      console.log('✅ 15 properties seeded!');
    }

    const properties = await Property.find().sort({ createdAt: -1 }).limit(15);

    // 4. Offers
    const offerCount = await Offer.countDocuments();
    if (offerCount === 0 && properties.length > 0) {
      const now = new Date();
      const in7 = new Date(Date.now() + 7 * 86400000);
      const in30 = new Date(Date.now() + 30 * 86400000);
      const offers = properties.slice(0, 6).map((p, idx) => ({
        offerId: `OFF-${7000 + idx + 1}`,
        dateFrom: now,
        dateTo: idx % 2 === 0 ? in30 : in7,
        propertyId: p._id,
        propertyName: p.name,
        location: p.location,
        category: p.type,
        room: p.bedRooms > 2 ? 'Family Suite' : 'Deluxe Room',
        foods: idx % 2 === 0 ? 'Breakfast Included' : 'Breakfast & Dinner',
        amenities: p.amenities?.slice(0, 3) || ['WiFi', 'Pool'],
        offerPercent: [20, 15, 30, 10, 25, 12][idx],
        description: ['Summer Monsoon Special', 'Early-bird Discount', 'Weekend Getaway Deal', 'Long Stay Offer', 'Festival Season Sale', 'Flash Sale'][idx],
        status: 'Active'
      }));
      await Offer.insertMany(offers);
      console.log('✅ 6 offers seeded!');
    }

    // 5. Enquiries
    const enquiryCount = await Enquiry.countDocuments();
    if (enquiryCount === 0 && properties.length > 0) {
      const sampleEnquiries = [
        { name: 'Aarav Sharma', email: 'aarav@example.com', phone: '+91 9823456780', message: 'Looking for a 3-night stay in Kasol for 4 people. Is barbeque available?' },
        { name: 'Priya Patel', email: 'priya.p@example.com', phone: '+91 9123456789', message: 'Are pets allowed at the Goa villa? We have a small dog.' },
        { name: 'John Doe', email: 'johndoe@gmail.com', phone: '+1 4155552671', message: 'Can I get a group discount for 15 people in Manali?' },
        { name: 'Neha Gupta', email: 'neha.g@outlook.com', phone: '+91 9876543210', message: 'Is WiFi speed good for remote work at Bangalore apartment?' },
        { name: 'Vikram Malhotra', email: 'vikram@malhotra.in', phone: '+91 9988776655', message: 'Enquiring about wedding venue availability at Jaipur Haveli in December.' },
        { name: 'Sanya Iyer', email: 'sanya.iyer@yahoo.com', phone: '+91 9845012345', message: 'Do you provide airport transfer from Goa airport to the villa?' },
        { name: 'Rohit Kapoor', email: 'rohit@kapoor.co', phone: '+91 9971234567', message: 'What is the checkout time and can we get a late checkout?' },
        { name: 'Meera Joshi', email: 'meera.j@gmail.com', phone: '+91 9765432109', message: 'Is the Kasol homestay accessible via road throughout year, or only in summer?' },
      ];
      const docs = sampleEnquiries.map((e, idx) => ({
        ...e,
        property: properties[idx % properties.length]._id,
        propertyName: properties[idx % properties.length].name,
        status: 'Open'
      }));
      await Enquiry.insertMany(docs);
      console.log('✅ 8 enquiries seeded!');
    }

    // 6. Bookings
    const bookingCount = await Booking.countDocuments();
    if (bookingCount === 0 && properties.length > 0) {
      const base = Date.now();
      const bookings = Array.from({ length: 20 }).map((_, idx) => {
        const property = properties[idx % properties.length];
        const checkIn = new Date(base + (idx * 5 + 2) * 86400000);
        const checkOut = new Date(base + (idx * 5 + 5) * 86400000);
        const guests = Math.min(property.capacity || 2, 2 + (idx % 4));
        const nights = 3;
        const totalPrice = (property.price || 2000) * nights;
        const statuses = ['Confirmed', 'Confirmed', 'Confirmed', 'Completed', 'Cancelled'];
        return {
          property: property._id,
          user: testUser._id,
          checkIn,
          checkOut,
          guests,
          totalPrice,
          paymentStatus: idx % 5 === 4 ? 'Failed' : 'Paid',
          razorpayOrderId: `order_seed_${Date.now()}_${idx}`,
          razorpayPaymentId: `pay_seed_${Date.now()}_${idx}`,
          status: statuses[idx % 5],
          createdAt: new Date(base - (20 - idx) * 86400000)
        };
      });
      await Booking.insertMany(bookings);
      // Update totalBookings counters
      const counts = await Booking.aggregate([
        { $match: { paymentStatus: 'Paid' } },
        { $group: { _id: '$property', count: { $sum: 1 } } }
      ]);
      for (const c of counts) {
        await Property.updateOne({ _id: c._id }, { $set: { totalBookings: c.count } });
      }
      console.log('✅ 20 bookings seeded!');
    }
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
  }
};
