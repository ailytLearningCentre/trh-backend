const mongoose = require("mongoose");

const doctorRequestSchema = new mongoose.Schema(
  {
    doctorId: { type: String, required: true, index: true },
    doctorName: { type: String, default: "Doctor" },
    requestType: {
      type: String,
      enum: [
        "reassign_appointment",
        "reschedule_appointment",
        "patient_no_show",
        "schedule_conflict",
        "leave_notification",
        "need_patient_information",
        "other",
      ],
      required: true,
    },
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      default: null,
    },
    message: { type: String, required: true, trim: true, maxlength: 1000 },
    status: {
      type: String,
      enum: ["pending", "resolved", "rejected"],
      default: "pending",
      index: true,
    },
    adminResponse: { type: String, default: "", trim: true },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("DoctorRequest", doctorRequestSchema);
