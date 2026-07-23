const User = require("../models/User");
const Appointment = require("../models/Appointment");
const Consultation = require("../models/Consultation");
const DoctorAvailability = require("../models/DoctorAvailability");
const DoctorNotification = require("../models/DoctorNotification");
const DoctorRequest = require("../models/DoctorRequest");

const getDoctorId = (req) =>
  (req.user?.phone || req.user?._id || req.user?.id || "").toString();

async function getDoctor(req) {
  const doctorId = getDoctorId(req);
  if (!doctorId) return null;
  return User.findOne({ _id: doctorId, role: "doctor" });
}

exports.getDashboard = async (req, res) => {
  try {
    const doctor = await getDoctor(req);
    if (!doctor) return res.status(404).json({ message: "Doctor not found" });

    const doctorId = doctor._id.toString();
    const today = new Date().toISOString().slice(0, 10);

    const [
      todayAppointments,
      upcomingAppointmentsCount,
      upcomingAppointments,
      unreadNotifications,
      unavailableDates,
    ] = await Promise.all([
      Appointment.countDocuments({
        doctorId,
        date: today,
        status: { $in: ["confirmed", "approved"] },
      }),
      Appointment.countDocuments({
        doctorId,
        date: { $gte: today },
        status: { $in: ["confirmed", "approved"] },
      }),
      Appointment.find({
        doctorId,
        date: { $gte: today },
        status: { $in: ["confirmed", "approved"] },
      })
        .sort({ date: 1, timeSlot: 1 })
        .limit(5),
      DoctorNotification.countDocuments({ doctorId, isRead: false }),
      DoctorAvailability.countDocuments({
        doctorId,
        date: { $gte: today },
        allDayUnavailable: true,
      }),
    ]);

    return res.status(200).json({
      doctor: {
        id: doctorId,
        name: doctor.name || "Doctor",
        profileImage: doctor.profileImage || "",
        defaultWorkingDays: doctor.defaultWorkingDays || [],
        defaultWorkingHours: doctor.defaultWorkingHours || {
          start: "09:00",
          end: "17:00",
        },
        isActive: doctor.isActive !== false,
      },
      stats: {
        todayAppointments,
        upcomingAppointments: upcomingAppointmentsCount,
        unreadNotifications,
        unavailableDates,
      },
      nextAppointment: upcomingAppointments[0] || null,
      upcomingAppointments,
    });
  } catch (error) {
    return res.status(500).json({ message: "Unable to load dashboard", error: error.message });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const doctor = await getDoctor(req);
    if (!doctor) return res.status(404).json({ message: "Doctor not found" });

    return res.status(200).json({
      doctor: {
        id: doctor._id,
        name: doctor.name || "Doctor",
        profileImage: doctor.profileImage || "",
        defaultWorkingDays: doctor.defaultWorkingDays || [],
        defaultWorkingHours: doctor.defaultWorkingHours || {},
        isActive: doctor.isActive !== false,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Unable to load doctor profile", error: error.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const doctor = await getDoctor(req);
    if (!doctor) return res.status(404).json({ message: "Doctor not found" });

    const {
      name,
      profileImage,
      defaultWorkingDays,
      defaultWorkingHours,
      isActive,
    } = req.body;

    if (typeof name === "string" && name.trim()) doctor.name = name.trim();
    if (typeof profileImage === "string") doctor.profileImage = profileImage.trim();
    if (Array.isArray(defaultWorkingDays)) doctor.defaultWorkingDays = defaultWorkingDays;
    if (defaultWorkingHours && typeof defaultWorkingHours === "object") {
      doctor.defaultWorkingHours = {
        start: defaultWorkingHours.start || doctor.defaultWorkingHours?.start || "09:00",
        end: defaultWorkingHours.end || doctor.defaultWorkingHours?.end || "17:00",
      };
    }
    if (typeof isActive === "boolean") {
      doctor.isActive = isActive;
    }

    await doctor.save();
    return res.status(200).json({ message: "Doctor information updated", doctor });
  } catch (error) {
    return res.status(500).json({ message: "Unable to update doctor information", error: error.message });
  }
};

exports.getAvailability = async (req, res) => {
  try {
    const doctorId = getDoctorId(req);
    const availability = await DoctorAvailability.find({ doctorId }).sort({ date: 1 });
    return res.status(200).json({ availability });
  } catch (error) {
    return res.status(500).json({ message: "Unable to load availability", error: error.message });
  }
};

exports.saveAvailability = async (req, res) => {
  try {
    const doctor = await getDoctor(req);
    if (!doctor) return res.status(404).json({ message: "Doctor not found" });

    const { date, allDayUnavailable = false, unavailableSlots = [], reason = "" } = req.body;
    if (!date) return res.status(400).json({ message: "Date is required" });

    const row = await DoctorAvailability.findOneAndUpdate(
      { doctorId: doctor._id.toString(), date },
      {
        doctorId: doctor._id.toString(),
        date,
        allDayUnavailable: Boolean(allDayUnavailable),
        unavailableSlots: Array.isArray(unavailableSlots) ? unavailableSlots : [],
        reason,
      },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );

    const conflicts = await Appointment.find({
      doctorId: doctor._id.toString(),
      date,
      status: { $in: ["confirmed", "approved"] },
      ...(allDayUnavailable
        ? {}
        : { timeSlot: { $in: Array.isArray(unavailableSlots) ? unavailableSlots : [] } }),
    });

    if (conflicts.length > 0) {
      await DoctorNotification.create({
        doctorId: doctor._id.toString(),
        title: "Schedule conflict detected",
        message: `${conflicts.length} assigned appointment(s) conflict with your new availability. Admin must reassign or reschedule them.`,
        type: "availability_conflict",
      });
    }

    return res.status(200).json({
      message:
        conflicts.length > 0
          ? "Availability saved. Existing appointment conflicts were flagged for admin."
          : "Availability saved successfully",
      availability: row,
      conflicts,
    });
  } catch (error) {
    return res.status(500).json({ message: "Unable to save availability", error: error.message });
  }
};

exports.deleteAvailability = async (req, res) => {
  try {
    const doctorId = getDoctorId(req);
    const { date } = req.params;
    await DoctorAvailability.findOneAndDelete({ doctorId, date });
    return res.status(200).json({ message: "Availability exception removed" });
  } catch (error) {
    return res.status(500).json({ message: "Unable to restore availability", error: error.message });
  }
};

exports.getAppointments = async (req, res) => {
  try {
    const doctorId = getDoctorId(req);
    const appointments = await Appointment.find({ doctorId }).sort({ date: 1, timeSlot: 1 });
    return res.status(200).json({ appointments });
  } catch (error) {
    return res.status(500).json({ message: "Unable to load appointments", error: error.message });
  }
};

exports.getPatients = async (req, res) => {
  try {
    const doctorId = getDoctorId(req);
    const appointments = await Appointment.find({ doctorId }).select(
      "userId userName userPhone date timeSlot status"
    );

    const latestByPatient = new Map();
    for (const appointment of appointments) {
      if (!latestByPatient.has(appointment.userId)) {
        latestByPatient.set(appointment.userId, appointment);
      }
    }

    const patientIds = [...latestByPatient.keys()];
    const users = await User.find({ _id: { $in: patientIds } }).select(
      "_id name age gender weight height healthConditions"
    );

    const patients = users.map((user) => ({
      ...user.toObject(),
      latestAppointment: latestByPatient.get(user._id.toString()) || null,
    }));

    return res.status(200).json({ patients });
  } catch (error) {
    return res.status(500).json({ message: "Unable to load patients", error: error.message });
  }
};

exports.submitConsultationNotes = async (req, res) => {
  try {
    const doctorId = getDoctorId(req);
    const { appointmentId } = req.params;
    const { notes = "", prescription = [] } = req.body;

    const appointment = await Appointment.findOne({ _id: appointmentId, doctorId });
    if (!appointment) {
      return res.status(404).json({ message: "Assigned appointment not found" });
    }

    appointment.notes = typeof notes === "string" ? notes.trim() : "";
    appointment.prescription = Array.isArray(prescription) ? prescription : [];
    appointment.doctorNotesSubmitted = true;
    appointment.doctorNotesSubmittedAt = new Date();
    await appointment.save();

    await Consultation.findOneAndUpdate(
      { appointment: appointment._id },
      {
        appointment: appointment._id,
        user: appointment.userId,
        userName: appointment.userName,
        userPhone: appointment.userPhone || appointment.userId,
        doctorId: appointment.doctorId,
        doctorName: appointment.doctorName || "Doctor",
        date: appointment.date,
        timeSlot: appointment.timeSlot,
        status: appointment.status,
        notes: appointment.notes || "No doctor notes added.",
        prescription: appointment.prescription || [],
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({
      message: "Consultation notes saved. Appointment status was not changed.",
      appointment,
    });
  } catch (error) {
    return res.status(500).json({ message: "Unable to save consultation notes", error: error.message });
  }
};

exports.getNotifications = async (req, res) => {
  try {
    const doctorId = getDoctorId(req);
    const notifications = await DoctorNotification.find({ doctorId }).sort({ createdAt: -1 });
    return res.status(200).json({ notifications });
  } catch (error) {
    return res.status(500).json({ message: "Unable to load notifications", error: error.message });
  }
};

exports.markNotificationRead = async (req, res) => {
  try {
    const doctorId = getDoctorId(req);
    const notification = await DoctorNotification.findOneAndUpdate(
      { _id: req.params.notificationId, doctorId },
      { isRead: true },
      { new: true }
    );

    if (!notification) return res.status(404).json({ message: "Notification not found" });
    return res.status(200).json({ message: "Notification marked as read", notification });
  } catch (error) {
    return res.status(500).json({ message: "Unable to update notification", error: error.message });
  }
};

exports.createRequest = async (req, res) => {
  try {
    const doctor = await getDoctor(req);
    if (!doctor) return res.status(404).json({ message: "Doctor not found" });

    const { requestType, appointmentId = null, message } = req.body;
    const allowedRequestTypes = [
      "reassign_appointment",
      "reschedule_appointment",
      "patient_no_show",
      "schedule_conflict",
      "leave_notification",
      "need_patient_information",
      "other",
    ];

    if (!requestType || !message?.trim()) {
      return res.status(400).json({ message: "Request type and message are required" });
    }

    if (!allowedRequestTypes.includes(requestType)) {
      return res.status(400).json({ message: "Invalid request type" });
    }

    const request = await DoctorRequest.create({
      doctorId: doctor._id.toString(),
      doctorName: doctor.name || "Doctor",
      requestType,
      appointmentId: appointmentId || null,
      message: message.trim(),
    });

    return res.status(201).json({ message: "Request sent to admin", request });
  } catch (error) {
    return res.status(500).json({ message: "Unable to send request", error: error.message });
  }
};

exports.getRequests = async (req, res) => {
  try {
    const doctorId = getDoctorId(req);
    const requests = await DoctorRequest.find({ doctorId }).sort({ createdAt: -1 });
    return res.status(200).json({ requests });
  } catch (error) {
    return res.status(500).json({ message: "Unable to load requests", error: error.message });
  }
};
