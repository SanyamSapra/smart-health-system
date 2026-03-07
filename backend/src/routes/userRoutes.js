import express from "express";
import userAuth from "../middlewares/userAuth.js";
import {
  getUserData,
  completeProfile,
  updateProfile,
} from "../controllers/userController.js";

const userRouter = express.Router();

userRouter.get("/me", userAuth, getUserData);
userRouter.post("/complete-profile", userAuth, completeProfile);
userRouter.put("/update-profile", userAuth, updateProfile); 

export default userRouter;