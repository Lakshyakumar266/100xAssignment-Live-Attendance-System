import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import classRoutes from "./routes/class.js";
import connectDB from "./db/db.connect.js";
import { authMiddleware, roleMiddleware} from "./middleware/auth.middleware.js";
import { Response, type studentObject } from "./utils.js";
import User from "./db/user.model.js";
import { SessionSchema } from "./zod.js";
import type { IClass } from "./db/class.model.js";
import type { HydratedDocument } from "mongoose";
import Class from "./db/class.model.js";
import mongoose from "mongoose";
import { createServer } from 'http';
import {initWebSocket } from "./ws/websocket.route.js";

const PORT = process.env.PORT || 3000;

const app = express();
export const server = createServer(app);

initWebSocket(server)

app.use(cors());
// app.options('*', cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

connectDB()
    .then(() => {
        console.log('Database connection established');

        server.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    })
    .catch((error) => {
        console.error('Failed to connect to database:', error);
        process.exit(1);
    });


interface ActiveSession {
    classId: string,
    startedAt: string,
    attendance: {
        [studentId: string]: "present" | "absent",
    }
}

export let activeSession: ActiveSession | null = null;

export const clearSession = function () {
    activeSession = null;
}

app.use("/auth", authRoutes);


app.use("/class", classRoutes);

app.get("/students", authMiddleware, roleMiddleware(['teacher']), async (req, res) => {
    try {
        const students: studentObject[] | null = await User.find({ role: 'student' }).select({
            __v: 0,
            createdAt: 0,
            updatedAt: 0,
            role: 0
        });
        return res.status(200).json(Response.success(students));
    } catch (error) {
        res.status(404).json(Response.error("Student not found"));
    }

});


app.post("/attendance/start", authMiddleware, roleMiddleware(['teacher']), async (req, res) => {
    const { classId } = req.body;

    // if (activeSession) {
    //     return res.status(400).json(Response.error("session already exists"));
    // }

    const validate = SessionSchema.safeParse({ classId });

    if (!validate.success) {
        console.log(validate.error);
        return res.status(400).json(Response.error("Invalid request schema"));
    }

    const classObj: HydratedDocument<IClass> | null = await Class.findById(classId);
    if (!classObj) {
        return res.status(404).json(Response.error("Class not found"));
    }
    const userId = new mongoose.Types.ObjectId(req.user.userid);
    if (!classObj.teacherId.equals(userId)) {
        return res.status(403).json(Response.error("Forbidden, not class teacher"));
    }

    activeSession = {
        classId,
        startedAt: new Date().toISOString(),
        attendance: {}
    };

    return res.status(200).json(Response.success(activeSession));
});

