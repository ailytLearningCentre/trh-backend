const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  familyMemberId: { type: String, default: 'self', required: true },
  beneficiaryName: { type: String, default: '' },
  userId: { type: String, ref: 'User', required: true },
  requestId: { type: String, required: true },
  programId: { type: String, required: true },
  programName: { type: String, required: true },
  months: { type: Number, enum: [1, 3, 6, 9, 12], required: true },
  durationLabel: { type: String, required: true },
  inrAmount: { type: Number, min: 1, required: true },
  usdAmount: { type: Number, min: 1, required: true },
  amountMinor: { type: Number, min: 1, required: true },
  currency: { type: String, enum: ['INR', 'USD'], required: true },
  catalogVersion: { type: String, required: true },
  status: { type: String, enum: ['creating', 'pending', 'active', 'setup_failed'], default: 'creating' },
  orderId: { type: String, unique: true, sparse: true },
  paymentId: { type: String, unique: true, sparse: true },
  activatedAt: Date,
}, { timestamps: true });
schema.index({ userId: 1, requestId: 1 }, { unique: true });
schema.index({ userId: 1, familyMemberId: 1, createdAt: -1 });
module.exports = mongoose.model('WellnessPurchase', schema);
