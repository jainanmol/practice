const moment = require('moment');

function getDefaultTimezone() {
    return 'UTC'    
}

function isValidDateRange(start, end) {
    return moment(start).isSameOrBefore(end);
}

module.exports = {
    getDefaultTimezone,
    isValidDateRange,
};