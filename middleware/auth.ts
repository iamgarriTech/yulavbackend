import { Request, Response, NextFunction } from 'express';
import { CatchAsyncError } from './catchAsyncErrors';
import ErrorHandler from '../utils/ErrorHandler';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { redis } from '../utils/redis';

//authenticated user
export const isAuthenticated = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    const access_token = req.cookies.access_token as string;

    if (!access_token) {
        return next(new ErrorHandler("Login first to access this resource", 401));
    }

        const decoded = jwt.verify(access_token, process.env.ACCESS_TOKEN as string) as JwtPayload;

        if (!decoded) {
            return next(new ErrorHandler("Access token not valid", 400));
        }

        // Check if the user exists in Redis cache
        const user = await redis.get(decoded.id);

        if (!user) {
            return next(new ErrorHandler("PLease login to access this resource", 400));
        }

        // Attach the user object to the request for further middleware or route handling
        req.user = JSON.parse(user);

        next();
});


//validate user role 

export const authorizeRoles = (...roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!roles.includes(req.user.role || "")) {
            return next(new ErrorHandler(`Role (${req.user?.role}) is not allowed to access this resource`, 403));
        }

        next();
    }
}