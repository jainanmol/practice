// bestClientsService.js

const { Op, fn, col, literal } = require('sequelize');
const { Job, Contract, Profile } = require('../model');
const { getDefaultTimezone } = require('../utils/helpers')
const moment = require('moment');

async function getBestClients(start, end, limit = 2, timezone = null) {
    const dateFormat = 'YYYY-MM-DD';

    const clientTimezone = timezone || getDefaultTimezone();
    const startDate = moment.tz(start, dateFormat, clientTimezone).startOf('day').toISOString();
    const endDate = moment.tz(end, dateFormat, clientTimezone).endOf('day').toISOString();

    try {
        const bestClients = await Job.findAll({
            attributes: [
                [fn('sum', col('price')), 'total_paid'],
                [col('Contract.Client.id'), 'clientId'],
                [col('Contract.Client.firstName'), 'firstName'],
                [col('Contract.Client.lastName'), 'lastName']
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
                    as: 'Client',
                    attributes: []
                }
            },
            group: ['Contract.Client.id'],
            order: [[literal('total_paid'), 'DESC']],
            limit: limit ? parseInt(limit, 10) : 2,
        });

        return bestClients.map(client => ({
            id: client.dataValues.clientId,
            fullName: `${client.dataValues.firstName} ${client.dataValues.lastName}`,
            paid: parseFloat(client.dataValues.total_paid)
        }));
    } catch (error) {
        console.error('Error fetching best clients:', error);
        throw new Error('An error occurred while fetching the best clients.');
    }
}

module.exports = { getBestClients };
