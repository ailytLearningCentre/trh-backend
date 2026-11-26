const router = require('express').Router();
const { authenticateUser } = require('../middlewares/authMiddleware');
const controller = require('../controllers/prakritiController');
router.use(authenticateUser, controller.owner);
router.post('/assessments', controller.create);
router.get('/assessments', controller.history);
router.get('/assessments/latest', controller.latest);
router.get('/assessments/:id', controller.byId);
module.exports = router;
