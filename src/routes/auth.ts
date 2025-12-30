import { Router } from "express";
import type { Request, Response as expressResponse } from "express";
import { SignupUserSchema, LoginUserSchema } from "../zod.js";
import { Response, type JwtToken } from "../utils.js";
import User from "../db/user.model.js";
import bcrypt from "bcrypt";
import { JWT_SECRET } from "../env.js";
import jwt, { type Jwt } from "jsonwebtoken";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = Router();


router.post("/signup", async (req, res) => {
    const { name, email, password, role } = req.body;

    const validate = SignupUserSchema.safeParse(req.body);
    if (!validate.success) {
        return res.status(400).json(Response.error("Invalid request schema"));
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
        return res.status(400).json(Response.error("Email already exists"));
    }
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({ name, email, password: hashedPassword, role });
        return res.status(201).json(Response.success({ _id: user._id, name, email, role }));
    } catch (error) {
        return res.status(400).json(Response.error("Invalid request schema"));
    }
});



router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        const validate = LoginUserSchema.safeParse(req.body);

        if (!validate.success) {
            return res.status(400).json(Response.error("Invalid request schema"));
        }

        const user = await User.findOne({ email }).select("+password");
        if (!user) {
            return res.status(400).json(Response.error("Invalid email or password"));
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(400).json(Response.error("Invalid email or password"));
        }

        const token = jwt.sign({ userid: user._id, role: user.role }, JWT_SECRET!);
        return res.status(200).json(Response.success({ token }));

    } catch (error) {
        console.log(error);
        return res.status(400).json(Response.error("Invalid request schema"));
    }
});

router.get("/me", authMiddleware, async (req: Request, res: expressResponse) => {
    const reqUser: JwtToken = req.user;
    try {
        const user = await User.findById(reqUser.userid);

        if (!user) {
            return res.status(401).json(Response.error("Unauthorized, token missing or invalid"));
        }

        return res.status(200).json(Response.success({ _id: user._id, name: user.name, email: user.email, role: user.role }));
    } catch (error) {
        console.log(error);
        return res.status(401).json(Response.error("Unauthorized, token missing or invalid"));
    }
});


export default router;