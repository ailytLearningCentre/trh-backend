const mongoose = require('mongoose');
const relationships = ['Spouse', 'Son', 'Daughter', 'Father', 'Mother', 'Brother', 'Sister', 'Child', 'Parent', 'Other'];
const genders = ['Male', 'Female', 'Other'];
const schema = new mongoose.Schema({
  accountUserId: { type: String, ref: 'User', required: true, index: true },
  fullName: { type: String, trim: true, minlength: 1, maxlength: 100, required: true },
  relationship: { type: String, enum: relationships, required: true },
  dateOfBirth: { type: Date, required: true, validate: value => value <= new Date() },
  gender: { type: String, enum: genders, required: true },
  profileImage: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  archivedAt: Date,
}, { timestamps: true });
schema.index({ accountUserId: 1, isActive: 1, createdAt: 1 });
module.exports = mongoose.model('FamilyMember', schema);
module.exports.relationships = relationships;
module.exports.genders = genders;
