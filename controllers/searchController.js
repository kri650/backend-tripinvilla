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

  // ── Location / City / Property Name filter ──────────────────────────────────────────
  // Search across name, city, state, AND location field so property names and locations all work
  if (city && city.trim()) {
    const cityRegex = new RegExp(city.trim(), "i");
    filter.$and = filter.$and || [];
    filter.$and.push({
      $or: [
        { name: cityRegex },
        { city: cityRegex },
        { state: cityRegex },
        { location: cityRegex },
      ]
    });
  }

  // ── Property Type filter (case-insensitive) ─────────────────────────
  // DB has mixed case: 'Villa', 'villa', 'Hotel', 'hotel' — use regex
  if (type && type !== "any" && type !== "all" && type !== "") {
    filter.type = new RegExp(`^${type.trim()}$`, "i");
  }

  // ── Room Type ───────────────────────────────────────────────────────
  if (roomType && roomType !== "any" && roomType !== "") {
    filter.$and = filter.$and || [];
    filter.$and.push({
      $or: [
        { roomType: new RegExp(roomType.trim(), "i") },
        { roomType: { $exists: false } },
        { roomType: null },
        { roomType: "" },
        { roomType: "1 Room" }
      ]
    });
  }

  // ── Food Preference ─────────────────────────────────────────────────
  // Only apply if explicitly set and not 'none'
  if (foodPreference && foodPreference !== "any" && foodPreference !== "none") {
    filter.$and = filter.$and || [];
    filter.$and.push({
      $or: [
        { foodPreference: { $in: [foodPreference, "both"] } },
        { foodPreference: { $exists: false } },
        { foodPreference: null },
        { foodPreference: "" },
        { foodPreference: "none" }
      ]
    });
  }

  // ── Guests / Capacity ───────────────────────────────────────────────
  if (guests && !isNaN(Number(guests)) && Number(guests) > 0) {
    filter.capacity = { $gte: Number(guests) };
  }

  // ── Verified / Featured ─────────────────────────────────────────────
  if (verifiedOnly === "true" || verifiedOnly === true) filter.isVerified = true;
  if (featuredOnly === "true" || featuredOnly === true) filter.isFeatured = true;

  // ── Price range ─────────────────────────────────────────────────────
  if (minPrice || maxPrice) {
    const min = minPrice ? Number(minPrice) : null;
    const max = maxPrice ? Number(maxPrice) : null;
    const priceCondition = {};
    if (min != null && !Number.isNaN(min)) priceCondition.$gte = min;
    if (max != null && !Number.isNaN(max)) priceCondition.$lte = max;
    if (Object.keys(priceCondition).length > 0) {
      filter.$and = filter.$and || [];
      filter.$and.push({
        $or: [
          { price: priceCondition },
          { price_per_night: priceCondition },
          { bestRoomRate: priceCondition },
        ],
      });
    }
  }

  // ── Date availability ───────────────────────────────────────────────
  Object.assign(filter, buildAvailabilityFilter(checkIn, checkOut));

  // ── Keyword search ──────────────────────────────────────────────────
  // Searches name, city, state, location, description, type
  if (keyword && keyword.trim()) {
    const kw = keyword.trim();
    // Split into words, ignore common stop words
    const stopWords = new Set(['in', 'at', 'on', 'the', 'for', 'a', 'an', 'and', 'or', 'near', 'by']);
    const terms = kw.split(/\s+/).filter(t => t.length > 1 && !stopWords.has(t.toLowerCase()));

    if (terms.length > 0) {
      filter.$and = filter.$and || [];
      // Each term must match at least one of the search fields
      terms.forEach(term => {
        const termRegex = new RegExp(term, "i");
        filter.$and.push({
          $or: [
            { name: termRegex },
            { city: termRegex },
            { state: termRegex },
            { location: termRegex },
            { type: termRegex },
            { category: termRegex },
            { description: termRegex },
          ]
        });
      });
    } else {
      // All words were stop words — do broad match on full string
      const kwRegex = new RegExp(kw, "i");
      filter.$or = [
        { name: kwRegex },
        { city: kwRegex },
        { state: kwRegex },
        { location: kwRegex },
        { description: kwRegex },
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
    const { page = 1, limit = 100, sortBy = "priority" } = req.query;
    const filter = buildFilter(req.query);

    const sortMap = {
      priority: { priority: -1, createdAt: -1 },
      "price-asc": { priority: -1, price: 1 },
      "price-desc": { priority: -1, price: -1 },
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
      .limit(100)
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
