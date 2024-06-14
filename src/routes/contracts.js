// routes/contracts.js
const express = require('express');
const router = express.Router();
const handleError = require('../utils/errorHandler');
const { getProfile } = require('../middleware/getProfile');
const contractService = require('../services/contractService');

router.use(getProfile);

router.get('/', async (req, res) => {
    try {
        const contracts = await contractService.getAllContracts(req.app.get('models'), req.profile);

        if (!contracts || contracts.length === 0) {
            return handleError(res, 404, 'Contract(s) not found for the given profile.');
        }

        return res.json(contracts);

    } catch (error) {
        console.error('Error fetching all contracts:', error);
        return handleError(res, 500, 'An error occurred while fetching the contract.');
    }

});


router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const contract = await contractService.getContractById(req.app.get('models'), req.profile, id);

        if (!contract) {
            return handleError(res, 404, 'Contract not found for the given profile.');
        }

        res.json(contract);
    } catch (error) {
        console.error('Error fetching contract:', error);
        return handleError(res, 500, 'An error occurred while fetching the contract.');
    }
});


module.exports = router;
