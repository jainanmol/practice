const { Op } = require('sequelize');
const { Job, Profile, sequelize, Contract } = require('../model'); // Assuming your models are exported from '../models'

async function depositMoney(userId, amount) {
    try {
        //Excluding terminated contracts
        const unpaidJobs = await Job.findAll({
            include: {
                model: Contract,
                where: {
                    status: { [Op.ne]: 'terminated' },
                    ClientId: userId,
                },
            },
            where: {
                paid: { [Op.or]: [false, null] },
            },
        });

        const totalOutstanding = unpaidJobs.reduce((acc, job) => acc + job.price, 0);
        const maxAllowedDeposit = totalOutstanding * 0.25;

        if (amount > maxAllowedDeposit) {
            return { status: false, message: `Deposit amount exceeds the limit. You can only deposit up to 25% of your total outstanding job payments, which is ${maxAllowedDeposit}.` };
        }

        const tx = await sequelize.transaction();
        try {
            await Profile.increment({ balance: amount }, { where: { id: userId }, transaction: tx });
            await tx.commit();
            return { success: true, message: 'Deposit successful.' };
        } catch (error) {
            await tx.rollback();
            console.error('Deposit transaction failed:', error);
            return { success: false, message: 'An error occurred while processing the deposit, please try again later.' };
        }
    } catch (error) {
        console.error('Error processing deposit:', error);
        return { success: false, message: 'An error occurred while processing the deposit, please try again later.' };
    }
}

module.exports = { depositMoney };
