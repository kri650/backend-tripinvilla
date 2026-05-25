import express from 'express';
import Content from '../models/Content.js';
import upload from '../middleware/upload.js';

const router = express.Router();

// Helper to set nested object properties (like lodash _.set)
function setNestedProperty(obj, path, value) {
  const keys = path.split('.');
  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!current[key]) {
      // If the next key is a number, create an array, else an object
      current[key] = isNaN(keys[i + 1]) ? {} : [];
    }
    current = current[key];
  }
  current[keys[keys.length - 1]] = value;
}

// GET /api/content/:key
router.get('/:key', async (req, res) => {
  try {
    const content = await Content.findOne({ key: req.params.key });
    if (!content) {
      return res.json({ data: {} });
    }
    res.json(content);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/content/:key
router.put('/:key', upload.any(), async (req, res) => {
  try {
    const { key } = req.params;
    let contentData = {};

    // Parse the JSON string sent from the frontend
    if (req.body.contentData) {
      contentData = JSON.parse(req.body.contentData);
    }

    // Process uploaded files and set their URLs in the contentData object
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        // file.fieldname will be something like "banner.image" or "section5.features.0.image"
        // file.filename holds the Cloudinary URL (as set by our upload middleware)
        setNestedProperty(contentData, file.fieldname, file.filename);
      });
    }

    // Upsert the content
    const updatedContent = await Content.findOneAndUpdate(
      { key },
      { $set: { data: contentData } },
      { new: true, upsert: true }
    );

    res.json(updatedContent);
  } catch (err) {
    console.error('Error updating content:', err);
    res.status(500).json({ message: err.message });
  }
});

export default router;
