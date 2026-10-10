import { getAllUsers, getUserById, updateUser, deleteUser } from '../models/users.js';

export const getAllUsersController = async (req, res) => {
    try {
        if (req.session.user.role.name !== 'admin') {
            const user = await getUserById(req.session.user.id);

            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            return res.status(200).json(user);
        }

        const users = await getAllUsers();
        return res.status(200).json(users);

    } catch (error) {
        return res.status(500).json({ error: 'Failed to fetch users' });
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

        return res.status(200).json({message: 'User profile updated successfully'});
    } catch (error) {
        return res.status(500).json({ error: 'Failed to update user' });
    }
};

export const deleteUserController = async (req, res) => {
    try {
        const { id } = req.params;

        if (id !== req.session.user.id && req.session.user.role.name !== 'admin') {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const user = await deleteUser(id);

        return res.status(200).json({message: 'User profile deleted successfully'});
    } catch (error) {
        return res.status(500).json({ error: 'Failed to delete user' });
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
    return res.json(updatedTrip);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const deleteTrip = async (req, res) => {
  try {
    const deletedTrip = await tripModel.deleteTrip(req.params.id);
    if (!deletedTrip) {
      return res.status(404).json({ message: 'Trip not found' });
    }
    return res.json({ message: 'Trip deleted' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
