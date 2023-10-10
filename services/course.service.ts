import { Request, Response, NextFunction } from "express";

import CourseModel from "../models/course.model";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";


//create course
export const createCourse = CatchAsyncError(async (data:any, res: Response) => {
    try {
    const course = await CourseModel.create(data);
    res.status(201).json({
      success: true,
      course,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
})

// get all coursess
export const getAllCoursesService = async (res: Response) => {
  const courses = await CourseModel.find().sort({createdAt: -1});
  res.status(200).json({
      success: true,
      courses,
  });
};