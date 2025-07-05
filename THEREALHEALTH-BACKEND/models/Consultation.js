const mongoose = require("mongoose");

const prescriptionSchema = new mongoose.Schema({
  medicineName: String,
  dosage: String,
  duration: String,
});

const consultationSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true,
    ref: "User", // Reference to the User schema
  },
  notes: { type: String, required: true },
  prescription: [prescriptionSchema],
  date: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Consultation", consultationSchema);