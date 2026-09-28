const Appointment = require("../models/Appointment");
const User = require("../models/User");
const family = require('../services/familyMemberService');
const WellnessPurchase = require('../models/WellnessPurchase');
const DoctorAvailability = require("../models/DoctorAvailability");

const BLOCKED_STATUSES = ["pending", "confirmed", "approved", "completed"];

const getTokenUserId = (req) => req.user?.phone || req.user?._id || req.user?.id;

async function findUserFromRequest(req) { return family.account(req); }

async function getActiveDoctors() {
  return User.find({ role: "doctor", isActive: { $ne: false } }).select(
    "_id name defaultWorkingDays defaultWorkingHours isActive"
  );
}

function weekdayName(dateString) {
  const parsed = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][
    parsed.getDay()
  ];
}

async function getAvailableDoctorsForSlot(date, timeSlot) {
  const doctors = await getActiveDoctors();
  const dayName = weekdayName(date);

  if (!dayName) return [];

  const doctorIds = doctors.map((doctor) => doctor._id.toString());
  const availabilityRows = await DoctorAvailability.find({
    doctorId: { $in: doctorIds },
    date,
  });

  const availabilityMap = new Map(
    availabilityRows.map((row) => [row.doctorId, row])
  );

  const bookedAppointments = await Appointment.find({
    date,
    timeSlot,
    doctorId: { $in: doctorIds },
    status: { $in: BLOCKED_STATUSES },
  }).select("doctorId");

  const bookedDoctorIds = new Set(
    bookedAppointments.map((appointment) => appointment.doctorId)
  );

  return doctors.filter((doctor) => {
    const doctorId = doctor._id.toString();
    const workingDays = Array.isArray(doctor.defaultWorkingDays)
      ? doctor.defaultWorkingDays
      : [];

    if (workingDays.length > 0 && !workingDays.includes(dayName)) return false;

    const exception = availabilityMap.get(doctorId);
    if (exception?.allDayUnavailable) return false;
    if (exception?.unavailableSlots?.includes(timeSlot)) return false;
    if (bookedDoctorIds.has(doctorId)) return false;

    return true;
  });
}

exports.bookAppointment = async (req, res) => {
  try {
    const { date, timeSlot } = req.body;

    if (!date || !timeSlot) {
      return res.status(400).json({ message: "Date and time slot are required" });
    }

    const user = await findUserFromRequest(req);
    if (!user) return res.status(404).json({ message: "User not found" });

    const member = await family.resolve(user, req.body.familyMemberId);
    const purchaseId = req.body.purchaseId;
    if (purchaseId || req.body.reason === 'Prakriti Guidance') {
      if (typeof purchaseId !== 'string' || !/^[a-f0-9]{24}$/i.test(purchaseId)) family.fail(400, 'A verified plan is required for this consultation.');
      const purchase = await WellnessPurchase.findOne({ _id: purchaseId, userId: String(user._id), ...family.scope(member.id), status: 'active' });
      if (!purchase || !purchase.activatedAt) family.fail(403, 'A verified plan for this member is required.');
    }
    const availableDoctors = await getAvailableDoctorsForSlot(date, timeSlot);
    const unassignedBookings = await Appointment.countDocuments({
      date,
      timeSlot,
      doctorId: { $in: ["", null] },
      status: { $in: BLOCKED_STATUSES },
    });

    if (availableDoctors.length <= unassignedBookings) {
      return res.status(400).json({
        message: "No doctor is available for this time slot. Please choose another slot.",
      });
    }

    const duplicateForUser = await Appointment.findOne({
      userId: user._id.toString(),
      ...family.scope(member.id),
      date,
      timeSlot,
      status: { $in: BLOCKED_STATUSES },
    });

    if (duplicateForUser) {
      return res.status(400).json({ message: "You already booked this time slot" });
    }

    const appointment = await Appointment.create({
      familyMemberId: member.id,
      patientName: member.fullName,
      ...(purchaseId ? { purchaseId } : {}),
      userId: user._id.toString(),
      userName: user.name || user._id || "User",
      userPhone: user._id.toString(),
      date,
      timeSlot,
      status: "pending",
    });

    return res.status(201).json({
      message: "Appointment booked successfully!",
      appointment,
    });
  } catch (error) {
    if ([400, 401, 403, 404].includes(error.status)) return res.status(error.status).json({ message: error.message });
    console.error("Error booking appointment:", error);
    return res.status(500).json({
      message: "Server error while booking appointment",
      error: error.message,
    });
  }
};

