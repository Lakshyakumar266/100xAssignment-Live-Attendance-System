import type { Request, Response as expressResponse, NextFunction } from "express";
import { Response, type JwtToken } from "../utils.js";
import { JWT_SECRET } from "../env.js";
import jwt, { type JwtPayload, type JwtHeader, type Secret } from 'jsonwebtoken';
import type { IClass } from "../db/class.model.js";
import type { HydratedDocument } from "mongoose";
import Class from "../db/class.model.js";
import mongoose from "mongoose";
import User from "../db/user.model.js";

type AllowedRoles = 'teacher' | 'student';

export function verifyToken(token: string, secret: Secret): JwtPayload | null {
    try {
        const decoded = jwt.verify(token, secret) as JwtPayload;
        return decoded;
    } catch (error) {
        // Handle verification errors (e.g., expired token, invalid signature)
        console.error(error);
        return null;
    }
}


export const authMiddleware = async (req: Request, res: expressResponse, next: NextFunction) => {
    try {

        let token = req.headers.authorization;

        if (req.headers.authorization?.includes('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json(Response.error("Unauthorized, token missing or invalid"));
        }
        const decoded = verifyToken(token, JWT_SECRET!);
        if (!decoded) {
            return res.status(401).json(Response.error("Unauthorized, token missing or invalid"));
        }

        req.user = decoded;

        next();
    } catch (error) {
        console.log(error);

        return res.status(401).json(Response.error("Unauthorized, token missing or invalid"));
    }
};

export const roleMiddleware = (allowedRoles: AllowedRoles[]) => {

    return (req: Request, res: expressResponse, next: NextFunction) => {
        let token = req.headers.authorization;
        if (req.headers.authorization?.includes('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json(Response.error("Unauthorized, token missing or invalid"));
        }
        const decoded = verifyToken(token, JWT_SECRET!);
        if (!decoded) {
            return res.status(401).json(Response.error("Unauthorized, token missing or invalid"));
        }

        req.user = decoded;

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json(Response.error("Forbidden, teacher access required"));
        }

        next();
    };
};

export const classMiddleware = (allowedRoles: AllowedRoles[]) => {
    return async (req: Request, res: expressResponse, next: NextFunction) => {
        const classId = req.params.id;
        let token = req.headers.authorization;
        if (req.headers.authorization?.includes('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json(Response.error("Unauthorized, token missing or invalid"));
        }
        const decoded = verifyToken(token, JWT_SECRET!);
        if (!decoded) {
            return res.status(401).json(Response.error("Unauthorized, token missing or invalid"));
        }

        if (!allowedRoles.includes(decoded.role)) {
            return res.status(403).json(Response.error("Forbidden, teacher access required"));
        }

        const classObj: HydratedDocument<IClass> | null = await Class.findById(classId);
        if (!classObj) {
            return res.status(404).json(Response.error("Class not found"));
        }
        const mongooseUserId = new mongoose.Types.ObjectId(decoded.userid);

        
        if (decoded.role === 'teacher') {
            if (!classObj.teacherId.equals(mongooseUserId)) {

                return res.status(403).json(Response.error("Forbidden, not class teacher"));
            }
        } else if (decoded.role === 'student') {
            if (!classObj.studentIds.includes(mongooseUserId)) {
                return res.status(403).json(Response.error("Forbidden, not class teacher"));
            }
        } else {
            return res.status(403).json(Response.error("Unauthorized, token missing or invalid"));
        }
        next();
    };
};