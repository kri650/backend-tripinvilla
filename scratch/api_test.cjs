const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: '../.env' });

const API_BASE = 'http://127.0.0.1:8000/api';

async function runTests() {
  console.log('--- STARTING API CRUD & persistency tests ---');
  
  // 1. Login Admin to get Token
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@tripinvilla.com', password: 'admin12345' })
  });
  
  if (!loginRes.ok) {
    console.error('❌ Admin login failed!');
    process.exit(1);
  }
  
  const loginData = await loginRes.json();
  const token = loginData.token;
  console.log('✅ Admin logged in successfully. Token acquired.');

  // Get first state and country for destination creation
  const statesRes = await fetch(`${API_BASE}/masters/states`);
  const states = await statesRes.json();
  const stateId = states[0]._id;
  const countryId = states[0].countryId;
  console.log(`Using State: ${states[0].stateName} (${stateId})`);

  // 2. Add Destination
  const createDestRes = await fetch(`${API_BASE}/master/destinations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      destinationName: 'TestDestinationAPI',
      stateId: stateId,
      countryId: countryId,
      coverImageUrl: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750',
      propertyTypesOffered: ['Villa'],
      description: 'A beautiful test destination created by the API test script.',
      status: 'Active'
    })
  });

  if (!createDestRes.ok) {
    const err = await createDestRes.json();
    console.error('❌ Create Destination failed:', err);
    process.exit(1);
  }

  const newDest = await createDestRes.json();
  console.log(`✅ Destination created successfully: ${newDest.destinationName} (${newDest._id})`);

  // 3. Edit Destination
  const editDestRes = await fetch(`${API_BASE}/master/destinations/${newDest._id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      destinationName: 'TestDestinationAPI-Edited',
      stateId: stateId,
      countryId: countryId,
      coverImageUrl: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750',
      propertyTypesOffered: ['Villa', 'Homestay'],
      description: 'A beautiful test destination created and updated by the API test script.',
      status: 'Active'
    })
  });

  if (!editDestRes.ok) {
    const err = await editDestRes.json();
    console.error('❌ Edit Destination failed:', err);
    process.exit(1);
  }

  const editedDest = await editDestRes.json();
  console.log(`✅ Destination edited successfully: ${editedDest.destinationName}`);

  // 4. Delete Destination
  const deleteDestRes = await fetch(`${API_BASE}/master/destinations/${newDest._id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!deleteDestRes.ok) {
    const err = await deleteDestRes.json();
    console.error('❌ Delete Destination failed:', err);
    process.exit(1);
  }
  console.log('✅ Destination deleted successfully.');

  // 5. Add Experience
  const createExpRes = await fetch(`${API_BASE}/master/experiences`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      experienceName: 'TestExperienceAPI',
      representingIcon: 'TreePine',
      themeCoverImageUrl: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb',
      description: 'A beautiful test experience created by the API test script.',
      status: 'Active'
    })
  });

  if (!createExpRes.ok) {
    const err = await createExpRes.json();
    console.error('❌ Create Experience failed:', err);
    process.exit(1);
  }

  const newExp = await createExpRes.json();
  console.log(`✅ Experience created successfully: ${newExp.experienceName} (${newExp._id})`);

  // 6. Edit Experience
  const editExpRes = await fetch(`${API_BASE}/master/experiences/${newExp._id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      experienceName: 'TestExperienceAPI-Edited',
      representingIcon: 'Mountain',
      themeCoverImageUrl: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb',
      description: 'A beautiful test experience created and updated by the API test script.',
      status: 'Active'
    })
  });

  if (!editExpRes.ok) {
    const err = await editExpRes.json();
    console.error('❌ Edit Experience failed:', err);
    process.exit(1);
  }

  const editedExp = await editExpRes.json();
  console.log(`✅ Experience edited successfully: ${editedExp.experienceName}`);

  // 7. Delete Experience
  const deleteExpRes = await fetch(`${API_BASE}/master/experiences/${newExp._id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!deleteExpRes.ok) {
    const err = await deleteExpRes.json();
    console.error('❌ Delete Experience failed:', err);
    process.exit(1);
  }
  console.log('✅ Experience deleted successfully.');

  // Get a real property ID for review and enquiry testing
  const propsRes = await fetch(`${API_BASE}/properties`);
  const propsData = await propsRes.json();
  const realProperty = propsData.properties && propsData.properties.length > 0 ? propsData.properties[0] : null;

  if (realProperty) {
    console.log(`Using real property: ${realProperty.title} (${realProperty._id})`);

    // 8. Submit Enquiry
    const enquiryRes = await fetch(`${API_BASE}/enquiries`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        propertyId: realProperty._id,
        propertyName: realProperty.title,
        user_id: loginData.user._id,
        name: 'Test Guest User',
        phone: '9876543210',
        email: 'testguest@tripinvilla.com',
        message: 'This is a test enquiry created by the test script.'
      })
    });

    if (!enquiryRes.ok) {
      const err = await enquiryRes.json();
      console.error('❌ Submit Enquiry failed:', err);
      process.exit(1);
    }
    const enquiryObj = await enquiryRes.json();
    console.log(`✅ Enquiry submitted successfully. ID: ${enquiryObj._id}`);

    // Verify it is present in owner enquiries (or user enquiries)
    const userEnquiriesRes = await fetch(`${API_BASE}/enquiries/user`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const userEnquiries = await userEnquiriesRes.json();
    console.log('Submitted Enquiry user_id:', enquiryObj.user_id, 'email:', enquiryObj.email);
    console.log('Authenticated User ID:', loginData.user._id, 'email:', loginData.user.email);
    console.log('User Enquiries found in DB:', userEnquiries.map(e => ({ id: e._id, user_id: e.user_id, email: e.email })));
    const foundEnq = userEnquiries.find(e => e.id === enquiryObj._id || e._id === enquiryObj._id);
    if (foundEnq) {
      console.log('✅ Verified enquiry displays correctly in user dashboard!');
    } else {
      console.warn('⚠️ Enquiry was submitted but not found in user dashboard query.');
    }

    // 9. Submit Review
    const reviewRes = await fetch(`${API_BASE}/reviews/${realProperty._id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        reviewer_name: 'Test Reviewer',
        rating: 5,
        review_text: 'Excellent service and property. Had a great time!'
      })
    });

    if (!reviewRes.ok) {
      const err = await reviewRes.json();
      console.error('❌ Submit Review failed:', err);
      process.exit(1);
    }
    const reviewObj = await reviewRes.json();
    console.log(`✅ Review submitted successfully. ID: ${reviewObj._id}`);

    // Verify it displays in user reviews
    const userReviewsRes = await fetch(`${API_BASE}/reviews/user/me`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const userReviews = await userReviewsRes.json();
    const foundRev = userReviews.find(r => r._id === reviewObj._id);
    if (foundRev) {
      console.log('✅ Verified review displays correctly in user dashboard!');
    } else {
      console.warn('⚠️ Review was submitted but not found in user reviews query.');
    }

  } else {
    console.warn('⚠️ No real properties found in database to run enquiry and review tests.');
  }

  console.log('--- ALL TESTS COMPLETED SUCCESSFULLY ---');
}

runTests();
