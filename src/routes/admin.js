const express = require('express');
const router = express.Router();
const handleError = require('../utils/errorHandler');
const { getProfile } = require('../middleware/getProfile');
const moment = require('moment');
const bestProfessionService = require('../services/bestProfessionService')
const bestClientsService = require('../services/bestClientsService')
const { isValidDateRange } = require('../utils/helpers')

router.use(getProfile)

function validateDate(req, res, next) {
    const dateFormat = 'YYYY-MM-DD';
    const { start, end } = req.query;

    if (!moment(start, dateFormat, true).isValid() || !moment(end, dateFormat, true).isValid()) {
        return handleError(res, 400, 'Invalid date format. Please use YYYY-MM-DD format (e.g., 2020-08-15)');
    }

    if (!isValidDateRange(start, end)) {
        return handleError(res, 400, 'Start date must be less than or equal to end date.');
    }

    next();
}

router.get('/best-profession', validateDate, async (req, res) => {
    let { start, end, timezone } = req.query;

    try {
        const bestProfession = await bestProfessionService.getBestProfession(start, end, timezone);
        if (bestProfession) {
            return res.status(200).json({
                profession: bestProfession.profession,
                total_earnings: bestProfession.total_earnings
            });
        }
        return res.status(404).json({ message: 'No professions found in the given date range.' });
    } catch (error) {
        console.error('Error fetching best profession:', error);
        return handleError(res, 500, 'An error occurred while fetching the best profession. Please try again later.');
    }

})

router.get('/best-clients', validateDate, async (req, res) => {
    let { start, end, limit, timezone } = req.query;

    try {
        const bestClients = await bestClientsService.getBestClients(start, end, limit, timezone);
        if (bestClients.length) {
            return res.status(200).json(bestClients);
        }
        return res.status(404).json({ message: 'No clients found in the given date range.' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'An error occurred while retrieving the best clients.' });
    }
})

module.exports = router;