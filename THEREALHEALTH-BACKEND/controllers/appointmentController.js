const Appointment = require("../models/Appointment");
const Consultation = require("../models/Consultation");
const User = require("../models/User");

const BLOCKED_STATUSES = ["pending", "confirmed", "approved", "completed"];

const getTokenUserId = (req) => {
  return req.user?.phone || req.user?._id || req.user?.id;
};

async function findUserFromRequest(req) {
  const userId = getTokenUserId(req);

  if (!userId) return null;

  return await User.findOne({
    $or: [
      { _id: userId },
      { phone: userId },
      { mobile: userId },
      { phoneNumber: userId },
    ],
  });
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
      userId: user._id.toString(),
      userName: user.name || user.fullName || user.phone || "User",
      date,
      timeSlot,
      status: "pending",
    });

    await newAppointment.save();

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

exports.cancelAppointment = async (req, res) => {
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

    const appointment = await Appointment.findOneAndUpdate(
      {
        date,
        timeSlot,
        userId: user._id.toString(),
        status: { $in: BLOCKED_STATUSES },
      },
      { status: "cancelled" },
      { new: true }
    );

    if (!appointment) {
      return res.status(404).json({
        message: "Appointment not found for this user",
      });
    }

    return res.status(200).json({
      message: "Appointment cancelled successfully",
      appointment,
    });
  } catch (error) {
    console.error("Error cancelling appointment:", error.message);

    return res.status(500).json({
      message: "Error cancelling appointment",
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
      userId: user._id.toString(),
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

    if (status !== "completed") {
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

    appointment.status = "completed";

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
        user: appointment.userId || "",
        userName: appointment.userName,
        userPhone: appointment.userPhone || appointment.userId || "",
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