import Property from "../models/Property.js";

// ─────────────────────────────────────────────────────────────────
// Helper: build date-availability filter
// Excludes properties that have a booking overlapping the requested range
// ─────────────────────────────────────────────────────────────────
function buildAvailabilityFilter(checkIn, checkOut) {
  if (!checkIn || !checkOut) return {};
  const ci = new Date(checkIn);
  const co = new Date(checkOut);
  return {
    bookedDates: {
      $not: {
        $elemMatch: {
          checkIn: { $lt: co },
          checkOut: { $gt: ci },
        },
      },
    },
  };
}

// ─────────────────────────────────────────────────────────────────
// Helper: build full filter object from query params
// ─────────────────────────────────────────────────────────────────
function buildFilter(params) {
  const {
    city,
    type,
    checkIn,
    checkOut,
    guests,
    minPrice,
    maxPrice,
    roomType,
    foodPreference,
    verifiedOnly,
    featuredOnly,
    keyword,
  } = params;

  const filter = { status: "Active" };

  if (city) filter.city = new RegExp(city.trim(), "i");
  
  if (type && type !== "any" && type !== "all") {
    // Tripinvilla type enum capitalization (e.g., 'Villa', 'Homestay')
    filter.type = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
  }
  
  if (roomType && roomType !== "any") filter.roomType = roomType;
  if (foodPreference && foodPreference !== "any") filter.foodPreference = foodPreference;
  if (guests) filter.capacity = { $gte: Number(guests) };
  if (verifiedOnly === "true" || verifiedOnly === true) filter.isVerified = true;
  if (featuredOnly === "true" || featuredOnly === true) filter.isFeatured = true;

  // Price range (mapped to Tripinvilla 'price')
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }

  // Availability
  Object.assign(filter, buildAvailabilityFilter(checkIn, checkOut));

  // Keyword regex search (partial matches / multi-word tolerance)
  if (keyword && keyword.trim()) {
    const kw = keyword.trim();
    const terms = kw.split(/\s+/).filter(t => t.length > 1);
    
    if (terms.length > 0) {
      filter.$and = filter.$and || [];
      terms.forEach(term => {
        // Skip common stop words that might overly restrict results
        if (['in', 'at', 'on', 'the', 'for', 'a', 'an', 'and'].includes(term.toLowerCase())) return;
        
        filter.$and.push({
          $or: [
            { name: new RegExp(term, "i") },
            { city: new RegExp(term, "i") },
            { state: new RegExp(term, "i") },
            { location: new RegExp(term, "i") },
            { type: new RegExp(term, "i") },
            { category: new RegExp(term, "i") },
            { description: new RegExp(term, "i") }
          ]
        });
      });
      // If all words were stop words, fallback to full string match
      if (filter.$and.length === 0) {
        delete filter.$and;
        filter.$or = [
          { name: new RegExp(kw, "i") },
          { city: new RegExp(kw, "i") },
          { location: new RegExp(kw, "i") }
        ];
      }
    } else {
      filter.$or = [
        { name: new RegExp(kw, "i") },
        { city: new RegExp(kw, "i") },
        { state: new RegExp(kw, "i") },
        { location: new RegExp(kw, "i") },
        { description: new RegExp(kw, "i") }
      ];
    }
  }

  return filter;
}