exports.getBookedSlots = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ message: "Date is required" });

    if (req.query.familyMemberId !== undefined) await family.resolve(await family.account(req), req.query.familyMemberId);
    const allSlots = [
      "9:00 AM - 9:30 AM",
      "10:00 AM - 10:30 AM",
      "11:00 AM - 11:30 AM",
      "1:00 PM - 1:30 PM",
      "2:00 PM - 2:30 PM",
      "3:00 PM - 3:30 PM",
      "4:00 PM - 4:30 PM",
      "4:30 PM - 5:00 PM",
    ];

    const bookedSlots = [];
    const availability = {};

    for (const slot of allSlots) {
      const availableDoctors = await getAvailableDoctorsForSlot(date, slot);
      const unassignedBookings = await Appointment.countDocuments({
        date,
        timeSlot: slot,
        doctorId: { $in: ["", null] },
        status: { $in: BLOCKED_STATUSES },
      });

      const remainingCapacity = Math.max(availableDoctors.length - unassignedBookings, 0);
      availability[slot] = remainingCapacity;

      if (remainingCapacity === 0) bookedSlots.push(slot);
    }

    return res.status(200).json({
      message:
        bookedSlots.length === allSlots.length
          ? "No doctor is available on this date"
          : "Available slots fetched successfully",
      bookedSlots,
      availability,
      noDoctorAvailable: bookedSlots.length === allSlots.length,
    });
  } catch (error) {
    if ([400, 401, 403, 404].includes(error.status)) return res.status(error.status).json({ message: error.message });
    console.error("Error fetching slots:", error);
    return res.status(500).json({
      message: "Error fetching available slots",
      error: error.message,
    });
  }
};

exports.cancelAppointment = async (req, res) => {
  try {
    const { date, timeSlot } = req.body;
    if (!date || !timeSlot) {
      return res.status(400).json({ message: "Date and time slot are required" });
    }

    const user = await findUserFromRequest(req);
    if (!user) return res.status(404).json({ message: "User not found" });

    const member = await family.resolve(user, req.body.familyMemberId, { allowArchived: true });
    const appointment = await Appointment.findOneAndUpdate(
      {
        date,
        timeSlot,
        userId: user._id.toString(),
        ...family.scope(member.id),
        status: { $in: BLOCKED_STATUSES },
      },
      { status: "cancelled" },
      { new: true }
    );

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found for this user" });
    }

    return res.status(200).json({
      message: "Appointment cancelled successfully",
      appointment,
    });
  } catch (error) {
    if ([400, 401, 403, 404].includes(error.status)) return res.status(error.status).json({ message: error.message });
    return res.status(500).json({
      message: "Error cancelling appointment",
      error: error.message,
    });
  }
};

exports.getAppointments = async (req, res) => {
  try {
    const user = await findUserFromRequest(req);
    if (!user) return res.status(404).json({ message: "User not found" });

    const member = req.query.familyMemberId === undefined ? null : await family.resolve(user, req.query.familyMemberId, { allowArchived: true });
    const appointments = await Appointment.find({ userId: user._id.toString(), ...(member ? family.scope(member.id) : {}) }).sort({
      date: -1,
      createdAt: -1,
    });

    return res.status(200).json({
      message: "Appointments fetched successfully",
      appointments,
    });
  } catch (error) {
    if ([400, 401, 403, 404].includes(error.status)) return res.status(error.status).json({ message: error.message });
    return res.status(500).json({
      message: "Error fetching appointments",
      error: error.message,
    });
  }
};

exports.getDoctorAppointments = async (req, res) => {
  try {
    const doctorId = getTokenUserId(req)?.toString();
    if (!doctorId) return res.status(401).json({ message: "Doctor identity missing" });

    const appointments = await Appointment.find({
      doctorId,
      status: { $in: ["confirmed", "approved", "completed"] },
    }).sort({ date: 1, timeSlot: 1 });

    return res.status(200).json({
      message: "Doctor appointments fetched successfully",
      appointments,
    });
  } catch (error) {
    if ([400, 401, 403, 404].includes(error.status)) return res.status(error.status).json({ message: error.message });
    return res.status(500).json({
      message: "Error fetching doctor appointments",
      error: error.message,
    });
  }
};
