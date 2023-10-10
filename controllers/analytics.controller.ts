import { Request, Response, NextFunction } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import CourseModel from "../models/course.model";
import OrderModel from "../models/orderModel";
import userModel from "../models/user.model";
import { generateLast12MonthData } from "../utils/analytics.generator";
import ErrorHandler from "../utils/ErrorHandler";

// Get users analytics --- only for admin
export const getUsersAnalytics = CatchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const users = await generateLast12MonthData(userModel)
  
        res.status(200).json({
            success: true,
            users,
        });
  
      } catch (error:any) {
        return next(new ErrorHandler(error.message, 400));
      }
    }
);

// Get courses analytics --- only for admin
export const getCoursesAnalytics = CatchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const courses = await generateLast12MonthData(CourseModel)
  
        res.status(200).json({
            success: true,
            courses,
        });
  
      } catch (error:any) {
        return next(new ErrorHandler(error.message, 400));
      }
    }
);



// Get orders analytics --- only for admin
export const getOrdersAnalytics = CatchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const orders = await generateLast12MonthData(OrderModel)
  
        res.status(200).json({
            success: true,
            orders,
        });
  
      } catch (error:any) {
        return next(new ErrorHandler(error.message, 400));
      }
    }
);