require("dotenv").config();
import express, { NextFunction, Request, Response } from "express";
export const app = express();

import cors from "cors";
import cookieParser from "cookie-parser";
import { ErrorMiddleware } from "./middleware/error";
import userRouter from "./routes/user.route";
import courseRouter from './routes/course.route';

app.use(express.json({ limit: "50mb" }));

app.use(cookieParser());

app.use(
  cors({
    origin: process.env.ORIGIN,
  })
);

//routes
app.use("/api/v1",userRouter);
app.use("/api/v1",courseRouter);

app.get("/test", (req: Request, res: Response, next: NextFunction) => {
  res.status(200).json({
    success: true,
    message: "API IS WORKING",
  });
});

app.all("*", (req: Request, res: Response, next: NextFunction) => {
  res.status(404).json({
    success: false,
    message: `Can't find ${req.originalUrl} on this server!`,
  });
});

app.use(ErrorMiddleware);
