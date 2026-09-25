import Role from './schemas/roles.js';

const normalizeRoleName = (name) => name?.trim().toLowerCase();

export const getRoleByName = async (name) => {
    return await Role.findOne({ name: normalizeRoleName(name) });
};

export const getRoleById = async (id) => {
    return await Role.findById(id);
};

export const getAllRoles = async () => {
    return await Role.find({});
};
