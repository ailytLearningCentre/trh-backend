const Appointment = require("../models/Appointment");
const User = require("../models/User");

exports.bookAppointment = async (req, res) => {
  try {
    const { date, timeSlot } = req.body;

    console.log("📥 Book request:", { date, timeSlot, user: req.user });

    if (!date || !timeSlot) {
      return res.status(400).json({
        message: "Date and time slot are required",
      });
    }

    const userId = req.user.phone || req.user._id || req.user.id;

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
      console.log("❌ User not found for:", userId);
      return res.status(404).json({ message: "User not found" });
    }

    const existingAppointment = await Appointment.findOne({
      date,
      timeSlot,
      status: { $ne: "cancelled" },
    });

    if (existingAppointment) {
      console.log("⚠️ Slot already booked:", date, timeSlot);
      return res.status(400).json({
        message: "Time slot already booked",
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

    console.log("✅ Appointment booked successfully:", newAppointment);

    return res.status(201).json({
      message: "Appointment booked successfully!",
      appointment: newAppointment,
    });
  } catch (error) {
    if (error.code === 11000) {
      console.log("⚠️ Duplicate slot blocked by MongoDB index");
      return res.status(400).json({
        message: "Time slot already booked",
      });
    }

    console.error("❌ Error booking appointment:", error);
    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

exports.getBookedSlots = async (req, res) => {
  try {
    const { date } = req.query;

    console.log("📅 getBookedSlots called for date:", date);

    if (!date) {
      return res.status(400).json({
        message: "Date is required",
      });
    }

    const appointments = await Appointment.find({
      date,
      status: { $ne: "cancelled" },
    });

    const bookedSlots = appointments.map((appointment) => appointment.timeSlot);

    console.log("✅ Booked slots:", bookedSlots);

    return res.status(200).json({ bookedSlots });
  } catch (error) {
    console.error("❌ Error fetching booked slots:", error);
    return res.status(500).json({
      message: "Error fetching booked slots",
      error: error.message,
    });
  }
};

exports.cancelAppointment = async (req, res) => {
  try {
    const { date, timeSlot } = req.body;

    console.log("🗑 Cancel request:", { date, timeSlot, user: req.user });

    if (!date || !timeSlot) {
      return res.status(400).json({
        message: "Date and time slot are required",
      });
    }

    const appointment = await Appointment.findOneAndUpdate(
      {
        date,
        timeSlot,
        status: { $ne: "cancelled" },
      },
      { status: "cancelled" },
      { new: true }
    );

    if (!appointment) {
      console.log("❌ Appointment not found for cancel:", date, timeSlot);
      return res.status(404).json({
        message: "Appointment not found",
      });
    }

    console.log("✅ Appointment cancelled:", appointment);

    return res.status(200).json({
      message: "Appointment cancelled successfully",
      appointment,
    });
  } catch (error) {
    console.error("❌ Error cancelling appointment:", error);
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
    console.error("❌ Error fetching appointments:", error);
    return res.status(500).json({
      message: "Error fetching appointments",
      error: error.message,
    });
  }
};