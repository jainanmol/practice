const express = require('express');
const router = express.Router();
const handleError = require('../utils/errorHandler');
const { getProfile } = require('../middleware/getProfile');
const { PROFILE_TYPES } = require('../enums/database');
const depositService = require('../services/depositService');

router.post('/deposit/:userId', getProfile, async (req, res) => {
    const userId = req.profile.id;
    const { amount } = req.body;

    if (!Number.isInteger(parseInt(amount))) {
        return handleError(res, 500, 'Amount must be a valid integer.');
    }

    if (req.profile.type === PROFILE_TYPES.CONTRACTOR) {
        return handleError(res, 403, 'Contractors are not allowed to deposit money.');
    }
    try {
        const result = await depositService.depositMoney(userId, amount);
        if (result.status) {
            return res.status(200).json({ message: result.message, newBalance: req.profile.balance + amount });
        }
        return handleError(res, 400, result.message || 'An error occurred while processing the deposit.');
    } catch (error) {
        console.error('Error processing deposit:', error);
        return handleError(res, error.status || 500, error.message || 'An error occurred while processing the deposit.');
    }
})

module.exports = router