import { Socket } from 'socket.io';

// ChatSocket extends Socket to include user-specific properties
export interface ChatSocket extends Socket {
  userId?: number;
  username?: string;
  activeChatId?: string;
  email?: string;
  avatar?: string;
}

export type StatusSocket = 'ok' | 'error';

// Creates a successful socket response
export function socketResponse(status: StatusSocket, msg?: string) {
  return new SocketResponse(status, msg);
}

// Creates an error socket response
export function socketErrorResponse(msg?: string) {
  return new SocketResponse('error', msg);
}

// Builder class for constructing socket responses
export class SocketResponse {
  private _status: StatusSocket;
  private _msg?: string;
  private _destination?: string;
  private _body?: any;

  constructor(status: StatusSocket, msg?: string) {
    this._status = status;
    this._msg = msg;
  }

  // Sets the destination (room ID)
  destination(roomId: string): this {
    this._destination = roomId;
    return this;
  }

  // Attaches a body payload to the response
  withBody(body: any): this {
    this._body = body;
    return this;
  }

  // Used implicitly by JSON.stringify, socket.emit, etc.
  toJSON() {
    return {
      status: this._status,
      msg: this._msg,
      destination: this._destination,
      body: this._body,
    };
  }

  // Explicit builder method if needed
  build() {
    return this.toJSON();
  }
}
