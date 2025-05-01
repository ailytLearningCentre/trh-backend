// Placeholder content for adminController.js
const User = require("../models/User");
const Appointment = require("../models/Appointment");

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().populate("healthConditions").exec();
    const usersWithAppointments = await Promise.all(
      users.map(async (user) => {
        const appointments = await Appointment.find({ _id: user._id });
        return { ...user.toObject(), appointments };
      })
    );
    res.status(200).json(usersWithAppointments);
  } catch (error) {
    res.status(500).json({ message: "Error fetching users", error: error.message });
  }
};

exports.getAllAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find();
    res.status(200).json(appointments);
  } catch (error) {
    res.status(500).json({ message: "Error fetching appointments", error: error.message });
  }
};

exports.getStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalAppointments = await Appointment.countDocuments();
    const totalHealthRecords = await User.aggregate([
      { $unwind: "$healthConditions" },
      { $count: "totalHealthRecords" },
    ]);

    res.status(200).json({
      totalUsers,
      totalAppointments,
      totalHealthRecords: totalHealthRecords[0]?.totalHealthRecords || 0,
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching stats", error: error.message });
  }
};

exports.createUser = async (req, res) => {
  try {
    const { _id, name, age, weight, height, alternativePhoneNumber, role } = req.body;
    if (!_id || !name) return res.status(400).json({ message: "Phone and name required" });

    const exists = await User.findById(_id);
    if (exists) return res.status(400).json({ message: "User already exists" });

    const newUser = new User({
      _id,
      name,
      age,
      weight,
      height: { value: height },
      alternativePhoneNumber,
      role: role || "user",
    });

    await newUser.save();
    res.status(201).json({ message: "User created", user: newUser });
  } catch (error) {
    res.status(500).json({ message: "Error creating user", error: error.message });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate("appointments").exec();
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json({ user });
  } catch (error) {
    res.status(500).json({ message: "Error fetching user", error: error.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { name, age, weight, height, alternativePhoneNumber, role } = req.body;
    const updated = await User.findByIdAndUpdate(
      req.params.id,
      { name, age, weight, height: { value: height }, alternativePhoneNumber, role },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ message: "User not found" });
    res.status(200).json({ message: "User updated", user: updated });
  } catch (error) {
    res.status(500).json({ message: "Error updating user", error: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const deleted = await User.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "User not found" });
    await Appointment.deleteMany({ _id: req.params.id });
    res.status(200).json({ message: "User and appointments deleted" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting user", error: error.message });
  }
};

exports.getUserAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find({ _id: req.params.id });
    res.status(200).json(appointments);
  } catch (error) {
    res.status(500).json({ message: "Error fetching appointments", error: error.message });
  }
};

exports.getUserHealthConditions = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json(user.healthConditions);
  } catch (error) {
    res.status(500).json({ message: "Error fetching conditions", error: error.message });
  }
};

exports.updateAppointmentStatus = async (req, res) => {
  try {
    const updated = await Appointment.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: "Appointment not found" });
    res.status(200).json({ message: "Status updated", appointment: updated });
  } catch (error) {
    res.status(500).json({ message: "Error updating status", error: error.message });
  }
};
