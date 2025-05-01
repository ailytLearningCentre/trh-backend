// Placeholder content for Appointment.js
const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  userName: { type: String, required: true },
  date: { type: String, required: true },
  timeSlot: { type: String, required: true },
  status: { type: String, enum: ["pending", "confirmed", "canceled"], default: "pending" },
}, { timestamps: true });

module.exports = mongoose.model("Appointment", appointmentSchema);