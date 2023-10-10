import { Response } from "express";
import userModel from "../models/user.model"
import { redis } from "../utils/redis";

//get user by id
export const getUserById = async (id: string, res: Response) => {
    try {
        const userJson = await redis.get(id);

        if (userJson) {
            const user = JSON.parse(userJson);
            res.status(200).json({
                success: true,
                user,
            });
        } else {
            res.status(404).json({
                success: false,
                message: 'User not found in cache.',
            });
        }
    } catch (error) {
        console.error('Error fetching user from Redis:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error.',
        });
    }
};


// get all users
export const getAllUsersService = async (res: Response) => {
    const users = await userModel.find().sort({createdAt: -1});
    res.status(200).json({
        success: true,
        users,
    });
};

//update user role
export const updateUserRoleService = async (res: Response, id: string, role: string) => {
    try {
        const user = await userModel.findByIdAndUpdate(id, { role }, { new: true });
        res.status(200).json({
            success: true,
            user,
        });
        
    } catch (error) {
        console.error('Error fetching user from Redis:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error.',
        });
    }
};