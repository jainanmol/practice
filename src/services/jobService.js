const { Profile, sequelize, Contract, Job } = require('../model');
const { Op } = require('sequelize');


// Update client balance
async function updateClientBalance(client, job, transaction) {
    let oldBalance = client.balance;
    let newBalance = oldBalance - job.price
    const [updatedRows] = await Profile.update(
        { balance: newBalance },
        {
            where: { id: client.id, balance: oldBalance },
            transaction
        }
    );

    if (updatedRows === 0) {
        // No rows updated, meaning the balance was modified by another transaction
        console.log('Transaction update failed')
        throw new Error('Balance update conflict, please retry');
    }
}

// Mark job as paid
async function markJobAsPaid(job, transaction) {
    await job.update(
        { paid: true, paymentDate: new Date().toISOString() },
        { transaction }
    );
}

// Update contractor balance
async function updateContractorBalance(contractorId, jobPrice, transaction) {
    const contractorProfile = await Profile.findOne({ where: { id: contractorId } });

    await contractorProfile.increment(
        { balance: jobPrice },
        { transaction }
    );
}

// Fetch unpaid jobs for a user
async function fetchUnpaidJobs(userId, page = 1, pageSize = 10) {
    const contracts = await Contract.findAll({
        offset: (page - 1) * pageSize,
        limit: pageSize,
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

    const totalContractsCount = await Contract.count({
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

    return { contracts, totalContractsCount, totalPages: Math.ceil(totalContractsCount / pageSize) };
}

// Fetch job by ID for payment
async function fetchJobForPayment(jobId, userId) {
    return await Job.findOne({
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
}


module.exports = {
    updateClientBalance,
    markJobAsPaid,
    updateContractorBalance,
    fetchUnpaidJobs,
    fetchJobForPayment,
};
