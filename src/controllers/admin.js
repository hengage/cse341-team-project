import { getAllUsers, getUserById, updateUser, deleteUser, getPaginatedUsers } from '../models/users.js';

const parsePositiveInteger = (value, defaultValue) => {
    if (value === undefined) {
        return defaultValue;
    }

    const parsed = Number(value);

    if (!Number.isInteger(parsed) || parsed < 1) {
        return null;
    }

    return parsed;
};

export const getAllUsersController = async (req, res) => {
    try {
        const page = parsePositiveInteger(req.query.page, 1);
        const requestedLimit = parsePositiveInteger(req.query.limit, 10);

        if (!page || !requestedLimit || requestedLimit > 50) {
            return res.status(400).json({
                errors: [{ field: 'pagination', message: 'page and limit must be valid positive numbers. Maximum limit is 50.' }]
            });
        }

        if (req.session.user.role.name !== 'admin') {
            const user = await getUserById(req.session.user.id);

            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            return res.status(200).json({
                users: user,
                page: 1,
                limit: 1,
                totalItems: 1,
                totalPages: 1,
                hasNextPage: false,
                hasPreviousPage: false
            });
        }

        const query = {};

        if (req.query.filter && req.query.filter.trim() !== 'admin' && req.query.filter.trim() !== 'user') {
            return res.status(400).json({
                errors: [{ field: 'filter', message: 'Invalid filter value. Only "admin" and "user" are allowed.' }]
            });
        }

        if (req.query.filter == "admin") {
            query.role = "6ab5be07e1e3126d1bf5e7ec";
        } else if (req.query.filter == "user") {
            query.role = "6ab5be07e1e3126d1bf5e7eb";
        }

        if (req.query.q !== undefined) {
            if (typeof req.query.q !== 'string') {
                return res.status(400).json({
                errors: [{ field: 'q', message: 'Search text must be a single string.' }]
                });
            }

            const searchText = req.query.q.trim();

            if (searchText.length > 100) {
                return res.status(400).json({
                errors: [{ field: 'q', message: 'Search text must be between 1 and 100 characters.' }]
                });
            }

            if (searchText.length >= 1) {
                query.$text = { $search: searchText };
            }
        }

        const users = await getPaginatedUsers(page, requestedLimit, query);
        const allUsers = await getAllUsers(query);
        
        res.status(200).json({
            users: users,
            page: page,
            limit: requestedLimit,
            totalItems: allUsers.length,
            totalPages: Math.ceil(allUsers.length / requestedLimit),
            hasNextPage: page < Math.ceil(allUsers.length / requestedLimit),
            hasPreviousPage: page > 1
        });

    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
};

export const updateUserController = async (req, res) => {
    try {
        const { id } = req.params;
        const { userName, displayName, email, role } = req.body;

        if (id !== req.session.user.id && req.session.user.role.name !== 'admin') {
            return res.status(403).json({ error: 'Forbidden' });
        }
        if (req.session.user.role.name !== 'admin') {
            role = req.session.user.role.name;
        }

        const user = await updateUser(id, { userName, displayName, email, role });

        res.status(200).json({message: 'User profile updated successfully'});
    } catch (error) {
        res.status(500).json({ error: 'Failed to update user' });
    }
};

export const deleteUserController = async (req, res) => {
    try {
        const { id } = req.params;

        if (id !== req.session.user.id && req.session.user.role.name !== 'admin') {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const user = await deleteUser(id);

        res.status(200).json({message: 'User profile deleted successfully'});
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete user' });
    }
};

export const showUsersPage = (req, res) => {
    return res.render('admin/users', {
        title: 'Users Management',
        name: req.session.user.displayName.charAt(0).toUpperCase() + req.session.user.displayName.slice(1).toLowerCase()
    });
};

export const showAdminDashboardPage = (req, res) => {
    return res.render('admin/dashboard', {
        title: 'Admin Dashboard'
    });
};
import * as tripModel from '../models/trips.js';

export const getTripAdminPage = async (req, res) => {
  res.render('admin/trips', {
    title: 'Trip Admin'
  });
};

export const updateTrip = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedTrip = await tripModel.updateTrip(id, req.body);
    if (!updatedTrip) {
      return res.status(404).json({ message: 'Trip not found' });
    }
    res.json(updatedTrip);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteTrip = async (req, res) => {
  try {
    const deletedTrip = await tripModel.deleteTrip(req.params.id);
    if (!deletedTrip) {
      return res.status(404).json({ message: 'Trip not found' });
    }
    res.json({ message: 'Trip deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
