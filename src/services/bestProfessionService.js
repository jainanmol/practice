// bestProfessionService.js

const { Op, fn, col, literal } = require('sequelize');
const { Job, Contract, Profile } = require('../model');
const { getDefaultTimezone } = require('../utils/helpers')
const moment = require('moment');

async function getBestProfession(start, end, timezone = null) {
    const dateFormat = 'YYYY-MM-DD';

    const clientTimezone = timezone || getDefaultTimezone();
    const startDate = moment.tz(start, dateFormat, clientTimezone).startOf('day').toISOString();
    const endDate = moment.tz(end, dateFormat, clientTimezone).endOf('day').toISOString();

    try {
        const bestProfession = await Job.findAll({
            attributes: [
                [fn('sum', col('price')), 'total_earnings'],
                [col('Contract.Contractor.profession'), 'profession']
            ],
            where: {
                paid: true,
                paymentDate: {
                    [Op.between]: [startDate, endDate]
                }
            },
            include: {
                model: Contract,
                include: {
                    model: Profile,
                    as: 'Contractor',
                    attributes: []
                }
            },
            group: ['Contract.Contractor.profession'],
            order: [[literal('total_earnings'), 'DESC']],
            limit: 1
        });

        return bestProfession.length ? bestProfession[0].dataValues : null;
    } catch (error) {
        console.error('Error fetching best profession:', error);
        throw new Error('An error occurred while fetching the best profession.');
    }
}

module.exports = { getBestProfession };
