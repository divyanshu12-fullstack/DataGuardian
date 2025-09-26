export class BaseController {
  static sendSuccess(res, data, message = "Success") {
    res.json({
      success: true,
      message,
      data,
    });
  }

  static sendError(res, error, status = 500) {
    res.status(status).json({
      success: false,
      error: error.message || error,
    });
  }
}
