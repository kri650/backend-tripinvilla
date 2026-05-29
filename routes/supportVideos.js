import express from 'express';
import SupportVideo from '../models/SupportVideo.js';
import { uploadVideo } from '../middleware/uploadVideo.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// GET all videos
router.get('/', async (req, res) => {
  try {
    const videos = await SupportVideo.find().sort({ createdAt: -1 });
    res.json(videos);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST a new video
router.post('/', protect, adminOnly, uploadVideo.single('video'), async (req, res) => {
  try {
    const { title, email } = req.body;
    
    if (!title || !email) {
      return res.status(400).json({ message: 'Title and email are required' });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'Video file is required' });
    }

    const newVideo = new SupportVideo({
      title,
      email,
      videoUrl: req.file.filename // This is the Cloudinary URL
    });

    const savedVideo = await newVideo.save();
    res.status(201).json(savedVideo);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE a video
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const video = await SupportVideo.findByIdAndDelete(req.params.id);
    if (!video) return res.status(404).json({ message: 'Video not found' });
    res.json({ message: 'Video deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
