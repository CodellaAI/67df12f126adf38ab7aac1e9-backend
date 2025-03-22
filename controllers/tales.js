
const Tale = require('../models/Tale');
const User = require('../models/User');
const { Anthropic } = require('@anthropic/sdk');

// Initialize Claude AI client
const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

// @desc    Generate a tale with Claude AI
// @route   POST /api/tales/generate
// @access  Private
exports.generateTale = async (req, res, next) => {
  try {
    const { ageRange, topic, mainCharacter, setting, additionalDetails } = req.body;
    
    // Validate required fields
    if (!ageRange || !topic) {
      return res.status(400).json({ message: 'Age range and topic are required' });
    }
    
    // Build prompt for Claude
    let prompt = `Create a children's story for ages ${ageRange} about ${topic}.`;
    
    if (mainCharacter) {
      prompt += ` The main character should be named ${mainCharacter}.`;
    }
    
    if (setting) {
      prompt += ` The story should be set in ${setting}.`;
    }
    
    if (additionalDetails) {
      prompt += ` Additional details: ${additionalDetails}`;
    }
    
    prompt += ` The story should be appropriate for the age range, engaging, and educational if possible. Include a creative title at the beginning. Format the story with clear paragraphs.`;
    
    // Call Claude API
    const response = await anthropic.messages.create({
      model: "claude-3-opus-20240229",
      max_tokens: 4000,
      temperature: 0.7,
      system: "You are a skilled children's author who creates age-appropriate, engaging, and imaginative stories for children. Your stories should have a clear beginning, middle, and end, with a positive message or lesson.",
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    });
    
    const generatedContent = response.content[0].text;
    
    // Extract title and content
    const titleMatch = generatedContent.match(/^#\s*(.*?)(?:\n|$)/) || generatedContent.match(/^(.*?)(?:\n|$)/);
    const title = titleMatch ? titleMatch[1].trim() : "Untitled Tale";
    
    // Remove title from content if it exists
    let content = generatedContent;
    if (titleMatch) {
      content = content.replace(titleMatch[0], '').trim();
    }
    
    res.status(200).json({
      tale: {
        title,
        content,
        ageRange,
        topic
      }
    });
  } catch (error) {
    console.error('Claude API Error:', error);
    res.status(500).json({ message: 'Error generating tale', error: error.message });
  }
};

// @desc    Create a new tale
// @route   POST /api/tales
// @access  Private
exports.createTale = async (req, res, next) => {
  try {
    const { title, content, ageRange, topic, isPublic } = req.body;
    
    const tale = await Tale.create({
      title,
      content,
      ageRange,
      topic,
      author: req.user._id,
      isPublic: isPublic || false
    });
    
    res.status(201).json({ 
      success: true, 
      tale 
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all tales
// @route   GET /api/tales
// @access  Private/Admin
exports.getTales = async (req, res, next) => {
  try {
    const tales = await Tale.find().populate('author', 'name');
    
    res.status(200).json({
      success: true,
      count: tales.length,
      tales
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get public tales
// @route   GET /api/tales/public
// @access  Public
exports.getPublicTales = async (req, res, next) => {
  try {
    const tales = await Tale.find({ isPublic: true })
      .populate('author', 'name')
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: tales.length,
      tales
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get tales by current user
// @route   GET /api/tales/user
// @access  Private
exports.getUserTales = async (req, res, next) => {
  try {
    const tales = await Tale.find({ author: req.user._id })
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: tales.length,
      tales
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get tale by ID
// @route   GET /api/tales/:id
// @access  Public (if tale is public) or Private (if user is author)
exports.getTaleById = async (req, res, next) => {
  try {
    const tale = await Tale.findById(req.params.id)
      .populate('author', 'name');
    
    if (!tale) {
      return res.status(404).json({ message: 'Tale not found' });
    }
    
    // Check if tale is public or if user is the author
    const isAuthor = req.user && req.user._id.toString() === tale.author._id.toString();
    if (!tale.isPublic && !isAuthor) {
      return res.status(403).json({ message: 'Not authorized to access this tale' });
    }
    
    res.status(200).json({
      success: true,
      tale
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update tale
// @route   PATCH /api/tales/:id
// @access  Private
exports.updateTale = async (req, res, next) => {
  try {
    let tale = await Tale.findById(req.params.id);
    
    if (!tale) {
      return res.status(404).json({ message: 'Tale not found' });
    }
    
    // Make sure user is the tale author
    if (tale.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this tale' });
    }
    
    // Update fields
    tale = await Tale.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      success: true,
      tale
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete tale
// @route   DELETE /api/tales/:id
// @access  Private
exports.deleteTale = async (req, res, next) => {
  try {
    const tale = await Tale.findById(req.params.id);
    
    if (!tale) {
      return res.status(404).json({ message: 'Tale not found' });
    }
    
    // Make sure user is the tale author
    if (tale.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this tale' });
    }
    
    await tale.deleteOne();
    
    res.status(200).json({
      success: true,
      message: 'Tale deleted'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Like/unlike a tale
// @route   POST /api/tales/:id/like
// @access  Private
exports.likeTale = async (req, res, next) => {
  try {
    const tale = await Tale.findById(req.params.id);
    
    if (!tale) {
      return res.status(404).json({ message: 'Tale not found' });
    }
    
    // Check if tale is public
    if (!tale.isPublic) {
      return res.status(403).json({ message: 'Cannot like a private tale' });
    }
    
    const userId = req.user._id;
    const userIndex = tale.likedBy.indexOf(userId);
    
    if (userIndex === -1) {
      // User hasn't liked the tale yet, add like
      tale.likes += 1;
      tale.likedBy.push(userId);
      await tale.save();
      
      return res.status(200).json({
        success: true,
        liked: true,
        likes: tale.likes
      });
    } else {
      // User already liked the tale, remove like
      tale.likes = Math.max(0, tale.likes - 1);
      tale.likedBy.splice(userIndex, 1);
      await tale.save();
      
      return res.status(200).json({
        success: true,
        liked: false,
        likes: tale.likes
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Check if user has liked a tale
// @route   GET /api/tales/:id/like
// @access  Private
exports.checkLikeStatus = async (req, res, next) => {
  try {
    const tale = await Tale.findById(req.params.id);
    
    if (!tale) {
      return res.status(404).json({ message: 'Tale not found' });
    }
    
    const userId = req.user._id;
    const liked = tale.likedBy.includes(userId);
    
    res.status(200).json({
      success: true,
      liked
    });
  } catch (error) {
    next(error);
  }
};
