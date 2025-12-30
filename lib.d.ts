
export declare global {
    namespace Express {
      interface Request {
        user: Context
      }
    }
  }
  
declare module 'ws' {
    interface WebSocket {
        user?: { usrid: string, role: string };
    }
}