// ─────────────────────────────────────────────────────────────────
// GET /api/search
// Regular search with all filters from the search bar
// ─────────────────────────────────────────────────────────────────
export const search = async (req, res) => {
  try {
    const { page = 1, limit = 12, sortBy = "priority" } = req.query;
    const filter = buildFilter(req.query);

    const sortMap = {
      priority: { priority: -1, createdAt: -1 },
      "price-asc": { price: 1, priority: -1 },
      "price-desc": { price: -1, priority: -1 },
      newest: { createdAt: -1 },
    };

    const sort = sortMap[sortBy] || sortMap.priority;

    const propertiesDb = await Property.find(filter)
      .sort(sort)
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .populate("owner", "name phone email")
      .lean();

    const total = await Property.countDocuments(filter);

    // Format properties exactly as Tripinvilla expects them on the frontend
    const properties = propertiesDb.map((p, index) => ({
      ...p,
      _id: p._id,
      propertyNo: p.propertyNo || `PR-${1000 + index}`,
      image: p.images && p.images[0] ? p.images[0] : 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500&auto=format&fit=crop&q=60',
      propertyName: p.name,
      location: p.location || `${p.city || ''}${p.state ? ', ' + p.state : ''}`,
      category: p.type || 'Villa',
      bestRoomRate: p.price || 1200,
      rooms: p.bedRooms || 3,
      guests: p.capacity || 2,
      rating: p.rating || 4.5,
      status: p.status || 'Active',
      hasActiveOffer: p.hasActiveOffer || false,
    }));

    res.json({
      properties,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
        limit: Number(limit),
      },
      stats: {
        totalProperties: total,
        activeProperties: total,
      },
      total: total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit))
    });
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({ message: "Search failed", error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────
// POST /api/search/ai
// AI-powered natural language search
// ─────────────────────────────────────────────────────────────────
export const aiSearch = async (req, res) => {
  try {
    const { query } = req.body;
    if (!query || !query.trim()) {
      return res.status(400).json({ message: "Query is required" });
    }

    // ── Step 1: Extract filters from natural language using Claude ──
    const extractionPrompt = `
You are a travel property search assistant. Extract search filters from this query and return ONLY a valid JSON object. No extra text, no markdown.

Query: "${query}"

Return this exact JSON shape (use null for fields not mentioned):
{
  "city": "string or null",
  "type": "villa|homestay|hotel|resort|motel|null",
  "checkIn": "YYYY-MM-DD or null",
  "checkOut": "YYYY-MM-DD or null",
  "guests": "number or null",
  "minPrice": "number or null",
  "maxPrice": "number or null",
  "roomType": "entire-place|private-room|shared-room|dormitory|suite|cottage|null",
  "foodPreference": "veg|non-veg|both|null",
  "verifiedOnly": false,
  "featuredOnly": false,
  "keyword": "remaining keywords not captured above, or null",
  "humanSummary": "one sentence describing what the user is looking for"
}

Today's date is ${new Date().toISOString().split("T")[0]}.
If relative dates like "this weekend" or "next Friday" are mentioned, calculate the actual dates.
`;

    const apiKey = process.env.GEMINI_API_KEY;
    let extracted = { humanSummary: `Showing text results for: ${query}`, keyword: query };

    // If API key is available, call Gemini, otherwise fallback to basic keyword extraction mock
    if (apiKey) {
      try {
        const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: extractionPrompt }]
            }],
            generationConfig: {
              responseMimeType: "application/json",
            }
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const rawText = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
          const clean = rawText.replace(/```json|```/g, "").trim();
          extracted = JSON.parse(clean);
        } else {
          console.error("Gemini API Error:", await aiResponse.text());
        }
      } catch (e) {
        console.error("AI parse failed, using fallback:", e);
      }
    } else {
      console.warn("GEMINI_API_KEY not found. Falling back to keyword search mock.");
      // Basic mock extraction for demonstration
      if (query.toLowerCase().includes("goa")) extracted.city = "Goa";
      if (query.toLowerCase().includes("villa")) extracted.type = "Villa";
      if (query.toLowerCase().includes("veg")) extracted.foodPreference = "veg";
    }

    const { humanSummary, ...filterParams } = extracted;

    // ── Step 2: Run MongoDB search with extracted filters ───────────
    const filter = buildFilter(filterParams);
    const propertiesDb = await Property.find(filter)
      .sort({ priority: -1, createdAt: -1 })
      .limit(12)
      .populate("owner", "name phone email")
      .lean();

    const total = await Property.countDocuments(filter);

    // Format properties for frontend
    const properties = propertiesDb.map((p, index) => ({
      ...p,
      _id: p._id,
      propertyNo: p.propertyNo || `PR-${1000 + index}`,
      image: p.images && p.images[0] ? p.images[0] : 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500&auto=format&fit=crop&q=60',
      propertyName: p.name,
      location: p.location || `${p.city || ''}${p.state ? ', ' + p.state : ''}`,
      category: p.type || 'Villa',
      bestRoomRate: p.price || 1200,
      rooms: p.bedRooms || 3,
      guests: p.capacity || 2,
      rating: p.rating || 4.5,
      status: p.status || 'Active',
      hasActiveOffer: p.hasActiveOffer || false,
    }));

    // ── Step 3: Return results with AI summary ──────────────────────
    res.json({
      aiSummary: humanSummary || `Showing results for: ${query}`,
      extractedFilters: extracted,
      properties,
      total,
      page: 1,
      pages: 1
    });
  } catch (err) {
    console.error("AI search error:", err);
    res.status(500).json({ message: "AI search failed", error: err.message });
  }
};
