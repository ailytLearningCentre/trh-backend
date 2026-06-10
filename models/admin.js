const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, enum: ["admin"], default: "admin" },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Admin", adminSchema);

