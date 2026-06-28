const AppError = require("../AppError");

function createSuccessResponse(data) {
  return {
    success: true,
    data,
    error: null,
  };
}

function createErrorResponse(error) {
  if (error instanceof AppError) {
    return {
      success: false,
      data: null,
      error: {
        code: error.errorCode,
        message: error.message,
        details: error.details,
      },
    };
  }

  return {
    success: false,
    data: null,
    error: {
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred",
      details: {},
    },
  };
}

module.exports = { createSuccessResponse, createErrorResponse };
