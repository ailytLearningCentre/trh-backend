const mongoose = require('mongoose');
const { questionIds, doshas, resultTypes } = require('../services/prakritiScoringService');
const schema = new mongoose.Schema({
  familyMemberId: { type: String, default: 'self', required: true },
  userId: { type: String, ref: 'User', required: true },
  answers: { type: [new mongoose.Schema({ questionId: { type: String, enum: questionIds, required: true }, selectedDosha: { type: String, enum: doshas, required: true } }, { _id: false })], validate: a => a.length === questionIds.length && new Set(a.map(v => v.questionId)).size === questionIds.length },
  resultType: { type: String, enum: resultTypes, required: true },
  internalScores: { vata: { type: Number, min: 0, max: 10, required: true }, pitta: { type: Number, min: 0, max: 10, required: true }, kapha: { type: Number, min: 0, max: 10, required: true } },
  questionnaireVersion: { type: String, default: '1', required: true },
  reportVersion: { type: String, default: '1', required: true },
  completedAt: { type: Date, default: Date.now, required: true },
}, { timestamps: true });
schema.index({ userId: 1, familyMemberId: 1, completedAt: -1, _id: -1 });
module.exports = mongoose.model('PrakritiAssessment', schema);
