const Appointment = require("../models/Appointment");
const User = require("../models/User");

exports.bookAppointment = async (req, res) => {
  try {
    const { date, timeSlot } = req.body;

    if (!date || !timeSlot) {
      return res.status(400).json({
        message: "Date and time slot are required",
      });
    }

    const userId = req.user.phone || req.user._id;

    if (!userId) {
      return res.status(401).json({
        message: "User not found in token. Please login again.",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const existingSlot = await Appointment.findOne({
      date,
      timeSlot,
      status: { $in: ["pending", "confirmed"] },
    });

    if (existingSlot) {
      return res.status(400).json({
        message: "This time slot is already booked. Please select another slot.",
      });
    }

    const appointment = new Appointment({
      userId,
      userPhone: userId,
      userName: user.name || "User",
      date,
      timeSlot,
      status: "pending",
      notes: "",
      prescription: [],
    });

    await appointment.save();

    if (Array.isArray(user.appointments)) {
      user.appointments.push(appointment._id);
      await user.save();
    }

    return res.status(201).json({
      message: "Appointment booked successfully",
      appointment,
    });
  } catch (error) {
    console.error("Error booking appointment:", error);

    if (error.code === 11000) {
      return res.status(400).json({
        message: "This time slot is already booked. Please select another slot.",
      });
    }

    return res.status(500).json({
      message: "Server error while booking appointment",
      error: error.message,
    });
  }
};

exports.getAppointments = async (req, res) => {
  try {
    const userId = req.user.phone || req.user._id;

    const appointments = await Appointment.find({ userId }).sort({
      date: -1,
      createdAt: -1,
    });

    return res.status(200).json({
      message: "Appointments fetched successfully",
      appointments,
    });
  } catch (error) {
    console.error("Error fetching appointments:", error);

    return res.status(500).json({
      message: "Error fetching appointments",
      error: error.message,
    });
  }
};