import { WebSocketServer } from "ws";
import { JWT_SECRET } from "../env.js";
import { verifyToken } from "../middleware/auth.middleware.js";
import { WsResponse, type SocketData } from "../utils.js";
import type { createServer } from "http";
import { activeSession, clearSession } from "../index.js";
import { response } from "express";
import User, { type IUser } from "../db/user.model.js";
import Attendance, { type IAttendance } from "../db/attendance.model.js";
import type { HydratedDocument } from "mongoose";
import Class, { type IClass } from "../db/class.model.js";

let allWs: any[] = []

export function initWebSocket(server: ReturnType<typeof createServer>) {
    const wss = new WebSocketServer({
        server,
        path: '/ws',
    });

    wss.on('connection', async function connection(ws, req) {
        console.log('New client connected');

        const url = new URL(req.url || '', `http://${req.headers.host}`);
        let token = url.searchParams.get('token');

        if (!token) {
            ws.send(JSON.stringify({
                event: 'ERROR',
                data: { message: 'Unauthorized or invalid token' }
            }));
            ws.close();
            return;
        }
        token = token.replace(/^"|"$/g, '').trim();
        console.log('Token from URL:', token);

        const decoded = await verifyToken(token, JWT_SECRET!);

        if (!decoded) {
            ws.send(JSON.stringify({
                event: 'ERROR',
                data: { message: 'Unauthorized or invalid token' }
            }));
            ws.close();
            return;
        }

        ws.user = { usrid: decoded.userid, role: decoded.role };
        allWs.push(ws);

        ws.on('message', async function message(data: Buffer) {
            try {
                const messageJson: SocketData = JSON.parse(data.toString());
                console.log('Received:', messageJson);

                if (!messageJson) {
                    ws.send(WsResponse.response('ERROR', { message: 'Empty message' }));
                    return;
                }
                if (messageJson.event == "ATTENDANCE_MARKED") {
                    if (!activeSession) {
                        ws.send(WsResponse.response('ERROR', { message: 'No active attendance session' }));
                        return;
                    }
                    if (activeSession.classId.length <= 0) {
                        ws.send(WsResponse.response('ERROR', { message: 'No active attendance session' }));
                        return;
                    }

                    if (ws.user?.role !== 'teacher') {
                        ws.send(WsResponse.response('ERROR', { message: 'Forbidden, teacher event only' }));
                        return;
                    }
                    const studentId = messageJson.data.studentId
                    activeSession.attendance = { ...activeSession.attendance, [studentId]: messageJson.data.status };
                    const currentStudentStatus: "present" | "absent" = activeSession.attendance[studentId]!;
                    console.log("student", studentId, currentStudentStatus);
                    console.log(activeSession);
                    allWs.map(x => {
                        if (!activeSession) {
                            ws.send(WsResponse.response('ERROR', { message: 'No active attendance session' }));
                            return;
                        }
                        x.send(WsResponse.response('ATTENDANCE_MARKED', { "studentId": studentId, "status": currentStudentStatus }));
                    })
                }

                else if (messageJson.event == "TODAY_SUMMARY") {
                    if (!activeSession) {
                        ws.send(WsResponse.response('ERROR', { message: 'No active attendance session' }));
                        return;
                    }
                    if (ws.user?.role !== 'teacher') {
                        ws.send(WsResponse.response('ERROR', { message: 'Forbidden, teacher event only' }));
                        return;
                    }
                    const attendence = Object.values(activeSession.attendance || {});
                    const present = attendence.filter((x) => x === "present").length;
                    const absent = attendence.filter((x) => x === "absent").length;
                    const total = attendence.length;
                    console.log("today summary", present, absent, total);


                    allWs.map(x => {
                        x.send(WsResponse.response('TODAY_SUMMARY', {
                            "present": present,
                            "absent": absent,
                            "total": total,
                        }));
                    })
                }
                else if (messageJson.event == "MY_ATTENDANCE") {
                    if (!activeSession) {
                        ws.send(WsResponse.response('ERROR', { message: 'No active attendance session' }));
                        return;
                    }
                    if (ws.user?.role !== 'student') {
                        ws.send(WsResponse.response('ERROR', { message: 'Forbidden, student event only' }));
                        return;
                    }
                    const studentAttendence = activeSession.attendance[ws.user?.usrid];

                    if (!studentAttendence) {
                        ws.send(WsResponse.response("MY_ATTENDANCE", { status: "not yet updated" }));
                    }
                    ws.send(WsResponse.response("MY_ATTENDANCE", { status: studentAttendence }));

                }

                else if (messageJson.event == "DONE") {

                    if (!activeSession) {
                        ws.send(WsResponse.response('ERROR', { message: 'No active attendance session' }));
                        return;
                    }

                    if (ws.user?.role !== 'teacher') {
                        ws.send(WsResponse.response('ERROR', { message: 'Forbidden, teacher event only' }));
                        return;
                    }

                    if (!activeSession) {
                        ws.send(WsResponse.response('ERROR', { message: 'No active attendance session' }));
                        return;
                    }
                    const ActiveClass: HydratedDocument<IClass> | null = await Class.findById(activeSession.classId);
                    const allStudents = ActiveClass?.studentIds || [];
                    allStudents.map(x => {
                        if (!activeSession) {
                            ws.send(WsResponse.response('ERROR', { message: 'No active attendance session' }));
                            return;
                        }
                        if (!activeSession.attendance[x._id.toString()]) {
                            activeSession.attendance[x._id.toString()] = "absent";
                        }
                    })

                    const stdAttendence = Object.values(activeSession.attendance || {});
                    const present = stdAttendence.filter((x: string) => x === "present").length;
                    const absent = stdAttendence.filter((x: string) => x === "absent").length;
                    const total = stdAttendence.length;

                    allStudents.map(async (x) => {
                        if (!activeSession) {
                            ws.send(WsResponse.response('ERROR', { message: 'No active attendance session' }));
                            return;
                        }
                        const attendence = activeSession.attendance[x.toString()];
                        if (!attendence) {
                            return;
                        }

                        await Attendance.create({
                            classId: activeSession.classId,
                            studentId: x._id,
                            status: activeSession.attendance[x._id.toString()] || "absent",
                        });
                    })

                    clearSession();
                    allWs.map(x => {
                        x.send(WsResponse.response('DONE', {
                            "message": "Attendance persisted",
                            "present": present,
                            "absent": absent,
                            "total": total,
                        }));
                    })
                }else{
                    ws.send(WsResponse.response('ERROR', { message: 'Unknown event' }));
                }

            } catch (e) {

                ws.send(WsResponse.response('ERROR', { message: 'Invalid message format' }));
                console.log('Error:', e);
            }
        });
        ws.on('close', function close() {
            allWs.splice(allWs.indexOf(ws), 1);
            if (allWs.length <= 0) {
                clearSession();
            }
            console.log('Client disconnected');
        });
    });
}