import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
    name: string;
    email: string;
    password: string;
    role: string;
    createdAt?: Date;
    updatedAt?: Date;
}

const userSchema = new Schema<IUser>({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        minlength: [2, 'Name must be at least 2 characters'],
        maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters'],
        select: false, // Don't include password in queries by default
    },
    role: {
        type: String,
        enum: {
            values: ['teacher', 'student'],
            message: '{VALUE} is not a valid role',
        },
        default: 'student',
    },
}, {
    timestamps: true,
});

userSchema.index({ role: 1 });

userSchema.methods.toJSON = function () {
    const user = this.toObject();
    return user;
};

const User = mongoose.model<IUser>('User', userSchema);
export default User;