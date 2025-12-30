import * as z from "zod";



export const SignupUserSchema = z.object({
    name: z.string().min(2),
    email: z.email(),
    password: z.string().min(6),
    role: z.enum(["student", "teacher"]),
});



export const LoginUserSchema = z.object({
    email: z.email(),
    password: z.string().min(6),
});


export const ClassSchema  = z.object({
    className: z.string().min(2)
})

export const AddStudentSchema  = z.object({ 
    studentId: z.string().min(2)
})

export const SessionSchema  = z.object({ 
    classId: z.string().min(2)
})

