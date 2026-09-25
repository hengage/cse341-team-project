import User from './schemas/users.js';

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
