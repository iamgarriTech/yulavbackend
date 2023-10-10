import { Request, Response, NextFunction } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import cloudinary from "cloudinary";
import { createCourse, getAllCoursesService } from "../services/course.service";
import CourseModel from "../models/course.model";
import { redis } from "../utils/redis";
import mongoose from "mongoose";
import ejs from "ejs";
import path from "path";
import sendMail from "../utils/sendMail";
import NotificationModel from "../models/notificationModel";

export const uploadCourse = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req.body;
      const thumbnail = data.thumbnail;
      if (thumbnail) {
        const myCloud = await cloudinary.v2.uploader.upload(thumbnail, {
          folder: "courses",
        });
        data.thumbnail = {
          public_id: myCloud.public_id,
          url: myCloud.secure_url,
        }
      }
        createCourse(data, res, next)
    } catch (error) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

//edit course
export const editCourse = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req.body;
      const thumbnail = data.thumbnail;
      if (thumbnail) {
        const myCloud = await cloudinary.v2.uploader.upload(thumbnail, {
          folder: "courses",
        });
        data.thumbnail = {
          public_id: myCloud.public_id,
          url: myCloud.secure_url,
        }
      }
      const courseId = req.params.id;

      const course = await CourseModel.findByIdAndUpdate(courseId,{

        $set: data},
        {new: true 
      });

      res.status(200).json({
        status: "success",
        course,
      });
    }
     catch (error) {
      return next(new ErrorHandler(error.message, 400));
    }
  });


// GET SINGLE COURSE --- WITHOUT PURCHASING
export const getSingleCourse = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) =>{
    try {
      
      const courseId = req.params.id;

      const isCacheExist = await redis.get(courseId)

      if (isCacheExist){
        const course = JSON.parse(isCacheExist);
        res.status(200).json({
          success: true,
          course,
        })
      }else{
        const course = await CourseModel.findById(req.params.id).select(
          "-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links"
        );
        
        await redis.set(courseId, JSON.stringify(course), "EX", 604800) // 7days

        res.status(200).json({
          success: true,
          course,
        })

      }
    } catch (error) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
)


// GET ALL COURSE --- WITHOUT PURCHASING
export const getAllCourse = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) =>{
    try {
      
      const isCacheExist = await redis.get("allCourse")

      if (isCacheExist){
        const courses = JSON.parse(isCacheExist);
        res.status(200).json({
          success: true,
          courses,
        })
      }else{
        const courses = await CourseModel.find().select("-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links");
        
        res.status(200).json({
          success: true,
          courses,
        })

      }
    } catch (error) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
)


// GET COURSE CONTENTS --- ONLY FOR VALID USER
export const getCourseByUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) =>{
    try {
      const userCourseList = req.user?.courses;
      const courseId = req.params.id;

      const courseExist = userCourseList?.find(
        (course:any) => course._id.toString() === courseId
      );

      if(!courseExist){
        return next(new ErrorHandler("Not eligible to access this course", 404))
      }

      const course = await CourseModel.findById(courseId);

      const content = course?.courseData;

      res.status(200).json({
        success: true,
        content,
      })

    } catch (error) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
)



// ADD QUESTIONS IN COURSE
interface IAddQuestionData{
  question: string;
  courseId: string;
  contentId: string;
}

