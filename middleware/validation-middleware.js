const {	ValidationError } = require("express-json-validator-middleware");

function validationErrorMiddleware(error, request, response, next) {
	if (response.headersSent) {
		return next(error); //non è un errore di valudazione
	}

	const isValidationError = error instanceof ValidationError;
	if (!isValidationError) {
		return next(error); //non è un errore di valudazione
	}

	response.status(400).json({
		errors: error.validationErrors, //riporta gli errori di validazione
	});

	next();
}

module.exports = validationErrorMiddleware;