
const mongoose = require('mongoose');

const taleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide a title'],
    trim: true,
    maxlength: [100, 'Title cannot be more than 100 characters']
  },
  content: {
    type: String,
    required: [true, 'Please provide content for the tale'],
    trim: true
  },
  ageRange: {
    type: String,
    required: [true, 'Please specify an age range'],
    enum: ['2-4', '5-7', '8-10', '11-13']
  },
  topic: {
    type: String,
    required: [true, 'Please specify a topic'],
    enum: ['adventure', 'fantasy', 'animals', 'friendship', 'nature', 'space', 'science', 'history', 'sports']
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  likes: {
    type: Number,
    default: 0
  },
  likedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('Tale', taleSchema);
