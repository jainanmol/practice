const express = require('express');
const router = express.Router();
const handleError = require('../utils/errorHandler');
const { getProfile } = require('../middleware/getProfile');
const { PROFILE_TYPES } = require('../enums/database');
const { sequelize } = require('../model');
const jobService = require('../services/jobService');


router.get('/unpaid', getProfile, async (req, res) => {
    const userId = req.profile.id;
    const page = req.query.page ? parseInt(req.query.page) : 1;
    const pageSize = 10; // Number of contracts with unpaid jobs per page

    try {
        const { contracts, totalContractsCount, totalPages } = await jobService.fetchUnpaidJobs(userId, page, pageSize);

        const result = {
            contracts: contracts,
            pagination: {
                page: page,
                pageSize: pageSize,
                totalContracts: totalContractsCount,
                totalPages: totalPages,
            },
        };

        return res.json(result);
    } catch (error) {
        console.error('Error fetching unpaid contracts:', error);
        return handleError(res, 500, 'An error occurred while fetching the unpaid jobs');
    }


})

// POST /jobs/:job_id/pay - Pay for a job, a client can only pay if his balance >= the amount to pay.
router.post('/:job_id/pay', getProfile, async (req, res) => {
    const userId = req.profile.id;
    const { job_id } = req.params;

    if (req.profile.type === PROFILE_TYPES.CONTRACTOR) {
        return handleError(res, 403, 'Contractors are not allowed to pay for jobs!');
    }

    try {
        const job = await jobService.fetchJobForPayment(job_id, userId);

        if (!job) {
            return handleError(res, 404, 'Invalid job id');
        }

        if (job.Contract.status === 'terminated') {
            return handleError(res, 403, 'Payments for terminated contracts are not allowed.');
        }

        if (job.paid) {
            return res.status(200).json({ message: 'Job is already marked paid' });
        }

        const contract = job.Contract;
        const client = contract.Client;
        if (job.price > client.balance) {
            return handleError(res, 400, `Insufficient balance. Add ${job.price - client.balance} more to your wallet.`);
        }

        const tx = await sequelize.transaction();

        try {
            await jobService.markJobAsPaid(job, tx);
            await jobService.updateClientBalance(client, job, tx);
            await jobService.updateContractorBalance(job.Contract.ContractorId, job.price, tx);
            await tx.commit();
            return res.status(200).json({ message: 'Job marked paid!' });
        } catch (error) {
            console.log('Error while making job payment, reverting transation', error)
            await tx.rollback();
            return handleError(res, 500, 'An error occurred while making the payment, please try again later.');
        }
    } catch (error) {
        console.log('Error while making job payment', error)
        return handleError(res, 500, 'An error occurred while making the payment, please try again later.');
    }
})

module.exports = router;