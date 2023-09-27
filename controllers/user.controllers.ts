require('dotenv').config();


import {Request, Response, NextFunction } from 'express';
import userModel, { IUser }  from '../models/user.model';
import ErrorHandler from '../utils/ErrorHandler';
import { CatchAsyncError } from '../middleware/catchAsyncErrors';
import jwt, { Secret } from 'jsonwebtoken';
import ejs from 'ejs';
import path from 'path';
import sendMail from '../utils/sendMail';

interface IRegistrationBody{
    name:string;
    email:string;
    password:string;
    avatar?:string
}

export const registrationUser = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, email, password } = req.body;
  
      // Validate required fields
      if (!name || !email || !password) {
        return next(new ErrorHandler("Name, email, and password are required", 400));
      }
  
      // Validate email format (you can use a regular expression or a library like validator)
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return next(new ErrorHandler("Invalid email format", 400));
      }
  
      // ... Other input validation logic ...
  
      const isEmailExist = await userModel.findOne({ email });
      if (isEmailExist) {
        return next(new ErrorHandler("Email already exists", 400));
      }
  
      const user: IRegistrationBody = {
        name,
        email,
        password,
      };

        const activationToken = createActivationToken(user);

        const activationCode = activationToken.activationCode;

        const data = {user: {name:user.name},activationCode};
        const html = await ejs.renderFile(path.join(__dirname, '../mails/activation-mail.ejs'), data);
        try {
            await sendMail({
                email: user.email,
                subject: "Account activation",
                template: "activation-mail.ejs",
                data,
            });
            res.status(200).json({
                success: true,
                message: "Activation link sent to your email",
                activationToken: activationToken.token,
            });
        } catch (error) {
            return next(new ErrorHandler(error.message, 400));
        
            
        }

    }

    catch(error:any){
        return next(new ErrorHandler(error.message, 400));
    }});
    interface IActivationToken{
        token:string;
        activationCode:string;
        
    }

    export  const createActivationToken = (user: any): IActivationToken =>{
        const activationCode = Math.floor(Math.random() * 1000000).toString();

        const token  = jwt.sign({
            user,activationCode
        },process.env.ACTIVATION_SECRET as Secret,{
            expiresIn:"5m",
        });
        return {token, activationCode};
    };



//activate user

interface IActivationRequest{
    activation_token: string;
    activation_code:string;
}

export const activateUser = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const {activation_token, activation_code} = req.body as IActivationRequest;
        const newUser: {user: IUser; activationCode: string } = jwt.verify(
            activation_token, 
            process.env.ACTIVATION_SECRET as string
            ) as {user: IUser, activationCode: string};

            if(newUser.activationCode !== activation_code){
                return next(new ErrorHandler("Invalid activation code", 400));

    }
    const {name, email, password}=newUser.user;

    const existingUser = await userModel.findOne({email});

    if(existingUser){
        return next(new ErrorHandler("Email already exists", 400));
    }
    const user = await userModel.create({
        name,
        email,
        password,
    });
    res.status(201).json({
        success: true,
    });
    }
     catch (error:any) {
        return next(new ErrorHandler(error.message, 400));
    } 
        
    
});