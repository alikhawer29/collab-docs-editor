export class HttpError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

export class ConflictError extends HttpError {
  readonly current: {
    id: string;
    title: string;
    content: string;
    revision: number;
    updatedAt: string;
  };

  constructor(current: ConflictError["current"]) {
    super("A newer version is saved. Reload before editing.", 409);
    this.name = "ConflictError";
    this.current = current;
  }
}
