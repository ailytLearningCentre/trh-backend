const Appointment = require("../models/Appointment");
const User = require("../models/User");

const getTokenUserId = (req) => {
  return req.user?.phone || req.user?._id || req.user?.id;
};

exports.bookAppointment = async (req, res) => {
  try {
    const { date, timeSlot } = req.body;

    console.log("Book request:", { date, timeSlot, user: req.user });

    if (!date || !timeSlot) {
      return res.status(400).json({
        message: "Date and time slot are required",
      });
    }

    const userId = getTokenUserId(req);

    if (!userId) {
      return res.status(401).json({
        message: "Invalid token. User id not found.",
      });
    }

    const user = await User.findOne({
      $or: [
        { _id: userId },
        { phone: userId },
        { mobile: userId },
        { phoneNumber: userId },
      ],
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Universal slot lock:
    // If any user has pending/confirmed appointment on same date + slot,
    // block this slot for everyone.
    const existingAppointment = await Appointment.findOne({
      date,
      timeSlot,
      status: { $in: ["pending", "confirmed"] },
    });

    if (existingAppointment) {
      return res.status(400).json({
        message: "Time slot already booked",
      });
    }

    const cancelledAppointment = await Appointment.findOne({
      date,
      timeSlot,
      status: "cancelled",
    });

    if (cancelledAppointment) {
      cancelledAppointment.status = "pending";
      cancelledAppointment.userId = userId;
      cancelledAppointment.userName =
        user.name || user.fullName || user.phone || userId;

      await cancelledAppointment.save();

      return res.status(200).json({
        message: "Appointment booked successfully!",
        appointment: cancelledAppointment,
      });
    }

    const newAppointment = new Appointment({
      userId,
      userName: user.name || user.fullName || user.phone || userId,
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
    if (error.code === 11000) {
      return res.status(400).json({
        message: "Time slot already booked",
      });
    }

    console.error("Error booking appointment:", error);

    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

exports.getBookedSlots = async (req, res) => {
  try {
    const { date } = req.query;

    console.log("getBookedSlots called for date:", date);

    if (!date) {
      return res.status(400).json({
        message: "Date is required",
      });
    }

    // Universal booked slots:
    // All pending/confirmed slots are unavailable for every user.
    const appointments = await Appointment.find({
      date,
      status: { $in: ["pending", "confirmed"] },
    });

    const bookedSlots = appointments.map((appointment) => appointment.timeSlot);

    return res.status(200).json({ bookedSlots });
  } catch (error) {
    console.error("Error fetching booked slots:", error);

    return res.status(500).json({
      message: "Error fetching booked slots",
      error: error.message,
    });
  }
};

exports.cancelAppointment = async (req, res) => {
  try {
    const { date, timeSlot } = req.body;

    console.log("Cancel request:", { date, timeSlot, user: req.user });

    if (!date || !timeSlot) {
      return res.status(400).json({
        message: "Date and time slot are required",
      });
    }

    const userId = getTokenUserId(req);

    if (!userId) {
      return res.status(401).json({
        message: "Invalid token. User id not found.",
      });
    }

    // Only the user who booked this appointment can cancel it.
    const appointment = await Appointment.findOneAndUpdate(
      {
        date,
        timeSlot,
        userId,
        status: { $in: ["pending", "confirmed"] },
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
    console.error("Error cancelling appointment:", error);

    return res.status(500).json({
      message: "Error cancelling appointment",
      error: error.message,
    });
  }
};

exports.getAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find();

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