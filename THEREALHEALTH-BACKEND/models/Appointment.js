const mongoose = require("mongoose");

const prescriptionSchema = new mongoose.Schema(
  {
    medicineName: { type: String, default: "" },
    dosage: { type: String, default: "" },
    duration: { type: String, default: "" },
  },
  { _id: false }
);

const appointmentSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    userName: { type: String, required: true },
    userPhone: { type: String, default: "" },

    doctorId: { type: String, default: "", index: true },
    doctorName: { type: String, default: "" },
    assignedAt: { type: Date, default: null },
    assignedBy: { type: String, default: "" },

    date: { type: String, required: true, index: true },
    timeSlot: { type: String, required: true, index: true },

    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "approved",
        "completed",
        "cancelled",
        "canceled",
        "rejected",
      ],
      default: "pending",
      index: true,
    },

    notes: { type: String, default: "" },
    prescription: [prescriptionSchema],
    doctorNotesSubmitted: { type: Boolean, default: false },
    doctorNotesSubmittedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

appointmentSchema.index({ date: 1, timeSlot: 1, doctorId: 1 });

module.exports = mongoose.model("Appointment", appointmentSchema);
