import type { Jwt, JwtPayload } from "jsonwebtoken";
import type { Types } from "mongoose";

export class Response {
    constructor(public success: boolean, public data?: any, public error?: string) { }
    static success(data: any) {
        return new Response(true, data);
    }
    static error(message?: string) {
        return new Response(false, undefined, message || "An error occurred");
    }
    toJson() {
        return {
            success: this.success,
            ...(this.success ? { data: this.data } : { error: this.data.message }),
        };
    }
}


export type WsEvent = 'ATTENDANCE_MARKED' | 'TODAY_SUMMARY' | "MY_ATTENDANCE" | 'ERROR' | 'DONE';
// export interface WsData {
//     message?: string;
    
// }

export class WsResponse {
    constructor(public event: WsEvent, public data?: any,) {
        return new WsResponse(event, data);
    }

    static response(event: WsEvent, data: any) {
        return JSON.stringify({ event, data });
    }

    toJson() {
        return {
            event: this.event,
            data: this.data,
        };
    }
}




export interface JwtToken extends Jwt {
    userid: string;
    role: string;
}


export interface studentObject {
    _id: Types.ObjectId;
    name: string;
    email: string;
    role?: string;
}
export interface classObject {
    _id: Types.ObjectId;
    className: string;
    teacherId: Types.ObjectId;
    studentIds?: studentObject[];
    students?: studentObject[];
}


export type SocketMessage = "ATTENDANCE_MARKED" | "TODAY_SUMMARY" | "MY_ATTENDANCE" | "ERROR" | "DONE";

export interface SocketData {
    event: SocketMessage;
    data: any;
}
