// routes/contracts.js
const express = require('express');
const router = express.Router();
const handleError = require('../utils/errorHandler');
const { getProfile } = require('../middleware/getProfile');
const { PROFILE_TYPES } = require('../enums/database');
const { Op } = require('sequelize');


router.get('/', getProfile, async (req,res) => {
    const { Contract } = req.app.get('models');

    const profileFilterKey = req.profile.type === PROFILE_TYPES.CLIENT ? 'ClientId' : 'ContractorId';

    try {
        const contracts = await Contract.findAll({
            where: {
                [profileFilterKey]: req.profile.id,
                status : {
                    [Op.ne]: 'terminated'
                }
            }
        });

        if (!contracts) {
            return handleError(res, 404, 'Contract(s) not found for the given profile.');
        }

        return res.json(contracts);

    } catch (error) {
        console.error('Error fetching all contracts:', error);
        return handleError(res, 500, 'An error occurred while fetching the contract.');
    }

});


router.get('/:id', getProfile, async (req, res) => {
    const { Contract } = req.app.get('models');
    const { id } = req.params;

    // Determine the profile filter key
    const profileFilterKey = req.profile.type === PROFILE_TYPES.CLIENT ? 'ClientId' : 'ContractorId';

    try {
        const contract = await Contract.findOne({
            where: {
                id: id, // filter by id
                [profileFilterKey]: req.profile.id // dynamic profile filter
            }
        });

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
