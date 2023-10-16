"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserRoleService = exports.getAllUsersService = exports.getUserById = void 0;
const user_model_1 = __importDefault(require("../models/user.model"));
const redis_1 = require("../utils/redis");
//get user by id
const getUserById = async (id, res) => {
    try {
        const userJson = await redis_1.redis.get(id);
        if (userJson) {
            const user = JSON.parse(userJson);
            res.status(200).json({
                success: true,
                user,
            });
        }
        else {
            res.status(404).json({
                success: false,
                message: 'User not found in cache.',
            });
        }
    }
    catch (error) {
        console.error('Error fetching user from Redis:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error.',
        });
    }
};
exports.getUserById = getUserById;
// get all users
const getAllUsersService = async (res) => {
    const users = await user_model_1.default.find().sort({ createdAt: -1 });
    res.status(200).json({
        success: true,
        users,
    });
};
exports.getAllUsersService = getAllUsersService;
//update user role
const updateUserRoleService = async (res, id, role) => {
    try {
        const user = await user_model_1.default.findByIdAndUpdate(id, { role }, { new: true });
        res.status(200).json({
            success: true,
            user,
        });
    }
    catch (error) {
        console.error('Error fetching user from Redis:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error.',
        });
    }
};
exports.updateUserRoleService = updateUserRoleService;
