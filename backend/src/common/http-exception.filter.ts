import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse();
    const request = context.getRequest();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;

    const message =
      typeof exceptionResponse === "string"
        ? exceptionResponse
        : typeof exceptionResponse === "object" && exceptionResponse && "message" in exceptionResponse
          ? Array.isArray(exceptionResponse.message)
            ? exceptionResponse.message.join(", ")
            : String(exceptionResponse.message)
          : exception instanceof Error
            ? exception.message
            : "Something went wrong";

    if (status >= 500) {
      const errorText = exception instanceof Error ? exception.stack || exception.message : String(exception);
      this.logger.error(`${request.method} ${request.url} failed`, errorText);
    }

    response.status(status).json({
      success: false,
      message,
      statusCode: status,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
