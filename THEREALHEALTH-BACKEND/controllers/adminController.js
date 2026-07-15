const User = require("../models/User");
const Appointment = require("../models/Appointment");
const Consultation = require("../models/Consultation");
const DoctorAvailability = require("../models/DoctorAvailability");
const DoctorNotification = require("../models/DoctorNotification");
const DoctorRequest = require("../models/DoctorRequest");

const BLOCKED_STATUSES = ["pending", "confirmed", "approved", "completed"];
const ALLOWED_STATUSES = [
  "pending",
  "confirmed",
  "approved",
  "completed",
  "cancelled",
  "canceled",
  "rejected",
];

const getAdminId = (req) =>
  (req.user?.phone || req.user?._id || req.user?.id || "admin").toString();

function weekdayName(dateString) {
  const parsed = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][
    parsed.getDay()
  ];
}

async function isDoctorAvailable(doctor, date, timeSlot, ignoredAppointmentId = null) {
  if (!doctor || doctor.role !== "doctor" || doctor.isActive === false) return false;

  const dayName = weekdayName(date);
  if (!dayName) return false;

  if (
    Array.isArray(doctor.defaultWorkingDays) &&
    doctor.defaultWorkingDays.length > 0 &&
    !doctor.defaultWorkingDays.includes(dayName)
  ) {
    return false;
  }

  const exception = await DoctorAvailability.findOne({
    doctorId: doctor._id.toString(),
    date,
  });

  if (exception?.allDayUnavailable) return false;
  if (exception?.unavailableSlots?.includes(timeSlot)) return false;

  const conflict = await Appointment.findOne({
    _id: ignoredAppointmentId ? { $ne: ignoredAppointmentId } : { $exists: true },
    doctorId: doctor._id.toString(),
    date,
    timeSlot,
    status: { $in: BLOCKED_STATUSES },
  });

  return !conflict;
}

exports.getAllUsers = async (_req, res) => {
  try {
    const users = await User.find().lean();
    return res.status(200).json(users);
  } catch (error) {
    return res.status(500).json({ message: "Error fetching users", error: error.message });
  }
};

exports.getAllAppointments = async (_req, res) => {
  try {
    const appointments = await Appointment.find().sort({ date: 1, timeSlot: 1 });
    return res.status(200).json(appointments);
  } catch (error) {
    return res.status(500).json({ message: "Error fetching appointments", error: error.message });
  }
};

exports.getStats = async (_req, res) => {
  try {
    const [totalUsers, totalAppointments, doctors, totalHealthRecords] = await Promise.all([
      User.countDocuments(),
      Appointment.countDocuments(),
      User.countDocuments({ role: "doctor" }),
      User.aggregate([{ $unwind: "$healthConditions" }, { $count: "count" }]),
    ]);

    return res.status(200).json({
      totalUsers,
      totalAppointments,
      totalDoctors: doctors,
      totalHealthRecords: totalHealthRecords[0]?.count || 0,
    });
  } catch (error) {
    return res.status(500).json({ message: "Error fetching stats", error: error.message });
  }
};

