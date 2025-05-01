// Placeholder content for appointmentController.js
const Appointment = require("../models/Appointment");
const User = require("../models/User");

exports.bookAppointment = async (req, res) => {
    try {
      const { date, timeSlot } = req.body;
  
      // Validate input
      if (!date || !timeSlot) {
        return res.status(400).json({ message: "Date and time slot are required" });
      }
  
      // Get the user ID from the authenticated user's schema (req.user)
      const userId = req.user.phone;
  
      // Find the user
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
  
      // Check if the user already has an appointment for the same date and time slot
      const existingAppointment = await Appointment.findOne({ _id: userId, date, timeSlot });
      if (existingAppointment) {
        return res.status(400).json({ message: "Time slot already booked" });
      }
  
      // Create a new appointment
      const newAppointment = new Appointment({
        _id: userId, // Use the user's phone number as the appointment ID
        userName: user.name,
        date,
        timeSlot,
        status: "pending",
      });
  
      await newAppointment.save();
  
      // Add the appointment ID to the user's appointments array
      user.appointments.push(newAppointment._id);
      await user.save();
  
      res.status(201).json({ message: "Appointment booked successfully!", appointment: newAppointment });
    } catch (error) {
      console.error("Error booking appointment:", error.message);
      res.status(500).json({ error: "Server error" });
    }
  };

exports.getAppointments = async (req, res) => {
    try {
        console.log("Fetching all appointments...");
        // Fetch all appointments from the database
        const appointments = await Appointment.find();
        res.status(200).json({ message: "Appointments fetched successfully", appointments });
    } catch (error) {
        console.error("Error fetching appointments:", error.message);
        res.status(500).json({ message: "Error fetching appointments", error: error.message });
    }
};