const mongoose = require('mongoose');

const testimonialSchema = new mongoose.Schema({
  userName: { type: String, required: true, trim: true, maxlength: 60 },
  rating: { type: Number, required: true, min: 1, max: 5, validate: Number.isInteger },
  feedback: { type: String, required: true, trim: true, maxlength: 500 },
  programName: { type: String, required: true, trim: true, maxlength: 80 },
  photoUrl: { type: String, maxlength: 2048, default: null },
  consentGiven: { type: Boolean, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  featured: { type: Boolean, default: false },
  photoApproved: { type: Boolean, default: false },
}, { timestamps: true });

testimonialSchema.index({ status: 1, consentGiven: 1, featured: -1, createdAt: -1 });

module.exports = mongoose.model('Testimonial', testimonialSchema);
