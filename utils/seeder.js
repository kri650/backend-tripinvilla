import User from '../models/User.js';
import Property from '../models/Property.js';

export const seedDatabase = async () => {
  try {
    // 1. Seed Owner User if none exists
    let owner = await User.findOne({ email: 'navin@gmail.com' });
    if (!owner) {
      owner = await User.create({
        name: 'Navin Kumar',
        email: 'navin@gmail.com',
        password: 'password123', // Will be hashed automatically by pre-save hook
        role: 'owner',
        phone: '+91 99887 76543',
        status: 'Active'
      });
      console.log('✅ Default Owner account seeded: navin@gmail.com (Password: password123)');
    }

    // Seed regular test user if none exists
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
      console.log('✅ Default Test User account seeded: rohan.sharma@gmail.com (Password: password123)');
    }

    // 2. Seed Properties if none exist
    const propertyCount = await Property.countDocuments();
    if (propertyCount === 0) {
      const mockProps = [
        {
          propertyNo: "PR-1001",
          name: "Whispering Palms Villa",
          type: "Villa",
          location: "Goa, India",
          city: "Goa",
          state: "Goa",
          price: 4500,
          bedRooms: 4,
          capacity: 8,
          images: ["https://images.unsplash.com/photo-1580587722351-9d9b788c0784?w=500&auto=format&fit=crop&q=60"],
          description: "Experience the epitome of luxury at Whispering Palms Villa in beautiful Goa. This stunning 4-bedroom villa features a private pool, lush tropical gardens, and beautiful modern architecture designed to provide you with a relaxing stay.",
          rating: 4.9,
          status: "Active",
          owner: owner._id
        },
        {
          propertyNo: "PR-1002",
          name: "Bodhi Serenity Homestay",
          type: "Homestay",
          location: "Manali, HP",
          city: "Manali",
          state: "Himachal Pradesh",
          price: 2200,
          bedRooms: 3,
          capacity: 6,
          images: ["https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500&auto=format&fit=crop&q=60"],
          description: "Escape to the peaceful hills of Manali at Bodhi Serenity Homestay. Perfect for travelers seeking a quiet and cozy retreat, this homestay offers spectacular views of the snow-clad peaks, home-cooked food, and mountain hospitality.",
          rating: 4.8,
          status: "Active",
          owner: owner._id
        },
        {
          propertyNo: "PR-1003",
          name: "Royal Palm Resort",
          type: "Resort",
          location: "Udaipur, RJ",
          city: "Udaipur",
          state: "Rajasthan",
          price: 8500,
          bedRooms: 12,
          capacity: 24,
          images: ["https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=500&auto=format&fit=crop&q=60"],
          description: "Immerse yourself in heritage luxury at the Royal Palm Resort in Udaipur. Located close to the serene lakes, this heritage resort offers palatial rooms, global dining options, and high-end recreation structures.",
          rating: 4.7,
          status: "Active",
          owner: owner._id
        },
        {
          propertyNo: "PR-1004",
          name: "Oasis Luxury Apartments",
          type: "Apartment",
          location: "Bangalore, KA",
          city: "Bangalore",
          state: "Karnataka",
          price: 3500,
          bedRooms: 2,
          capacity: 4,
          images: ["https://images.unsplash.com/photo-1613977257363-707ba9348227?w=500&auto=format&fit=crop&q=60"],
          description: "Enjoy a sleek, modern city stay at Oasis Luxury Apartments. Situated in the heart of Bangalore, this 2-bedroom premium space features premium appliances, fast fiber internet, and easy access to tech parks.",
          rating: 4.6,
          status: "Active",
          owner: owner._id
        },
        {
          propertyNo: "PR-1005",
          name: "Meadow View Cottage",
          type: "Cottage",
          location: "Ooty, TN",
          city: "Ooty",
          state: "Tamil Nadu",
          price: 2800,
          bedRooms: 3,
          capacity: 6,
          images: ["https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=500&auto=format&fit=crop&q=60"],
          description: "Nestled in the lush hills of Ooty, Meadow View Cottage is a charming getaway. Enjoy your morning tea overlooking tea plantations, bonfire evenings, and warm, comfortable beds.",
          rating: 4.9,
          status: "Active",
          owner: owner._id
        }
      ];

      await Property.insertMany(mockProps);
      console.log('✅ Default properties successfully seeded in MongoDB!');
    }
  } catch (err) {
    console.error('❌ Database seeding failed:', err.message);
  }
};
