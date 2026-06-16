const Appointment = require("../models/Appointment");
const Consultation = require("../models/Consultation");
const User = require("../models/User");

const BLOCKED_STATUSES = ["pending", "confirmed", "approved", "completed"];

function getUserIdFromRequest(req) {
  return req.user?._id || req.user?.id || req.user?.phone;
}

async function findUserFromRequest(req) {
  const userId = getUserIdFromRequest(req);

  if (!userId) return null;

  let user = null;

  try {
    user = await User.findById(userId);
  } catch (_) {
    user = null;
  }

  if (!user && req.user?.phone) {
    user = await User.findOne({ phone: req.user.phone });
  }

  return user;
}

exports.bookAppointment = async (req, res) => {
  try {
    const { date, timeSlot } = req.body;

    if (!date || !timeSlot) {
      return res.status(400).json({
        message: "Date and time slot are required",
      });
    }

    const user = await findUserFromRequest(req);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const existingAppointment = await Appointment.findOne({
      date,
      timeSlot,
      status: { $in: BLOCKED_STATUSES },
    });

    if (existingAppointment) {
      return res.status(400).json({
        message: "Time slot already booked",
      });
    }

    const newAppointment = new Appointment({
      user: user._id,
      userName: user.name || user.fullName || "User",
      userPhone: user.phone || req.user?.phone || "",
      date,
      timeSlot,
      status: "pending",
      notes: "",
      prescription: [],
    });

    await newAppointment.save();

    if (Array.isArray(user.appointments)) {
      user.appointments.push(newAppointment._id);
      await user.save();
    }

    return res.status(201).json({
      message: "Appointment booked successfully!",
      appointment: newAppointment,
    });
  } catch (error) {
    console.error("Error booking appointment:", error.message);
    return res.status(500).json({
      message: "Server error while booking appointment",
      error: error.message,
    });
  }
};

exports.getBookedSlots = async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        message: "Date is required",
      });
    }

    const appointments = await Appointment.find({
      date,
      status: { $in: BLOCKED_STATUSES },
    }).select("timeSlot status date");

    const bookedSlots = appointments.map((appointment) => appointment.timeSlot);

    return res.status(200).json({
      message: "Booked slots fetched successfully",
      bookedSlots,
      appointments,
    });
  } catch (error) {
    console.error("Error fetching booked slots:", error.message);
    return res.status(500).json({
      message: "Error fetching booked slots",
      error: error.message,
    });
  }
};

exports.getAppointments = async (req, res) => {
  try {
    const user = await findUserFromRequest(req);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const appointments = await Appointment.find({
      $or: [
        { user: user._id },
        { userPhone: user.phone },
      ],
    }).sort({ date: -1, createdAt: -1 });

    return res.status(200).json({
      message: "Appointments fetched successfully",
      appointments,
    });
  } catch (error) {
    console.error("Error fetching appointments:", error.message);
    return res.status(500).json({
      message: "Error fetching appointments",
      error: error.message,
    });
  }
};

exports.getDoctorAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find({
      status: { $in: ["confirmed", "approved", "completed"] },
    }).sort({ date: 1, createdAt: -1 });

    return res.status(200).json({
      message: "Doctor appointments fetched successfully",
      appointments,
    });
  } catch (error) {
    console.error("Error fetching doctor appointments:", error.message);
    return res.status(500).json({
      message: "Error fetching doctor appointments",
      error: error.message,
    });
  }
};

exports.updateDoctorAppointmentStatus = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { status, notes, prescription } = req.body;

    if (!appointmentId) {
      return res.status(400).json({
        message: "Appointment ID is required",
      });
    }

    if (!status) {
      return res.status(400).json({
        message: "Status is required",
      });
    }

    const allowedDoctorStatuses = ["completed"];

    if (!allowedDoctorStatuses.includes(status)) {
      return res.status(403).json({
        message: "Doctor can only mark appointment as completed",
      });
    }

    const appointment = await Appointment.findById(appointmentId);

    if (!appointment) {
      return res.status(404).json({
        message: "Appointment not found",
      });
    }

    appointment.status = status;

    if (typeof notes === "string") {
      appointment.notes = notes;
    }

    if (Array.isArray(prescription)) {
      appointment.prescription = prescription;
    }

    await appointment.save();

    await Consultation.findOneAndUpdate(
      { appointment: appointment._id },
      {
        appointment: appointment._id,
        user: appointment.user,
        userName: appointment.userName,
        userPhone: appointment.userPhone,
        doctorName: appointment.doctorName || "Doctor",
        date: appointment.date,
        timeSlot: appointment.timeSlot,
        status: appointment.status,
        notes: appointment.notes || "No doctor notes added.",
        prescription: appointment.prescription || [],
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    return res.status(200).json({
      message: "Appointment marked as completed",
      appointment,
    });
  } catch (error) {
    console.error("Error updating doctor appointment:", error.message);
    return res.status(500).json({
      message: "Error updating appointment",
      error: error.message,
    });
  }
};