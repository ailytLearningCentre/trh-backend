const mongoose = require("mongoose");

const doctorNotificationSchema = new mongoose.Schema(
  {
    doctorId: { type: String, required: true, index: true },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: [
        "appointment_assigned",
        "appointment_updated",
        "appointment_cancelled",
        "appointment_reminder",
        "availability_conflict",
        "admin_response",
        "general",
      ],
      default: "general",
    },
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      default: null,
    },
    isRead: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("DoctorNotification", doctorNotificationSchema);
