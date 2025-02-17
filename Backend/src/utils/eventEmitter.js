const EventEmitter = require('events');

class AppEventEmitter extends EventEmitter {}

module.exports = new AppEventEmitter();