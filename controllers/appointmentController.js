const Appointment = require("../models/Appointment");
const User = require("../models/User");

// Book appointment
exports.bookAppointment = async (req, res) => {
  try {
    console.log("BOOK APPOINTMENT BODY:", req.body);
    console.log("AUTH USER:", req.user);

    const { date, timeSlot } = req.body;
    const phone = req.user?.phone;

    if (!date || !timeSlot) {
      return res.status(400).json({
        message: "Date and time slot are required",
      });
    }

    if (!phone) {
      return res.status(401).json({
        message: "Invalid token. Phone not found.",
      });
    }

    const user = await User.findById(phone);

    if (!user) {
      return res.status(404).json({
        message: "User not found. Please complete registration first.",
      });
    }

    const existingAppointment = await Appointment.findOne({
      date,
      timeSlot,
      status: { $ne: "canceled" },
    });

    if (existingAppointment) {
      return res.status(400).json({
        message: "This time slot is already booked",
      });
    }

    const appointmentId = `${phone}-${Date.now()}`;

    const newAppointment = new Appointment({
      _id: appointmentId,
      userName: user.name || "Patient",
      userPhone: phone,
      date,
      timeSlot,
      status: "pending",
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
    console.error("Error booking appointment:", error);

    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Get booked slots by date
exports.getBookedSlots = async (req, res) => {
  try {
    const { date } = req.query;

    console.log("BOOKED SLOTS DATE:", date);

    if (!date) {
      return res.status(400).json({
        message: "Date is required",
      });
    }

    const appointments = await Appointment.find({
      date,
      status: { $ne: "canceled" },
    });

    console.log("BOOKED APPOINTMENTS FOUND:", appointments);

    const bookedSlots = appointments
      .map((appointment) => appointment.timeSlot)
      .filter(Boolean);

    return res.status(200).json({
      bookedSlots,
    });
  } catch (error) {
    console.error("Error fetching booked slots:", error);

    return res.status(500).json({
      message: "Error fetching booked slots",
      error: error.message,
    });
  }
};

// Get all appointments
exports.getAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find().sort({ createdAt: -1 });

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