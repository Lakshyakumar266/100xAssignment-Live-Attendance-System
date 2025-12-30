import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IAttendance extends Document {
    classId: Types.ObjectId;
    studentId: Types.ObjectId;
    status: string;
    createdAt?: Date;
    updatedAt?: Date;
}

const attendanceSchema = new Schema<IAttendance>({
    classId: {
        type: Schema.Types.ObjectId,
        required: [true, 'Class ID is required'],
        trim: true,
        ref: 'Class',
    },
    studentId: {
        type: Schema.Types.ObjectId,
        required: [true, 'Student ID is required'],
        trim: true,
        ref: 'User',
    },
    status: {
        type: String,
        enum: {
            values: ['present', 'absent'],
            message: '{VALUE} is not a valid status',
        },
    },
}, {
    timestamps: true,
});

attendanceSchema.index({ classId: 1, studentId: 1 });

attendanceSchema.methods.toJSON = function () {
    const attendanceObj = this.toObject();
    return attendanceObj;
};

const Attendance = mongoose.model<IAttendance>('Attendance', attendanceSchema);
export default Attendance;