declare module 'tmi.js' {
  export interface ChatUserstate {
    'badge-info'?: Record<string, string>;
    badges?: Record<string, string>;
    color?: string;
    'display-name'?: string;
    emotes?: Record<string, string[]>;
    flags?: string;
    id?: string;
    mod?: boolean;
    'room-id'?: string;
    subscriber?: boolean;
    'tmi-sent-ts'?: string;
    turbo?: boolean;
    'user-id'?: string;
    'user-type'?: string;
    username?: string;
    'message-type'?: string;
  }

  export interface ClientOptions {
    channels?: string[];
    connection?: {
      secure?: boolean;
      reconnect?: boolean;
      server?: string;
      port?: number;
    };
    identity?: {
      username?: string;
      password?: string;
    };
  }

  export class Client {
    constructor(opts?: ClientOptions);
    connect(): Promise<[string, number]>;
    disconnect(): Promise<[string, number]>;
    on(
      event: 'message',
      handler: (channel: string, tags: ChatUserstate, message: string, self: boolean) => void
    ): void;
    on(event: 'connected', handler: (addr: string, port: number) => void): void;
    on(event: 'disconnected', handler: (reason: string) => void): void;
    on(event: string, handler: (...args: unknown[]) => void): void;
  }
}
