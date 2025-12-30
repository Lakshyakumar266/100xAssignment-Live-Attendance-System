import mongoose, { type ConnectOptions } from 'mongoose';
import { DB_URI } from '../env.js';

const uri: string = DB_URI!;
if (!uri) {
    throw new Error("Please define the DB_URI environment variable");
}

// Type definitions for global cache
interface MongooseCache {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
}

// Use Node.js global type or create our own
declare global {
    var mongooseCache: MongooseCache | undefined;
}

// Initialize or use existing cache
let cached: MongooseCache = global.mongooseCache || { conn: null, promise: null };

// Store in global variable for hot reloads in development
if (process.env.NODE_ENV !== 'production') {
    global.mongooseCache = cached;
}

export async function connectDB(): Promise<typeof mongoose> {
    if (cached.conn) {
        console.log('Using cached MongoDB connection');
        return cached.conn;
    }

    if (!cached.promise) {
        const options: ConnectOptions = {
            bufferCommands: false,
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            family: 4, // Use IPv4, skip trying IPv6
        };

        console.log('Creating new MongoDB connection...');

        // Type assertion to handle the promise type
        cached.promise = mongoose.connect(uri, options)
            .then((mongooseInstance) => {
                console.log('✅ MongoDB connected via Mongoose');
                return mongooseInstance;
            })
            .catch((error) => {
                console.error('❌ MongoDB connection error:', error);
                cached.promise = null; // Reset on error
                throw error;
            }) as Promise<typeof mongoose>;
    }

    try {
        cached.conn = await cached.promise;
    } catch (error) {
        cached.promise = null;
        throw error;
    }

    return cached.conn;
}

// Optional: Export a function to get the database directly
export async function getDB() {
    await connectDB();
    return mongoose.connection.db;
}

// Event listeners for connection status
mongoose.connection.on('connected', () => {
    console.log('Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
    console.error('Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('Mongoose disconnected from MongoDB');
});

// Graceful shutdown handler
const gracefulShutdown = async (signal: string) => {
    console.log(`${signal} received: closing MongoDB connection`);
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    process.exit(0);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

export default connectDB;