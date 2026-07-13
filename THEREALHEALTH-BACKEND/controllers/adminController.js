const User = require("../models/User");
const Appointment = require("../models/Appointment");

// ===============================
// HELPERS
// ===============================
const cleanValue = (value) => {
  if (value === undefined || value === null || value === "") return undefined;
  return value;
};

const toNumberOrUndefined = (value) => {
  if (value === undefined || value === null || value === "") return undefined;
  const numberValue = Number(value);
  return Number.isNaN(numberValue) ? undefined : numberValue;
};

const buildAppointmentUserQuery = (userId) => ({
  $or: [
    { user: userId },
    { userId: userId },
    { phone: userId },
    { phoneNumber: userId },
    { mobile: userId },
  ],
});

const buildUserPayload = (body, isCreate = false) => {
  const payload = {};

  if (isCreate && body._id) payload._id = String(body._id).trim();

  if (cleanValue(body.name) !== undefined) {
    payload.name = String(body.name).trim();
  }

  if (cleanValue(body.gender) !== undefined) {
    payload.gender = String(body.gender).trim();
  }

  if (cleanValue(body.alternativePhoneNumber) !== undefined) {
    payload.alternativePhoneNumber = String(
      body.alternativePhoneNumber
    ).trim();
  }

  if (cleanValue(body.role) !== undefined) {
    const role = String(body.role).toLowerCase().trim();
    payload.role = ["user", "doctor", "admin"].includes(role) ? role : "user";
  }

  const age = toNumberOrUndefined(body.age);
  if (age !== undefined) payload.age = age;

  const weight = toNumberOrUndefined(body.weight);
  if (weight !== undefined) payload.weight = weight;

  const height = toNumberOrUndefined(body.height);
  if (height !== undefined) {
    payload.height = {
      value: height,
    };
  }

  return payload;
};

// ===============================
// GET ALL USERS
// Admin only
// ===============================
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find()
      .populate("healthConditions")
      .sort({ createdAt: -1 })
      .exec();

    const usersWithAppointments = await Promise.all(
      users.map(async (user) => {
        const userId = user._id.toString();

        const appointments = await Appointment.find(
          buildAppointmentUserQuery(userId)
        );

        return {
          ...user.toObject(),
          appointments,
        };
      })
    );

    res.status(200).json(usersWithAppointments);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching users",
      error: error.message,
    });
  }
};

// ===============================
// GET ALL DOCTORS
// Admin only
// ===============================
exports.getAllDoctors = async (req, res) => {
  try {
    const doctors = await User.find({ role: "doctor" })
      .sort({ createdAt: -1 })
      .exec();

    res.status(200).json(doctors);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching doctors",
      error: error.message,
    });
  }
};

// ===============================
// GET ALL APPOINTMENTS
// Admin only
// ===============================
exports.getAllAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find().sort({ createdAt: -1 });

    res.status(200).json(appointments);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching appointments",
      error: error.message,
    });
  }
};

// ===============================
// GET ADMIN STATS
// Admin only
// ===============================
exports.getStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalDoctors = await User.countDocuments({ role: "doctor" });
    const totalAppointments = await Appointment.countDocuments();

    let totalHealthRecords = 0;

    try {
      const result = await User.aggregate([
        { $unwind: "$healthConditions" },
        { $count: "totalHealthRecords" },
      ]);

      totalHealthRecords = result[0]?.totalHealthRecords || 0;
    } catch (aggregateError) {
      totalHealthRecords = 0;
    }

    res.status(200).json({
      totalUsers,
      totalDoctors,
      totalAppointments,
      totalHealthRecords,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching stats",
      error: error.message,
    });
  }
};

// ===============================
// CREATE USER / DOCTOR
// Admin only
// ===============================
exports.createUser = async (req, res) => {
  try {
    const phone = String(req.body._id || "").trim();
    const name = String(req.body.name || "").trim();

    if (!phone || !name) {
      return res.status(400).json({
        message: "Phone and name required",
      });
    }

    if (phone.length < 10) {
      return res.status(400).json({
        message: "Valid phone number required",
      });
    }

    const exists = await User.findById(phone);

    if (exists) {
      return res.status(400).json({
        message: "User already exists",
      });
    }

    const payload = buildUserPayload(req.body, true);

    if (!payload.role) {
      payload.role = "user";
    }

    const newUser = new User(payload);
    await newUser.save();

    res.status(201).json({
      message: "User created",
      user: newUser,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error creating user",
      error: error.message,
    });
  }
};

// ===============================
// GET USER BY ID
// Admin only
// ===============================
exports.getUserById = async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await User.findById(userId)
      .populate("healthConditions")
      .exec();

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const appointments = await Appointment.find(
      buildAppointmentUserQuery(userId)
    );

    res.status(200).json({
      user: {
        ...user.toObject(),
        appointments,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching user",
      error: error.message,
    });
  }
};

// ===============================
// UPDATE USER / DOCTOR
// Admin only
// ===============================
exports.updateUser = async (req, res) => {
  try {
    const userId = req.params.id;

    const updateData = buildUserPayload(req.body, false);

    delete updateData._id;

    const updated = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: false,
    });

    if (!updated) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.status(200).json({
      message: "User updated",
      user: updated,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error updating user",
      error: error.message,
    });
  }
};

// ===============================
// DELETE USER / DOCTOR
// Admin only
// ===============================
exports.deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;

    const deleted = await User.findByIdAndDelete(userId);

    if (!deleted) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    await Appointment.deleteMany(buildAppointmentUserQuery(userId));

    res.status(200).json({
      message: "User deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Error deleting user",
      error: error.message,
    });
  }
};

// ===============================
// GET USER APPOINTMENTS
// Admin only
// ===============================
exports.getUserAppointments = async (req, res) => {
  try {
    const userId = req.params.id;

    const appointments = await Appointment.find(
      buildAppointmentUserQuery(userId)
    );

    res.status(200).json(appointments);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching appointments",
      error: error.message,
    });
  }
};

// ===============================
// GET USER HEALTH CONDITIONS
// Admin only
// ===============================
exports.getUserHealthConditions = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate(
      "healthConditions"
    );

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.status(200).json(user.healthConditions || []);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching conditions",
      error: error.message,
    });
  }
};

// ===============================
// UPDATE APPOINTMENT STATUS
// Admin only
// ===============================
exports.updateAppointmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (
      !["pending", "approved", "confirmed", "canceled", "completed"].includes(
        status
      )
    ) {
      return res.status(400).json({
        message: "Invalid status",
      });
    }

    const updatedAppointment = await Appointment.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!updatedAppointment) {
      return res.status(404).json({
        message: "Appointment not found",
      });
    }

    res.status(200).json({
      message: "Appointment status updated",
      appointment: updatedAppointment,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};