import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IClass extends Document {
    className: string;
    teacherId: Types.ObjectId;
    studentIds: Types.ObjectId[];
    createdAt?: Date;
    updatedAt?: Date;
}

const classSchema = new Schema<IClass>({
    className: {
        type: String,
        required: [true, 'Class name is required'],
        trim: true,
        minlength: [2, 'Class name must be at least 2 characters'],
        maxlength: [100, 'Class name cannot exceed 100 characters'],
    },
    teacherId: {
        type: Schema.Types.ObjectId,
        required: [true, 'Teacher ID is required'],
        trim: true,
        ref: 'User',
    },
    studentIds: [{
        type: Schema.Types.ObjectId,
        ref: 'User',
    }],
}, {
    timestamps: true,
});

classSchema.index({ className: 1 });

classSchema.methods.toJSON = function () {
    const classObj = this.toObject();
    delete classObj.createdAt;
    delete classObj.updatedAt;
    delete classObj.__v;
    return classObj;
};



const Class = mongoose.model<IClass>('Class', classSchema);
export default Class;