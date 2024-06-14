// tests/contractService.test.js
const { getAllContracts, getContractById } = require('../src/services/contractService');
const { PROFILE_TYPES } = require('../src/enums/database');
const { Op } = require('sequelize');

describe('Contract Service', () => {
    const mockContractModel = {
        findAll: jest.fn(),
        findOne: jest.fn(),
    };
    const mockModels = {
        Contract: mockContractModel,
    };

    const clientProfile = {
        id: 1,
        type: PROFILE_TYPES.CLIENT,
    };

    const contractorProfile = {
        id: 2,
        type: PROFILE_TYPES.CONTRACTOR,
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getAllContracts', () => {
        it('should return all active contracts for a client profile', async () => {
            const contracts = [{ id: 1, status: 'active' }];
            mockContractModel.findAll.mockResolvedValue(contracts);

            const result = await getAllContracts(mockModels, clientProfile);

            expect(mockContractModel.findAll).toHaveBeenCalledWith({
                where: {
                    ClientId: clientProfile.id,
                    status: { [Op.ne]: 'terminated' },
                },
            });
            expect(result).toEqual(contracts);
        });

        it('should return all active contracts for a contractor profile', async () => {
            const contracts = [{ id: 2, status: 'active' }];
            mockContractModel.findAll.mockResolvedValue(contracts);

            const result = await getAllContracts(mockModels, contractorProfile);

            expect(mockContractModel.findAll).toHaveBeenCalledWith({
                where: {
                    ContractorId: contractorProfile.id,
                    status: { [Op.ne]: 'terminated' },
                },
            });
            expect(result).toEqual(contracts);
        });

        it('should return an empty array if no contracts found', async () => {
            mockContractModel.findAll.mockResolvedValue([]);

            const result = await getAllContracts(mockModels, clientProfile);

            expect(result).toEqual([]);
        });
    });

    describe('getContractById', () => {
        it('should return a contract if it belongs to the client profile', async () => {
            const contract = { id: 1, ClientId: clientProfile.id, status: 'active' };
            mockContractModel.findOne.mockResolvedValue(contract);

            const result = await getContractById(mockModels, clientProfile, 1);

            expect(mockContractModel.findOne).toHaveBeenCalledWith({
                where: {
                    id: 1,
                    ClientId: clientProfile.id,
                    status: { [Op.ne]: 'terminated' },
                },
            });
            expect(result).toEqual(contract);
        });

        it('should return a contract if it belongs to the contractor profile', async () => {
            const contract = { id: 2, ContractorId: contractorProfile.id, status: 'active' };
            mockContractModel.findOne.mockResolvedValue(contract);

            const result = await getContractById(mockModels, contractorProfile, 2);

            expect(mockContractModel.findOne).toHaveBeenCalledWith({
                where: {
                    id: 2,
                    ContractorId: contractorProfile.id,
                    status: { [Op.ne]: 'terminated' },
                },
            });
            expect(result).toEqual(contract);
        });

        it('should return null if contract is not found', async () => {
            mockContractModel.findOne.mockResolvedValue(null);

            const result = await getContractById(mockModels, clientProfile, 1);

            expect(result).toBeNull();
        });
    });
});
