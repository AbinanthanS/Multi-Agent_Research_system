export class ApiError extends Error {
  constructor(statusCode, code, message) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

/*

This lets the service layer report predictable errors
such as 404 RESEARCH_RUN_NOT_FOUND without leaking SQL errors to clients.

*/