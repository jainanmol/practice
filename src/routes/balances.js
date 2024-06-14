const express = require('express');
const router = express.Router();
const handleError = require('../utils/errorHandler');
const { getProfile } = require('../middleware/getProfile');
const { PROFILE_TYPES } = require('../enums/database');
const { Op, Model } = require('sequelize');

router.get('/deposit/:userId', getProfile, async (req,res) => {

    const { Job, Contract } = req.app.get('models');
    const userId = req.profile.id;
    let { amount } = req.params;

    if (req.profile.type === PROFILE_TYPES.CONTRACTOR) {
        return handleError(res, 403, 'Contractors are not allowed to deposit money.');
    }

    try{
        //Excluding terminated contracts
        const unpaidJobs = await Jobs.findAll({
            include : {
                model: Contract,
                where: {
                    status: { [Op.ne]: 'terminated' } ,
                    ClientId: userId ,
                }
            },
            where: {
                paid: { [Op.or]: [false, null] }
            }
        });

        const totalOutstanding = unpaidJobs.reduce((acc, job) =>{
            return acc + job.price
        },0)

        const maxAllowedDeposit = totalOutstanding * 0.25;

        if(amount > maxAllowedDeposit){
            return handleError(res, 400, `Deposit amount exceeds the limit. You can only deposit up to 25% of your total outstanding job payments, which is ${maxDepositAmount}.`);
        }

        const tx = await sequelize.transaction();
        try {
            await Profile.increment(
                { balance: amount },
                { where: { id: userId }, transaction: tx }
            );

            await tx.commit();
            return res.status(200).json({ message: 'Deposit successful.', newBalance: req.profile.balance + amount });
        } catch (error) {
            await tx.rollback();
            console.error('Deposit transaction failed:', error);
            return handleError(res, 500, 'An error occurred while processing the deposit, please try again later.');
        }
    }catch(error){
        console.error('Error processing deposit:', error);
        return handleError(res, 500, 'An error occurred while processing the deposit, please try again later.');
    }
})

module.exports = router