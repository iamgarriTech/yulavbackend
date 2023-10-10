import ejs from "ejs";
import { NextFunction, Request, Response } from "express";
import path from "path";
import cron from "node-cron";

import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import NotificationModel from "../models/notificationModel";
import ErrorHandler from "../utils/ErrorHandler";

// get all notifications --- only for admin
export const getNotifications = CatchAsyncError(
    async (req:Request, res:Response, next:NextFunction) => {
        try {
            const notifications = await NotificationModel.find().sort({
                createdAt: -1
            })

            res.status(201).json({
                success: true,
                notifications,
            });

        } catch (error:any) {
            return next(new ErrorHandler(error.message, 500))
        }
    }
)

// update notification status --- only for admin
export const updateNotification = CatchAsyncError(
    async (req:Request, res:Response, next:NextFunction) => {
        try {
            // const 
            const notification = await NotificationModel.findById(req.params.id);

            if(!notification){
                return next(new ErrorHandler("Notification Not Found", 404))
            }else{
                notification.status ? notification.status = "read" : notification?.status;
            }

            await notification.save()

            
            const notifications = await NotificationModel.find().sort({
                createdAt: -1
            })
            // course.purchased ? course.purchased += 1 : course.purchased;
            res.status(201).json({
                success: true,
                notifications,
            });

        } catch (error:any) {
            return next(new ErrorHandler(error.message, 500))
        }
    }
)


// delete notification --- only for admin
cron.schedule("0 0 0 * * * ", async()=>{
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    await NotificationModel.deleteMany({status: "read", createdAt: {$lt: thirtyDaysAgo}});
    console.log('Deleted read notification');
});