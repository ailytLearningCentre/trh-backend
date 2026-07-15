const mongoose = require("mongoose");

const doctorAvailabilitySchema = new mongoose.Schema(
  {
    doctorId: {
      type: String,
      required: true,
      index: true,
    },
    date: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
      index: true,
    },
    allDayUnavailable: {
      type: Boolean,
      default: false,
    },
    unavailableSlots: {
      type: [String],
      default: [],
    },
    reason: {
      type: String,
      default: "",
      trim: true,
      maxlength: 250,
    },
  },
  { timestamps: true }
);

doctorAvailabilitySchema.index({ doctorId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("DoctorAvailability", doctorAvailabilitySchema);
