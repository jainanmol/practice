const express = require('express');
const router = express.Router();
const handleError = require('../utils/errorHandler');
const { getProfile } = require('../middleware/getProfile');
const { PROFILE_TYPES } = require('../enums/database');
const { Op } = require('sequelize');
const { Profile } = require('../model');


router.get('/unpaid', getProfile, async (req, res) => {
    const { Job, Contract } = req.app.get('models');
    const userId = req.profile.id;
    const page = req.query.page ? parseInt(req.query.page) : 1;
    const pageSize = 10; // Number of contracts with unpaid jobs per page

    try {
        const contracts = await Contract.findAll({
            offset: (page - 1) * pageSize,
            limit: pageSize,
            include: [
                {
                    model: Job,
                    where: {
                        [Op.or]: [
                            { paid: { [Op.or]: [false, null] } }, // Jobs that are unpaid or have null value for paid
                        ],
                    },
                }
            ],
            where: {
                [Op.and]: [
                    { status: { [Op.ne]: 'terminated' } },
                    { [Op.or]: [{ ClientId: userId }, { ContractorId: userId }] },
                ],
            },
        });

        const totalContractsCount = await Contract.count({
            include: [
                {
                    model: Job,
                    where: {
                        [Op.or]: [
                            { paid: { [Op.or]: [false, null] } }, // Jobs that are unpaid or have null value for paid
                        ],
                    },
                },
            ],
            where: {
                [Op.and]: [
                    { status: { [Op.ne]: 'terminated' } },
                    { [Op.or]: [{ ClientId: userId }, { ContractorId: userId }] },
                ],
            },
        });

        const totalPages = Math.ceil(totalContractsCount / pageSize);

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


router.post('/:job_id/pay', getProfile, async (req, res) => {
    const { Job, Contract, Profile } = req.app.get('models');
    const userId = req.profile.id;
    const { job_id } = req.params;

    if (req.profile.type === PROFILE_TYPES.CONTRACTOR) {
        return handleError(res, 403, 'Contractors are not allowed to pay for jobs.');
    }

    try {
        const job = await Job.findOne({
            where: {
                id: job_id,
            },
            include: {
                model: Contract,
                include: {
                    model: Profile,
                    as: 'Client'
                },
                where: {
                    ClientId: userId,
                }
            }
        })
        console.log('job data', job.toJSON())

        if (!job) {
            return handleError(res, 404, 'Invalid job id');
        }

        if (job.Contract.status === 'terminated') {
            return handleError(res, 403, 'Payments for terminated contracts are not allowed.');
        }

        if (job.paid) {
            return res.status(200).json({ message: 'Job is already marked paid'});
        }

        let clientData = job.Contract.Client;
        if (job.price > clientData.balance) {
            return handleError(res, 400, `Insufficient balance. Add ${job.price - clientData.balance} more to your wallet.`);
        }

        const tx = await sequelize.transaction();
        try {
            await markJobAsPaid(job, tx);
            await updateClientBalance(clientData, job.price, tx);
            await updateContractorBalance(job.Contract.ContractorId, job.price, tx);
            await tx.commit();
            return res.status(200).json({ message: 'Job marked paid!' });
        } catch (error) {
            await tx.rollback();
            return handleError(res, 500, 'An error occurred while making the payment, please try again later.');
        }
    } catch (error) {
        return handleError(res, 500, 'An error occurred while making the payment, please try again later.');
    }




})


async function updateClientBalance(clientData, jobPrice, transaction) {
    
    let oldClientBalance = clientData.balance;
    let newClientBalance = oldClientBalance - jobPrice;
    let updatedRows = await Profile.update(
        { balance: newClientBalance },
        {
            where: {
                id: job.Contract.ClientId,
                balance: oldClientBalance
            }
        },
        { transaction }
    );

    if (updatedRows === 0) {
        // No rows updated, meaning the balance was modified by another transaction
        throw new Error('Balance update conflict, please retry');
    }
}

async function markJobAsPaid(job, transaction) {
    await job.update(
        { paid: true, paymentDate: new Date().toISOString() },
        { transaction }
    );
}

async function updateContractorBalance(contractorId, jobPrice, transaction) {
    const contractorProfile = await Profile.findOne({ where: { id: contractorId } });

    await contractorProfile.increment(
        { balance: jobPrice },
        { transaction }
    );
}
module.exports = router;