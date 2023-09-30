import { Request, Response, NextFunction } from "express";
import userModel, { IUser } from "../models/user.model";
import ErrorHandler from "../utils/ErrorHandler";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import jwt, { JwtPayload, Secret } from "jsonwebtoken";
import ejs from "ejs";
import path from "path";
import sendMail from "../utils/sendMail";
import { accessTokenOptions, refreshTokenOptions, sendToken } from "../utils/jwt";
import { redis } from "../utils/redis";
import { getUserById } from "../services/user.service";

interface IRegistrationBody {
  name: string;
  email: string;
  password: string;
  avatar?: string;
}

export const registrationUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, email, password } = req.body;

      // Validate required fields
      if (!name || !email || !password) {
        return next(
          new ErrorHandler("Name, email, and password are required", 400)
        );
      }

      // Validate email format (you can use a regular expression or a library like validator)
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return next(new ErrorHandler("Invalid email format", 400));
      }

      // Check if the email already exists in the database
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

      const data = { user: { name: user.name }, activationCode };
      const html = await ejs.renderFile(
        path.join(__dirname, "../mails/activation-mail.ejs"),
        data
      );

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
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

interface IActivationToken {
  token: string;
  activationCode: string;
}

export const createActivationToken = (user: any): IActivationToken => {
  const activationCode = Math.floor(Math.random() * 1000000).toString();

  const token = jwt.sign(
    {
      user,
      activationCode,
    },
    process.env.ACTIVATION_SECRET as Secret,
    {
      expiresIn: "5m",
    }
  );
  return { token, activationCode };
};

// Activate user

interface IActivationRequest {
  activation_token: string;
  activation_code: string;
}

export const activateUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { activation_token, activation_code } =
        req.body as IActivationRequest;
      const newUser: { user: IUser; activationCode: string } = jwt.verify(
        activation_token,
        process.env.ACTIVATION_SECRET as string
      ) as { user: IUser; activationCode: string };

      if (newUser.activationCode !== activation_code) {
        return next(new ErrorHandler("Invalid activation code", 400));
      }

      const { name, email, password } = newUser.user;

      const existingUser = await userModel.findOne({ email });

      if (existingUser) {
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
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// Login user

interface ILoginRequest {
  email: string;
  password: string;
}
export const loginUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body as ILoginRequest;

      // Validate required fields
      if (!email || !password) {
        throw new ErrorHandler("Email and password are required", 400);
      }

      // Find the user by email and select the password field for comparison
      const user = await userModel.findOne({ email }).select("+password");

      if (!user) {
        throw new ErrorHandler("Invalid email or password", 400);
      }

      const isPasswordMatched = await user.comparePassword(password);

      if (!isPasswordMatched) {
        throw new ErrorHandler("Invalid email or password", 400);
      }

      // Send the JWT token as a response
      sendToken(user, 200, res);
    } catch (error) {
      // If it's not a custom error, assume it's a 500 Internal Server Error
      if (!(error instanceof ErrorHandler)) {
        error = new ErrorHandler("Internal Server Error", 500);
      }

      return next(error); // Forward the error to the error handling middleware
    }
  }
);

// Logout user

export const logoutUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.cookie("access_token", "", { maxAge: 1 });
      res.cookie("refresh_token", "", { maxAge: 1 });

      const userId = req.user?._id || "";
      redis.del(userId); // Delete the token from Redis

      res.status(200).json({
        success: true,
        message: "Logged out successfully",
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

//update access token
export const updateAccessToken = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const refresh_token = req.cookies.refresh_token as string;
      const decoded = jwt.verify(
        refresh_token,
        process.env.REFRESH_TOKEN as string
      ) as JwtPayload;

      const message = " Could not refresh token";
      if (!decoded) {
        return next(new ErrorHandler(message, 400));
      }
      const session = await redis.get(decoded.id as string);
      if (!session) {
        return next(new ErrorHandler(message, 400));
      }

      const user = JSON.parse(session);

      const accessToken = jwt.sign(
        { id: user.id },
        process.env.ACCESS_TOKEN as string,
        {
          expiresIn: "5m",
        }
      );
      const refreshToken = jwt.sign(
        { id: user.id },
        process.env.REFRESH_TOKEN as string,
        {
          expiresIn: "3d",
        }
      );
      res.cookie("access_token", accessToken, accessTokenOptions);
      res.cookie("refresh_token", refreshToken, refreshTokenOptions);
      res.status(200).json({
        status:"success",
        accessToken,
      })
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

//get user infos
export const getUserInfo = CatchAsyncError(async(req:Request, res:Response, next:NextFunction)=>{
  try {
    const userId= req.user?._id
    getUserById(userId, res)
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));

  }
})

interface ISocialAuthBody{
  email:string;
  name:string;
  avatar:string;

}
//social auth

export const socialAuth = CatchAsyncError(async(req:Request, res:Response, next:NextFunction)=>{
  try {
    const {email, name, avatar} = req.body
    const user = await userModel.findOne({email})
    if(user){
      sendToken(user, 200, res)
    }else{
      const newUser = await userModel.create({
        name,
        email,
        avatar
      })
      sendToken(newUser, 200, res)
    }
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));

  }

});


//update user info

interface IUpdateUserInfo{
  name?:string;
  email?:string;
  
}

export const updateUserInfo = CatchAsyncError(async(req:Request, res:Response, next:NextFunction)=>{
 try {
  const {name, email} = req.body as IUpdateUserInfo;
  const userId = req.user?._id;
  const user = await userModel.findById(userId);

  if(email && user){
    const isEmailExist=await userModel.findOne({email})
    if(isEmailExist){
      return next(new ErrorHandler("Email already exists", 400));
    }
    user.email = email;
  }

  if (name && user) {
    user.name = name;
  }

  await user?.save();
  await redis.set(userId, JSON.stringify(user));

  res.status(200).json({
    success: true,
    user,
  })

   
 } catch (error) {
  return next(new ErrorHandler(error.message, 400));

 }

})