const { Profile, Job, Contract, sequelize } = require('../src/model');
const { fetchUnpaidJobs, fetchJobForPayment, updateClientBalance, markJobAsPaid, updateContractorBalance } = require('../src/services/jobService');
const { Op } = require('sequelize');

jest.mock('../src/model');

describe('Job Service', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('fetchUnpaidJobs', () => {
        it('should fetch unpaid jobs for a user', async () => {
            const userId = 1;
            const contractsMock = [{ id: 1 }];
            const totalContractsCountMock = 1;

            Contract.findAll.mockResolvedValue(contractsMock);
            Contract.count.mockResolvedValue(totalContractsCountMock);

            const result = await fetchUnpaidJobs(userId);

            expect(Contract.findAll).toHaveBeenCalledWith({
                offset: 0,
                limit: 10,
                include: [{
                    model: Job,
                    where: {
                        paid: { [Op.or]: [false, null] },
                    },
                }],
                where: {
                    status: { [Op.ne]: 'terminated' },
                    [Op.or]: [{ ClientId: userId }, { ContractorId: userId }],
                },
            });

            expect(Contract.count).toHaveBeenCalledWith({
                include: [{
                    model: Job,
                    where: {
                        paid: { [Op.or]: [false, null] },
                    },
                }],
                where: {
                    status: { [Op.ne]: 'terminated' },
                    [Op.or]: [{ ClientId: userId }, { ContractorId: userId }],
                },
            });

            expect(result).toEqual({
                contracts: contractsMock,
                totalContractsCount: totalContractsCountMock,
                totalPages: 1,
            });
        });
    });

    describe('fetchJobForPayment', () => {
        it('should fetch job for payment by job ID and user ID', async () => {
            const jobId = 1;
            const userId = 1;
            const jobMock = { id: jobId };

            Job.findOne.mockResolvedValue(jobMock);

            const result = await fetchJobForPayment(jobId, userId);

            expect(Job.findOne).toHaveBeenCalledWith({
                where: { id: jobId },
                include: {
                    model: Contract,
                    include: {
                        model: Profile,
                        as: 'Client',
                    },
                    where: { ClientId: userId },
                },
            });

            expect(result).toEqual(jobMock);
        });
    });

    describe('updateClientBalance', () => {
        it('should update the client balance', async () => {
            const clientMock = { id: 1, balance: 100 };
            const jobMock = { price: 50 };
            const transactionMock = {};

            Profile.update.mockResolvedValue([1]);

            await updateClientBalance(clientMock, jobMock, transactionMock);

            expect(Profile.update).toHaveBeenCalledWith(
                { balance: clientMock.balance - jobMock.price },
                {
                    where: {
                        id: clientMock.id,
                        balance: clientMock.balance,
                    },
                    transaction: transactionMock,
                }
            );
        });

        it('should throw error if no rows were updated', async () => {
            const clientMock = { id: 1, balance: 100 };
            const jobMock = { price: 50 };
            const transactionMock = {};

            Profile.update.mockResolvedValue([0]);

            await expect(updateClientBalance(clientMock, jobMock, transactionMock))
                .rejects
                .toThrow('Balance update conflict, please retry');
        });
    });

    describe('markJobAsPaid', () => {
        it('should mark the job as paid', async () => {
            const jobMock = { update: jest.fn() };
            const transactionMock = {};

            await markJobAsPaid(jobMock, transactionMock);

            expect(jobMock.update).toHaveBeenCalledWith(
                { paid: true, paymentDate: expect.any(String) },
                { transaction: transactionMock }
            );
        });
    });

    describe('updateContractorBalance', () => {
        it('should update the contractor balance', async () => {
            const contractorId = 1;
            const jobPrice = 50;
            const transactionMock = {};
    
            const contractorProfileMock = {
                increment: jest.fn().mockResolvedValue([1]),
            };
    
            Profile.findOne.mockResolvedValue(contractorProfileMock);
    
            await updateContractorBalance(contractorId, jobPrice, transactionMock);
    
            expect(Profile.findOne).toHaveBeenCalledWith({ where: { id: contractorId } });
            expect(contractorProfileMock.increment).toHaveBeenCalledWith(
                { balance: jobPrice },
                { transaction: transactionMock }
            );
        });
    });
});
