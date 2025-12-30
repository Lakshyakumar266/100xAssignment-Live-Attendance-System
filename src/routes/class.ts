import { Router } from "express";
import { Response, type classObject, type JwtToken, type studentObject } from "../utils.js";
import { authMiddleware, classMiddleware, roleMiddleware } from "../middleware/auth.middleware.js";
import Class, { type IClass } from "../db/class.model.js";
import { AddStudentSchema, ClassSchema } from "../zod.js";
import type { HydratedDocument, Types } from "mongoose";
import User, { type IUser } from "../db/user.model.js";
import type { IAttendance } from "../db/attendance.model.js";
import Attendance from "../db/attendance.model.js";

const router = Router();

router.post("/", authMiddleware, roleMiddleware(['teacher']), async (req, res) => {
    const { className } = req.body;
    const validate = ClassSchema.safeParse(req.body);
    if (!validate.success) {
        return res.status(400).json(Response.error("Invalid request schema"));
    }

    const reqUser: JwtToken = req.user;

    try {

        const classObj: HydratedDocument<IClass> = await Class.create({
            className,
            teacherId: reqUser.userid,
        });

        return res.status(201).json(Response.success({ _id: classObj._id, className: classObj.className, teacherId: classObj.teacherId, studentIds: classObj.studentIds }));
    } catch (error) {
        console.log(error);
        return res.status(400).json(Response.error("Invalid request schema"));
    }
});



router.post("/:id/add-student", authMiddleware, classMiddleware(['teacher']), async (req, res) => {
    const { studentId } = req.body;
    const classId = req.params.id;
    const validate = AddStudentSchema.safeParse(req.body);
    if (!validate.success) {
        return res.status(400).json(Response.error("Invalid request schema"));
    }
    const classObj: HydratedDocument<IClass> | null = await Class.findById(classId);

    if (!classObj) {
        return res.status(404).json(Response.error("Class not found"));
    }

    const reqUser: JwtToken = req.user;
    if (!classObj.teacherId.equals(reqUser.userid)) {
        return res.status(403).json(Response.error("Forbidden, not class teacher"));
    }

    try {
        const studentObj = await User.findById(studentId);
        if (!studentObj) {
            return res.status(404).json(Response.error("Student not found"));
        }
        if (classObj.studentIds.includes(studentObj._id)) {
            return res.status(200).json(Response.success(classObj));
        }
        classObj.studentIds.push(studentObj._id);
        await classObj.save();
        return res.status(200).json(Response.success(classObj));
    } catch (error) {
        console.log(error);
        return res.status(400).json(Response.error("Invalid request schema"));
    }

});

router.get("/:id", authMiddleware, roleMiddleware(['teacher', 'student']), classMiddleware(['teacher', 'student']), async (req, res) => {
    const classId = req.params.id;
    try {
        const classObj: HydratedDocument<IClass> | null = await Class.findById(classId);
        if (!classObj) {
            return res.status(404).json(Response.error("Class not found"));
        }

        const students: studentObject[] | null = await User.find({ _id: { $in: classObj.studentIds } }).select({
            __v: 0,
            createdAt: 0,
            updatedAt: 0,
            role: 0
        });

        const response: classObject = { _id: classObj._id, className: classObj.className, teacherId: classObj.teacherId, students: students };

        return res.status(200).json(Response.success(response));
    } catch (error) {
        console.log(error);
        return res.status(400).json(Response.error("Invalid request schema"));
    }
});


router.get('/:id/my-attendance', authMiddleware, classMiddleware(['student']), async (req, res) => {
    const classId = req.params.id;
    try {
        const classObj: HydratedDocument<IClass> | null = await Class.findById(classId);
        if (!classObj) {
            return res.status(404).json(Response.error("Class not found"));
        }
        const reqUser: JwtToken = req.user;
        const checkAttendance = await Attendance.findOne({ classId: classObj._id, studentId: reqUser.userid });
        if (checkAttendance) {
            return res.status(200).json(Response.success({ classId: classId, status: checkAttendance.status }));
        }
        const attendanceObj: HydratedDocument<IAttendance> | null = await Attendance.create(
            {
                classId: classObj._id,
                studentId: reqUser.userid,
            }
        );
        if (!attendanceObj) {
            return res.status(400).json(Response.error("Invalid request schema"));
        }
        return res.status(200).json(Response.success({ classId: classId, status: attendanceObj.status }));
    } catch (error) {
        console.log(error);
        return res.status(400).json(Response.error("Invalid request schema"));
    }
});
export default router;