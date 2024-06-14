const express = require('express');
const router = express.Router();
const handleError = require('../utils/errorHandler');
const { getProfile } = require('../middleware/getProfile');
const { Op, fn, col, literal } = require('sequelize');
const { Profile, sequelize } = require('../model');
const moment = require('moment');
const { getDefaultTimezone } = require('../utils/helpers')

router.get('/best-profession', getProfile, async (req, res) => {
    const { Job, Contract } = req.app.get('models');
    const dateFormat = 'YYYY-MM-DD';
    let { start, end, timezone } = req.query;

    if (!moment(start, dateFormat, true).isValid() || !moment(end, dateFormat, true).isValid()) {
        return res.status(400).json({ error: 'Invalid date format. Please use YYYY-MM-DD format (e.g., 2020-08-15)' });
    }

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

        if (!bestProfession.length) {
            return res.status(404).json({ message: 'No professions found in the given date range.' });
        }

        return res.status(200).json({
            profession: bestProfession[0].dataValues.profession,
            total_earnings: bestProfession[0].dataValues.total_earnings
        });

    } catch (error) {
        console.error('Error fetching best profession:', error);
        return handleError(res, 500, 'An error occurred while fetching the best profession. Please try again later.');
    }

})

router.get('/best-clients', getProfile, async (req, res) => {
    let resp = [];

    const { Job, Contract } = req.app.get('models');
    const dateFormat = 'YYYY-MM-DD';
    let { start, end, limit, timezone } = req.query;

    if (!moment(start, dateFormat, true).isValid() || !moment(end, dateFormat, true).isValid()) {
        return res.status(400).json({ error: 'Invalid date format. Please use YYYY-MM-DD format (e.g., 2020-08-15)' });
    }

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
        })

        if (!bestClients.length) {
            return res.status(404).json({ message: 'No client found in the given date range' });
        }

        resp = bestClients.map(client => ({
            id: client.dataValues.clientId,
            fullName: `${client.dataValues.firstName} ${client.dataValues.lastName}`,
            paid: parseFloat(client.dataValues.total_paid)
        }));

        return res.status(200).json(resp);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'An error occurred while retrieving the best clients.' });
    }


})

module.exports = router;