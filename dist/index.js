import express from "express";
const app = express();
app.use(express.json());
app.post("/auth/signup", (req, res) => {
    const { name, email, password, role } = req.body;
    res.status(201).json({ success: true, data: {
            _id: "123",
            name,
            email,
            role,
        } });
});
app.listen(3000, () => {
    console.log("Server is running on port 3000");
});
//# sourceMappingURL=index.js.map