exports.createUser = async (req, res) => {
  try {
    const {
      _id,
      name,
      age,
      weight,
      height,
      alternativePhoneNumber,
      role,
      profileImage,
      defaultWorkingDays,
      defaultWorkingHours,
      isActive,
    } = req.body;

    if (!_id || !name) {
      return res.status(400).json({ message: "Phone and name are required" });
    }

    if (await User.findById(_id)) {
      return res.status(400).json({ message: "User already exists" });
    }

    const user = await User.create({
      _id,
      name,
      age,
      weight,
      height: { value: height },
      alternativePhoneNumber,
      role: role || "user",
      profileImage: profileImage || "",
      defaultWorkingDays,
      defaultWorkingHours,
      isActive: typeof isActive === "boolean" ? isActive : true,
    });

    return res.status(201).json({ message: "User created", user });
  } catch (error) {
    return res.status(500).json({ message: "Error creating user", error: error.message });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.status(200).json({ user });
  } catch (error) {
    return res.status(500).json({ message: "Error fetching user", error: error.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const updates = { ...req.body };
    if (Object.prototype.hasOwnProperty.call(updates, "height")) {
      updates.height = { value: updates.height };
    }

    const user = await User.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    if (!user) return res.status(404).json({ message: "User not found" });
    return res.status(200).json({ message: "User updated", user });
  } catch (error) {
    return res.status(500).json({ message: "Error updating user", error: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findByIdAndDelete(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    await Promise.all([
      Appointment.deleteMany({ userId }),
      DoctorAvailability.deleteMany({ doctorId: userId }),
      DoctorNotification.deleteMany({ doctorId: userId }),
      DoctorRequest.deleteMany({ doctorId: userId }),
    ]);

    return res.status(200).json({ message: "User and related records deleted" });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getUserAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find({ userId: req.params.id });
    return res.status(200).json(appointments);
  } catch (error) {
    return res.status(500).json({ message: "Error fetching appointments", error: error.message });
  }
};

exports.getUserHealthConditions = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.status(200).json(user.healthConditions || []);
  } catch (error) {
    return res.status(500).json({ message: "Error fetching conditions", error: error.message });
  }
};

exports.getDoctors = async (_req, res) => {
  try {
    const doctors = await User.find({ role: "doctor" }).select(
      "_id name profileImage defaultWorkingDays defaultWorkingHours isActive"
    );
    return res.status(200).json({ doctors });
  } catch (error) {
    return res.status(500).json({ message: "Error fetching doctors", error: error.message });
  }
};

exports.getAvailableDoctors = async (req, res) => {
  try {
    const { date, timeSlot, appointmentId } = req.query;
    if (!date || !timeSlot) {
      return res.status(400).json({ message: "Date and timeSlot are required" });
    }

    const doctors = await User.find({ role: "doctor", isActive: { $ne: false } });
    const results = [];

    for (const doctor of doctors) {
      if (await isDoctorAvailable(doctor, date, timeSlot, appointmentId || null)) {
        results.push({
          id: doctor._id,
          name: doctor.name || "Doctor",
          profileImage: doctor.profileImage || "",
        });
      }
    }

    return res.status(200).json({ doctors: results });
  } catch (error) {
    return res.status(500).json({ message: "Unable to check doctors", error: error.message });
  }
};

exports.assignDoctor = async (req, res) => {
  try {
    const { id } = req.params;
    const { doctorId } = req.body;

    const [appointment, doctor] = await Promise.all([
      Appointment.findById(id),
      User.findOne({ _id: doctorId, role: "doctor" }),
    ]);

    if (!appointment) return res.status(404).json({ message: "Appointment not found" });
    if (!doctor) return res.status(404).json({ message: "Doctor not found" });

    const available = await isDoctorAvailable(
      doctor,
      appointment.date,
      appointment.timeSlot,
      appointment._id
    );

    if (!available) {
      return res.status(409).json({
        message: "This doctor is unavailable or already assigned at that time",
      });
    }

    appointment.doctorId = doctor._id.toString();
    appointment.doctorName = doctor.name || "Doctor";
    appointment.assignedAt = new Date();
    appointment.assignedBy = getAdminId(req);
    await appointment.save();

    await DoctorNotification.create({
      doctorId: doctor._id.toString(),
      title: "New appointment assigned",
      message: `${appointment.userName} has been assigned to you on ${appointment.date}, ${appointment.timeSlot}.`,
      type: "appointment_assigned",
      appointmentId: appointment._id,
    });

    return res.status(200).json({ message: "Doctor assigned successfully", appointment });
  } catch (error) {
    return res.status(500).json({ message: "Unable to assign doctor", error: error.message });
  }
};

exports.updateAppointmentStatus = async (req, res) => {
  try {
    const id = req.params.id || req.body.id || req.body.appointmentId;
    const { status } = req.body;

    if (!id) return res.status(400).json({ message: "Appointment ID is required" });
    if (!ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const appointment = await Appointment.findById(id);
    if (!appointment) return res.status(404).json({ message: "Appointment not found" });

    appointment.status = status;
    await appointment.save();

    await Consultation.findOneAndUpdate(
      { appointment: appointment._id },
      {
        appointment: appointment._id,
        user: appointment.userId,
        userName: appointment.userName,
        userPhone: appointment.userPhone || appointment.userId,
        doctorId: appointment.doctorId || "",
        doctorName: appointment.doctorName || "Doctor not assigned",
        date: appointment.date,
        timeSlot: appointment.timeSlot,
        status: appointment.status,
        notes: appointment.notes || "No doctor notes added.",
        prescription: appointment.prescription || [],
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    if (appointment.doctorId) {
      await DoctorNotification.create({
        doctorId: appointment.doctorId,
        title: "Appointment updated",
        message: `The appointment with ${appointment.userName} is now ${status}.`,
        type: status === "cancelled" || status === "canceled"
          ? "appointment_cancelled"
          : "appointment_updated",
        appointmentId: appointment._id,
      });
    }

    return res.status(200).json({ message: "Appointment status updated", appointment });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getDoctorRequests = async (_req, res) => {
  try {
    const requests = await DoctorRequest.find()
      .populate("appointmentId")
      .sort({ createdAt: -1 });
    return res.status(200).json({ requests });
  } catch (error) {
    return res.status(500).json({ message: "Unable to load doctor requests", error: error.message });
  }
};

exports.resolveDoctorRequest = async (req, res) => {
  try {
    const { status, adminResponse = "" } = req.body;
    if (!["resolved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Status must be resolved or rejected" });
    }

    const request = await DoctorRequest.findByIdAndUpdate(
      req.params.requestId,
      { status, adminResponse, resolvedAt: new Date() },
      { new: true }
    );

    if (!request) return res.status(404).json({ message: "Request not found" });

    await DoctorNotification.create({
      doctorId: request.doctorId,
      title: "Admin responded to your request",
      message: adminResponse || `Your request was ${status}.`,
      type: "admin_response",
      appointmentId: request.appointmentId || null,
    });

    return res.status(200).json({ message: "Doctor request updated", request });
  } catch (error) {
    return res.status(500).json({ message: "Unable to update request", error: error.message });
  }
};
