import User from './schemas/users.js';
import { getRoleByName } from './roles.js';

const normalizeUsername = (username) => username?.trim().toLowerCase();
const normalizeEmail = (email) => email?.trim().toLowerCase();

export const createUser = async (userData) => {
    const user = new User({
        ...userData,
        username: normalizeUsername(userData.username),
        email: normalizeEmail(userData.email)
    });

    return await user.save();
};

export const getUserByUsername = async (username) => {
    return await User.findOne({ username: normalizeUsername(username) })
        .select('+passwordHash')
        .populate('role');
};

export const getUserByEmail = async (email) => {
    return await User.findOne({ email: normalizeEmail(email) })
        .select('+passwordHash')
        .populate('role');
};

export const getUserById = async (id) => {
    return await User.findById(id).populate('role');
};

export const getAllUsers = async (query) => {
    return await User.find(query).populate('role');
};

export const getPaginatedUsers = async (page, limit, query) => {
    const skip = (page - 1) * limit;
    return await User.find(query).skip(skip).limit(limit).populate('role').sort({ username: 1 });
};

export const updateUser = async (id, updateData) => {
    const user = await getUserById(id);

    if (!user) {
        throw new Error('User not found');
    }

    user.username = updateData.userName || user.username;
    user.displayName = updateData.displayName || user.displayName;
    user.email = updateData.email || user.email;

    const newRole = await getRoleByName(updateData.role);
    user.role = newRole || user.role;

    return await user.save();
};

export const deleteUser = async (id) => {
    const user = await getUserById(id);

    if (!user) {
        throw new Error('User not found');
    }

    return await User.findByIdAndDelete(id);
};