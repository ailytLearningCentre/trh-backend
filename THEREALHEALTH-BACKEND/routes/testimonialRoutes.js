const router = require('express').Router();
const Testimonial = require('../models/Testimonial');
const { authenticateUser, authenticateAdmin } = require('../middlewares/authMiddleware');

const statuses = ['pending', 'approved', 'rejected'];
const clean = (value) => typeof value === 'string' ? value.trim() : '';

function validPhotoUrl(value) {
  try {
    const url = new URL(value);
    return value.length <= 2048 && url.protocol === 'https:' &&
      !url.username && !url.password;
  } catch {
    return false;
  }
}

function serialize(review, staff = false) {
  const { _id, userName, rating, feedback, programName, photoUrl, photoApproved,
    consentGiven, status, featured, createdAt } = review;
  return {
    id: String(_id), userName, rating, feedback, programName, consentGiven,
    status, featured, createdAt,
    ...(staff || photoApproved ? { photoUrl, photoApproved } : {}),
  };
}

router.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

router.get('/', async (req, res) => {
  if (req.query.status !== undefined && req.query.status !== 'approved') {
    return res.status(400).json({ message: 'Only approved testimonials are public.' });
  }
  const reviews = await Testimonial.find({ status: 'approved', consentGiven: true })
    .sort({ featured: -1, createdAt: -1, _id: -1 }).lean();
  res.json({ testimonials: reviews.map((review) => serialize(review)) });
});

router.post('/', authenticateUser, async (req, res) => {
  const { rating, consentGiven } = req.body ?? {};
  const feedback = clean(req.body?.feedback);
  const programName = clean(req.body?.programName);
  const displayName = clean(req.body?.userName);
  const photoUrl = clean(req.body?.photoUrl);
  if (typeof consentGiven !== 'boolean') {
    return res.status(400).json({ message: 'Choose whether to allow public display.' });
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5 ||
      !feedback || feedback.length > 500 || !programName || programName.length > 80 ||
      displayName.length > 60 || (photoUrl && !validPhotoUrl(photoUrl))) {
    return res.status(400).json({ message: 'Check the rating, feedback, program, name and HTTPS photo URL.' });
  }
  const review = await Testimonial.create({
    rating, feedback, programName, consentGiven,
    userName: consentGiven && displayName ? displayName : 'TRH member',
    photoUrl: consentGiven && photoUrl ? photoUrl : null,
  });
  res.status(201).json({ id: String(review._id), status: review.status });
});

router.get('/moderation', authenticateAdmin, async (req, res) => {
  const status = req.query.status ?? 'pending';
  if (!statuses.includes(status)) {
    return res.status(400).json({ message: 'Invalid testimonial status.' });
  }
  const reviews = await Testimonial.find({ status }).sort({ createdAt: -1, _id: -1 }).lean();
  res.json({ testimonials: reviews.map((review) => serialize(review, true)) });
});

router.patch('/:id', authenticateAdmin, async (req, res) => {
  const { status, featured, photoApproved } = req.body ?? {};
  if (!/^[a-f0-9]{24}$/i.test(req.params.id) || !statuses.includes(status) ||
      typeof featured !== 'boolean' || typeof photoApproved !== 'boolean' ||
      (status !== 'approved' && (featured || photoApproved))) {
    return res.status(400).json({ message: 'Invalid moderation decision.' });
  }
  const match = { _id: req.params.id };
  if (status === 'approved') match.consentGiven = true;
  if (photoApproved) match.photoUrl = { $type: 'string', $ne: '' };
  const review = await Testimonial.findOneAndUpdate(match,
    { $set: { status, featured, photoApproved } }, { new: true, runValidators: true }).lean();
  if (!review) {
    return res.status(409).json({ message: 'Review unavailable or missing public consent or an approved photo URL.' });
  }
  res.json({ testimonial: serialize(review, true) });
});

module.exports = router;
