import express from "express";
import userAuth from "../middlewares/userAuth.js";
import { getUserData, completeProfile } from "../controllers/userController.js";

const userRouter = express.Router();

userRouter.get("/me", userAuth, getUserData);
userRouter.post("/complete-profile", userAuth, completeProfile);

console.log("User routes loaded");``

export default userRouter;