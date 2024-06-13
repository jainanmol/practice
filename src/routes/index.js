const express = require('express');
const router = express.Router();

const contractsRouter = require('./contracts');
const jobsRouter = require('./jobs');

router.use('/contracts', contractsRouter);
router.use('/jobs', jobsRouter);

module.exports = router;
