
const express = require('express');
const router = express.Router();
const { 
  generateTale,
  createTale,
  getTales,
  getPublicTales,
  getUserTales,
  getTaleById,
  updateTale,
  deleteTale,
  likeTale,
  checkLikeStatus
} = require('../controllers/tales');
const { protect } = require('../middleware/auth');

// Protected routes
router.post('/generate', protect, generateTale);
router.post('/', protect, createTale);
router.get('/user', protect, getUserTales);
router.patch('/:id', protect, updateTale);
router.delete('/:id', protect, deleteTale);
router.post('/:id/like', protect, likeTale);
router.get('/:id/like', protect, checkLikeStatus);

// Public routes
router.get('/public', getPublicTales);
router.get('/:id', getTaleById);

module.exports = router;
