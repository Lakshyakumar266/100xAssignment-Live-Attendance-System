import dotenv from "dotenv";

dotenv.config();

export const DB_URI = process.env.DB_URI;

if (!DB_URI) {
    throw new Error("DB_URI is not set");
}

export const JWT_SECRET = process.env.JWT_SECRET!; 
if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not set");
}