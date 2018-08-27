class BaseError extends Error {
    constructor(statusCode, ...params) {
        super(...params);
        this.statusCode = statusCode;
    }
}

class ValidationError extends BaseError {
    constructor(...params) {
        super(417, ...params);
        console.log('in throw');
        frappe.events.trigger('message', 'message');
    }
}

class NotFound extends BaseError {
    constructor(...params) {
        super(404, ...params);
    }
}

class Forbidden extends BaseError {
    constructor(...params) {
        super(403, ...params);
    }
}

class ValueError extends ValidationError { }
class Conflict extends ValidationError { }

function throwError(message, error=ValidationError) {
    const err = new Error();
    frappe.events.trigger('throw', {error, message, stackTrace: err.stack});
    throw err;
}

module.exports = {
    ValidationError,
    ValueError,
    Conflict,
    NotFound,
    Forbidden,
    throw: throwError
}