export const addQuestion = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) =>{
    try {
      const { question, courseId, contentId }: IAddQuestionData = req.body;
      const course = await CourseModel.findById(courseId)

      if(!mongoose.Types.ObjectId.isValid(contentId)){
        return next((new ErrorHandler("Invalid content id", 400)))
      }

      const courseContent = course?.courseData?.find((item:any) => item._id.equals(contentId))

      if(!courseContent){
        return next((new ErrorHandler("Invalid content id", 400)))
      }

      // create a new question object
      const newQuestion:any = {
        user: req.user,
        question,
        questionReplies: [],
      }

      // add question to our course object
      courseContent.questions.push(newQuestion);

      // notification
      await NotificationModel.create({
          user: req.user?._id,
          title: "New Question Received",
          message: `You have a new question in ${courseContent?.title}`,
      })


      // save the updated course
      await course?.save();

      res.status(200).json({
        success: true,
        course,
      })

    } catch (error:any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
)


// ADD ANSWERS TO QUESTIONS IN COURSE
interface IAddAnswerData{
  answer: string;
  courseId: string;
  contentId: string;
  questionId: string;
}
export const addAnswer = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) =>{
    try {
      const { answer, courseId, contentId, questionId }: IAddAnswerData = req.body;
      const course = await CourseModel.findById(courseId)

      if(!mongoose.Types.ObjectId.isValid(contentId)){
        return next((new ErrorHandler("Invalid content id", 400)))
      }

      const courseContent = course?.courseData?.find((item:any) => item._id.equals(contentId));

      if(!courseContent){
        return next((new ErrorHandler("Invalid content id", 400)))
      }


      const question = courseContent?.questions?.find((item:any) => item._id.equals(questionId));

      if(!question){
        return next((new ErrorHandler("Invalid question id", 400)))
      }

      // create a new question object
      const newAnswer:any = {
        user: req.user,
        answer,
      }

      // add answer to our course object
      question.questionReplies.push(newAnswer);

      // save the updated course
      await course?.save();

      if(req.user?._id === question.user._id){
        // create a notification
        await NotificationModel.create({
            user: req.user?._id,
            title: "New Question Reply Received",
            message: `You have a new question reply in ${courseContent?.title}`,
        })
      }else{
        const data = {
          name: question.user.name,
          title: courseContent.title,
        }

        const html = await ejs.renderFile(path.join(__dirname, "../mails/question-reply.ejs"), data);

        try{
            await sendMail({
              email: question.user.email,
              subject: "Question Reply",
              template: "question-reply.ejs",
              data,
            })
        }catch(error:any){
          return next(new ErrorHandler(error.message, 400));
        }
      }

      res.status(200).json({
        success: true,
        course,
      })

    } catch (error:any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
)


// ADD REVIEWS
interface IAddReviewData{
  review: string;
  rating: number;
  userId: string;
}
export const addReview = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) =>{
    try {
      const userCourseList = req.user?.courses;

      const courseId = req.params.id;

      // check if courseId exist
      const courseExist = userCourseList?.some((course:any) => course._id.toString() === courseId.toString());

      if(!courseExist){
        return next(new ErrorHandler("Not eligible to access this course", 404))
      }


      const { review, rating }: IAddReviewData = req.body;
      const course = await CourseModel.findById(courseId)

      const reviewData: any = {
        user: req.user,
        comment: review,
        rating,
      }

      course?.reviews.push(reviewData)

      let avg = 0;
      course?.reviews.forEach((rev:any) => {
        avg += rev.rating;
      })

      if(course){
        course.ratings = avg / course.reviews.length; // example: 9 / 2 = 4.5 ratings
      }

      await course?.save();

      const notification = {
        title: "New Review Received",
        message: `${req.user?.name} has given a review in ${course?.name}`,
      }

      // create notification
      
      res.status(200).json({
        success: true,
        course,
      })

    } catch (error:any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
)


// REPLIES TO REVIEW
interface IAddReviewData{
  comment: string;
  courseId: string;
  reviewId: string;
}
export const addReplyToReview = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) =>{
    try {
      const { comment, courseId, reviewId }: IAddReviewData = req.body;

      const course = await CourseModel.findById(courseId)

      if(!course){
        next(new ErrorHandler("Course not found", 404))
      }

      const review = course?.reviews?.find(
        (rev: any) => rev._id.toString() === reviewId
      );

      if(!review){
        next(new ErrorHandler("Review not found", 404))
      }

      const replyData:any = {
        user: req.user,
        comment,
      }

      if(!review.commentReplies){
        review.commentReplies = [];
      }

      review.commentReplies?.push(replyData)

      await course?.save();
      
      res.status(200).json({
        success: true,
        course,
      })

    }catch(error: any){
      next(new ErrorHandler(error.message, 500))
    }
  }
)


// get all courses --- only for admin
export const getAllCourses = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      getAllCoursesService(res)
    } catch (error:any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);



// delete course --- only for admin
export const deleteCourse = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const course = await CourseModel.findById(id);

      if(!course){
        return next(new ErrorHandler("Course Not Found", 404));
      }

      await course.deleteOne({ id })

      await redis.del(id)

      res.status(200).json({
          success: true,
          message: "Course deleted successfully",
      });

    } catch (error:any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);