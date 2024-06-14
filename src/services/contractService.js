// services/contractService.js
const { Op } = require('sequelize');
const { PROFILE_TYPES } = require('../enums/database');

// Get all active contracts for a given profile
async function getAllContracts(models, profile) {
    const { Contract } = models;
    const profileId = profile.id;
    const profileFilterKey = profile.type === PROFILE_TYPES.CLIENT ? 'ClientId' : 'ContractorId';

    return Contract.findAll({
        where: {
            [profileFilterKey]: profileId,
            status: {
                [Op.ne]: 'terminated' // Exclude terminated contracts
            }
        }
    });
}

// Get a specific contract by ID if it belongs to the given profile
async function getContractById(models, profile, contractId) {
    const { Contract } = models;
    const profileFilterKey = profile.type === PROFILE_TYPES.CLIENT ? 'ClientId' : 'ContractorId';

    return Contract.findOne({
        where: {
            id: contractId, // Filter by contract ID
            [profileFilterKey]: profile.id, // Ensure contract belongs to profile
            status: {
                [Op.ne]: 'terminated' // Exclude terminated contracts
            }
        }
    });
}

module.exports = {
    getAllContracts,
    getContractById,
};
