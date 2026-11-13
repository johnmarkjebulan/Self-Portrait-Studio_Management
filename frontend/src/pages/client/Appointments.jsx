import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import {
  appointmentsApi,
  packagesApi,
  settingsApi,
} from "../../services/api";
import { StatusBadge } from "../../components/common/StatusBadge";
import {
  studioToday,
  studioAppointmentDate,
} from "../../utils/date";

const ACTIVE_STATUSES = [
  "pending",
  "confirmed",
  "cancellation_requested",
  "reschedule_requested",
  "rescheduled",
  "checked_in",
  "waiting",
  "now_serving",
];

const PAST_STATUSES = [
  "completed",
  "cancelled",
  "no_show",
];

const QR_STATUSES = [
  "confirmed",
  "rescheduled",
  "checked_in",
  "waiting",
  "now_serving",
];

export default function ClientAppointments() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [searchParams, setSearchParams] = useSearchParams();
  const selectedAppointmentId = searchParams.get("appointment");

  const [appointments, setAppointments] = useState([]);
  const [addons, setAddons] = useState([]);

  const [settings, setSettings] = useState({
    cancellation_hours: 24,
    reschedule_hours: 24,
    no_show_forfeits_downpayment: true,
  });

  const [expandedQR, setExpandedQR] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [actionNote, setActionNote] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;

    setLoading(true);

    try {
      const [appts, addonsData, studioSettings] = await Promise.all([
        appointmentsApi.getAll(),
        packagesApi.getAddons(),
        settingsApi.get(),
      ]);

      setAppointments(
        [...appts].sort((a, b) =>
          b.created_at.localeCompare(a.created_at)
        )
      );

      setAddons(addonsData);

      if (studioSettings) {
        setSettings(studioSettings);
      }
    } catch (err) {
      console.error("Failed to load appointments:", err);

      toast(
        err.message || "Failed to load your appointments.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [user]);

  /*
   * WBS 1.2.1
   * If the client opens a specific booking from My Bookings,
   * automatically locate and focus that appointment.
   */
  useEffect(() => {
    if (
      !selectedAppointmentId ||
      appointments.length === 0
    ) {
      return;
    }

    const selectedAppointment = appointments.find(
      (appt) =>
        String(appt.id) === String(selectedAppointmentId)
    );

    if (!selectedAppointment) {
      return;
    }

    const timer = setTimeout(() => {
      const element = document.getElementById(
        `appointment-${selectedAppointment.id}`
      );

      element?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 150);

    return () => clearTimeout(timer);
  }, [selectedAppointmentId, appointments]);

  const active = appointments.filter((appt) =>
    ACTIVE_STATUSES.includes(appt.status)
  );

  const past = appointments.filter((appt) =>
    PAST_STATUSES.includes(appt.status)
  );

  const getQueueInfo = (appt) => {
    if (!appt.queue_number) {
      return null;
    }

    const today = studioToday();

    if (appt.date !== today) {
      return null;
    }

    const todayQueue = appointments.filter(
      (item) =>
        item.date === today &&
        item.queue_number
    );

    const nowServing = todayQueue.find(
      (item) => item.status === "now_serving"
    );

    const myPos = todayQueue.findIndex(
      (item) => item.id === appt.id
    );

    const ahead =
      myPos > 0
        ? todayQueue
            .slice(0, myPos)
            .filter(
              (item) =>
                ![
                  "completed",
                  "cancelled",
                  "no_show",
                ].includes(item.status)
            ).length
        : 0;

    return {
      queueNumber: appt.queue_number,
      nowServingNum:
        nowServing?.queue_number ?? null,
      isNowServing:
        appt.status === "now_serving",
      ahead,
      estimated: ahead * 45,
    };
  };

  const canCancel = (appt) => {
    if (
      ![
        "pending",
        "confirmed",
        "rescheduled",
      ].includes(appt.status)
    ) {
      return false;
    }

    const apptDateTime = studioAppointmentDate(
      appt.date,
      appt.time
    );

    const hoursUntil =
      (apptDateTime.getTime() - Date.now()) /
      3_600_000;

    return (
      hoursUntil >
      Number(settings.cancellation_hours || 24)
    );
  };

  const canReschedule = (appt) => {
    if (
      ![
        "confirmed",
        "rescheduled",
      ].includes(appt.status)
    ) {
      return false;
    }

    const apptDateTime = studioAppointmentDate(
      appt.date,
      appt.time
    );

    const hoursUntil =
      (apptDateTime.getTime() - Date.now()) /
      3_600_000;

    return (
      hoursUntil >
      Number(settings.reschedule_hours || 24)
    );
  };

  const handleCancelRequest = async (appt) => {
    if (!user || !actionNote.trim()) {
      return;
    }

    try {
      await appointmentsApi.update(appt.id, {
        status: "cancellation_requested",
        cancellation_reason: actionNote.trim(),
      });

      toast(
        "Cancellation request submitted. An admin will review it shortly.",
        "info"
      );

      setConfirmAction(null);
      setActionNote("");

      await load();
    } catch (err) {
      toast(
        err.message ||
          "Failed to submit cancellation request.",
        "error"
      );
    }
  };

  const handleRescheduleRequest = async (appt) => {
    if (!user || !actionNote.trim()) {
      return;
    }

    try {
      await appointmentsApi.update(appt.id, {
        status: "reschedule_requested",
        reschedule_reason: actionNote.trim(),
      });

      toast(
        "Reschedule request submitted. An admin will reach out to arrange a new date.",
        "info"
      );

      setConfirmAction(null);
      setActionNote("");

      await load();
    } catch (err) {
      toast(
        err.message ||
          "Failed to submit reschedule request.",
        "error"
      );
    }
  };

  const clearSelectedAppointment = () => {
    const nextParams = new URLSearchParams(
      searchParams
    );

    nextParams.delete("appointment");

    setSearchParams(nextParams, {
      replace: true,
    });
  };

  const confirmingAppt = confirmAction
    ? appointments.find(
        (appt) =>
          appt.id === confirmAction.apptId
      ) || null
    : null;

  const renderAppt = (appt) => {
    const pkg = appt.package;

    const apptAddons = addons.filter(
      (addon) =>
        appt.addon_ids &&
        appt.addon_ids.includes(addon.id)
    );

    const queueInfo = getQueueInfo(appt);

    const showQR =
      QR_STATUSES.includes(appt.status);

    const qrValue =
      `SP-STUDIO|${appt.tracking_number}|${appt.id}`;

    const qrExpanded =
      expandedQR === appt.id;

    const cancelable =
      canCancel(appt);

    const reschedulable =
      canReschedule(appt);

    const apptDateTime =
      studioAppointmentDate(
        appt.date,
        appt.time
      );

    const hoursUntil =
      (apptDateTime.getTime() - Date.now()) /
      3_600_000;

    const isSelected =
      selectedAppointmentId &&
      String(appt.id) ===
        String(selectedAppointmentId);

    return (
      <div
        id={`appointment-${appt.id}`}
        className={`scroll-mt-24 bg-white rounded-2xl border overflow-hidden card-shadow transition-all duration-300 ${
          isSelected
            ? "border-amber-400 ring-2 ring-amber-200 shadow-lg"
            : "border-gray-200"
        }`}
      >
        {/* Selected appointment indicator */}
        {isSelected && (
          <div className="flex items-center justify-between gap-3 bg-amber-50 border-b border-amber-200 px-4 sm:px-6 py-3">
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 shrink-0" />

              <div>
                <p className="text-amber-800 text-xs font-semibold uppercase tracking-wider">
                  Selected Appointment
                </p>

                <p className="text-amber-700 text-xs mt-0.5">
                  You opened this booking from My Bookings.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={clearSelectedAppointment}
              className="shrink-0 text-xs font-semibold text-amber-800 hover:text-amber-950 transition-colors"
            >
              Show All
            </button>
          </div>
        )}

        {/* Header */}
        <div className="bg-gray-50 p-4 sm:p-6 border-b border-gray-200">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">
                Tracking Number
              </p>

              <p className="tracking-number text-2xl font-bold text-gray-900">
                {appt.tracking_number}
              </p>

              <p className="text-gray-400 text-xs mt-1">
                Booked on{" "}
                {new Date(
                  appt.created_at
                ).toLocaleDateString(
                  "en-PH",
                  {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  }
                )}
              </p>
            </div>

            <div className="flex flex-col gap-2 items-end">
              <StatusBadge
                status={appt.status}
              />

              <StatusBadge
                status={appt.payment_status}
              />
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
          {/* Left column */}
          <div className="flex flex-col gap-5">
            <div>
              <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">
                Package
              </p>

              <p className="text-gray-900 font-semibold">
                {pkg?.name ||
                  "Photography Session"}
              </p>

              {pkg && (
                <p className="text-gray-500 text-xs mt-0.5">
                  {pkg.duration}-minute
                  session · Up to{" "}
                  {pkg.max_people} people
                </p>
              )}
            </div>

            <div>
              <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">
                Schedule
              </p>

              <p className="text-gray-900 font-semibold">
                {new Date(
                  appt.date +
                    "T12:00:00"
                ).toLocaleDateString(
                  "en-PH",
                  {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  }
                )}
              </p>

              <p className="text-gray-400 text-xs font-mono mt-0.5">
                {appt.time}
              </p>
            </div>

            <div>
              <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">
                Guests
              </p>

              <p className="text-gray-700">
                {appt.num_people}{" "}
                {appt.num_people === 1
                  ? "person"
                  : "people"}
              </p>
            </div>

            {appt.special_requests && (
              <div>
                <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">
                  Special Requests
                </p>

                <p className="text-gray-500 text-sm italic">
                  "{appt.special_requests}"
                </p>
              </div>
            )}

            {apptAddons.length > 0 && (
              <div>
                <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">
                  Add-ons
                </p>

                <div className="space-y-1">
                  {apptAddons.map(
                    (addon) => (
                      <p
                        key={addon.id}
                        className="text-gray-500 text-xs"
                      >
                        • {addon.name}{" "}
                        (+₱
                        {Number(
                          addon.price || 0
                        ).toLocaleString()}
                        )
                      </p>
                    )
                  )}
                </div>
              </div>
            )}

            {/* Appointment actions */}
            {(cancelable ||
              reschedulable ||
              [
                "pending",
                "confirmed",
                "rescheduled",
              ].includes(
                appt.status
              )) && (
              <div className="flex flex-col gap-2 pt-2">
                {reschedulable && (
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmAction({
                        type: "reschedule",
                        apptId:
                          appt.id,
                      });

                      setActionNote(
                        ""
                      );
                    }}
                    className="w-full text-left px-4 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium transition-colors flex items-center gap-2"
                  >
                    <svg
                      className="w-4 h-4 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>

                    Request Reschedule
                  </button>
                )}

                {cancelable ? (
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmAction({
                        type: "cancel",
                        apptId:
                          appt.id,
                      });

                      setActionNote(
                        ""
                      );
                    }}
                    className="w-full text-left px-4 py-2.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-sm font-medium transition-colors flex items-center gap-2"
                  >
                    <svg
                      className="w-4 h-4 text-red-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>

                    Request Cancellation
                  </button>
                ) : [
                    "pending",
                    "confirmed",
                    "rescheduled",
                  ].includes(
                    appt.status
                  ) &&
                  hoursUntil >
                    0 ? (
                  <div className="px-4 py-2.5 rounded-xl border border-orange-200 bg-orange-50 text-orange-700 text-xs leading-relaxed">
                    <span className="font-medium">
                      Cancellation
                      window has
                      passed.
                    </span>{" "}
                    Contact the
                    studio directly.
                    Down payment
                    may be
                    non-refundable
                    based on the{" "}
                    {
                      settings.cancellation_hours
                    }
                    -hour policy.
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-5">
            {/* Payment Summary */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <p className="text-gray-400 text-xs uppercase tracking-wider mb-3">
                Payment Summary
              </p>

              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-500">
                  Total Amount
                </span>

                <span className="text-gray-900 font-mono font-semibold">
                  ₱
                  {Number(
                    appt.total_price ||
                      0
                  ).toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-500">
                  Down Payment
                </span>

                <span className="text-gray-700 font-mono">
                  ₱
                  {Number(
                    appt.down_payment ||
                      0
                  ).toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-500">
                  Amount Paid
                </span>

                <span className="text-emerald-600 font-mono">
                  ₱
                  {Number(
                    appt.amount_paid ||
                      0
                  ).toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
                <span className="text-gray-500">
                  Remaining Balance
                </span>

                <span
                  className={`font-mono font-semibold ${
                    Number(
                      appt.remaining_balance ||
                        0
                    ) > 0
                      ? "text-gray-900"
                      : "text-emerald-600"
                  }`}
                >
                  ₱
                  {Number(
                    appt.remaining_balance ||
                      0
                  ).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Queue tracker */}
            {queueInfo && (
              <div
                className={`border rounded-xl p-4 ${
                  queueInfo.isNowServing
                    ? "bg-emerald-50 border-emerald-200"
                    : "bg-purple-50 border-purple-200"
                }`}
              >
                <div className="flex items-center gap-2 mb-3">
                  {queueInfo.isNowServing ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />

                      <span className="text-emerald-700 text-xs font-semibold uppercase tracking-wider">
                        Now Serving —
                        Your turn!
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="w-2 h-2 rounded-full bg-purple-400" />

                      <span className="text-purple-700 text-xs font-semibold uppercase tracking-wider">
                        Queue Status
                      </span>
                    </>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    {
                      label:
                        "Your Number",
                      value: `#${queueInfo.queueNumber}`,
                      highlight: true,
                    },
                    {
                      label:
                        "Now Serving",
                      value:
                        queueInfo.nowServingNum !==
                        null
                          ? `#${queueInfo.nowServingNum}`
                          : "—",
                      highlight: false,
                    },
                    {
                      label:
                        "Ahead of You",
                      value: String(
                        queueInfo.ahead
                      ),
                      highlight: false,
                    },
                    {
                      label:
                        "Est. Wait",
                      value:
                        queueInfo.ahead ===
                        0
                          ? "—"
                          : `~${queueInfo.estimated} min`,
                      highlight: false,
                    },
                  ].map(
                    ({
                      label,
                      value,
                      highlight,
                    }) => (
                      <div
                        key={label}
                        className="text-center"
                      >
                        <div
                          className={`text-xl font-bold font-mono ${
                            highlight
                              ? queueInfo.isNowServing
                                ? "text-emerald-700"
                                : "text-purple-700"
                              : "text-gray-800"
                          }`}
                        >
                          {value}
                        </div>

                        <div className="text-gray-500 text-xs mt-0.5">
                          {label}
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

            {/* Check-in QR */}
            {showQR && (
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() =>
                    setExpandedQR(
                      qrExpanded
                        ? null
                        : appt.id
                    )
                  }
                  className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-gray-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={
                          2
                        }
                        d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.24M16.24 12l1.06 1.06L18 12m-5.76-1.18L12 12m0 0l-1.5 1.5"
                      />

                      <rect
                        x="3"
                        y="3"
                        width="7"
                        height="7"
                        rx="1"
                        strokeWidth={
                          1.5
                        }
                      />

                      <rect
                        x="14"
                        y="3"
                        width="7"
                        height="7"
                        rx="1"
                        strokeWidth={
                          1.5
                        }
                      />

                      <rect
                        x="3"
                        y="14"
                        width="7"
                        height="7"
                        rx="1"
                        strokeWidth={
                          1.5
                        }
                      />
                    </svg>

                    <span className="text-gray-700 text-sm font-medium">
                      Check-in QR
                      Code
                    </span>
                  </div>

                  <svg
                    className={`w-4 h-4 text-gray-400 transition-transform ${
                      qrExpanded
                        ? "rotate-180"
                        : ""
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {qrExpanded && (
                  <div className="p-5 flex flex-col items-center gap-3 border-t border-gray-100">
                    <div className="bg-white border border-gray-100 rounded-xl p-3">
                      <QRCodeSVG
                        value={
                          qrValue
                        }
                        size={140}
                        fgColor="#111827"
                        bgColor="#ffffff"
                        level="M"
                      />
                    </div>

                    <p className="text-gray-400 text-xs text-center leading-relaxed">
                      Show this at
                      the studio for
                      quick check-in.
                      Each code is
                      unique to your
                      booking.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Payment CTAs */}
            {appt.payment_status ===
              "payment_required" && (
              <Link
                to="/client/payments"
                className="block text-center bg-gray-900 hover:bg-gray-800 text-white font-semibold py-3 rounded-xl text-sm transition-colors"
              >
                Upload Payment
                Proof →
              </Link>
            )}

            {appt.payment_status ===
              "payment_submitted" && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-yellow-700 text-sm text-center">
                Payment under
                review · Admin
                will verify within
                24 hrs
              </div>
            )}

            {appt.payment_status ===
              "rejected" && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <p className="text-red-700 text-sm font-medium mb-1">
                  Payment rejected
                </p>

                <Link
                  to="/client/payments"
                  className="text-red-600 text-xs underline"
                >
                  Upload a new
                  proof →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            My Appointments
          </h1>

          <p className="text-gray-500 text-sm mt-1">
            View, track and manage your photography
            appointments.
          </p>
        </div>

        <Link
          to="/client/book"
          className="bg-gray-900 hover:bg-gray-800 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors"
        >
          + Book New
        </Link>
      </div>

      {loading ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center card-shadow">
          <div className="w-7 h-7 rounded-full border-2 border-gray-200 border-t-gray-900 animate-spin mx-auto mb-3" />

          <p className="text-gray-500 text-sm">
            Loading appointments...
          </p>
        </div>
      ) : (
        <>
          {active.length === 0 &&
            past.length === 0 && (
              <div className="text-center py-20 bg-white rounded-2xl border border-gray-200 card-shadow">
                <p className="text-gray-500 mb-4">
                  You don't have any appointments yet.
                </p>

                <Link
                  to="/client/book"
                  className="bg-gray-900 hover:bg-gray-800 text-white font-semibold px-6 py-3 rounded-xl text-sm transition-colors"
                >
                  Book Your First
                  Session
                </Link>
              </div>
            )}

          {active.length > 0 && (
            <div className="mb-10">
              <h2 className="text-gray-400 text-xs uppercase tracking-wider mb-4">
                Active & Upcoming
              </h2>

              <div className="flex flex-col gap-6">
                {active.map(
                  (appt) => (
                    <div
                      key={
                        appt.id
                      }
                    >
                      {renderAppt(
                        appt
                      )}
                    </div>
                  )
                )}
              </div>
            </div>
          )}

          {past.length > 0 && (
            <div>
              <h2 className="text-gray-400 text-xs uppercase tracking-wider mb-4">
                Past Appointments
              </h2>

              <div className="flex flex-col gap-6">
                {past.map(
                  (appt) => (
                    <div
                      key={
                        appt.id
                      }
                    >
                      {renderAppt(
                        appt
                      )}
                    </div>
                  )
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Cancel / Reschedule Modal */}
      {confirmAction &&
        confirmingAppt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
              <h3 className="font-semibold text-gray-900 mb-1">
                {confirmAction.type ===
                "cancel"
                  ? "Request Cancellation"
                  : "Request Reschedule"}
              </h3>

              <p className="text-gray-500 text-sm mb-4">
                {confirmAction.type ===
                "cancel"
                  ? `This will submit a cancellation request for ${confirmingAppt.tracking_number}. The admin will review and process it.`
                  : `This will notify the admin that you'd like to reschedule ${confirmingAppt.tracking_number}.`}
              </p>

              {confirmAction.type ===
                "cancel" &&
                settings.no_show_forfeits_downpayment && (
                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 mb-4 text-xs text-orange-700 leading-relaxed">
                    <strong>
                      Policy
                      notice:
                    </strong>{" "}
                    Down payments
                    may be
                    non-refundable
                    for late
                    cancellations.
                    Approved
                    cancellations
                    made more than{" "}
                    {
                      settings.cancellation_hours
                    }{" "}
                    hours in
                    advance may be
                    eligible for a
                    refund at the
                    admin's
                    discretion.
                  </div>
                )}

              <div className="mb-4">
                <label className="text-gray-500 text-xs uppercase tracking-wider block mb-2">
                  {confirmAction.type ===
                  "cancel"
                    ? "Reason (required)"
                    : "Preferred dates / notes (required)"}
                </label>

                <textarea
                  value={
                    actionNote
                  }
                  onChange={(e) =>
                    setActionNote(
                      e.target
                        .value
                    )
                  }
                  placeholder={
                    confirmAction.type ===
                    "cancel"
                      ? "Let us know why you're cancelling..."
                      : "e.g. Prefer next Saturday morning..."
                  }
                  rows={3}
                  className="w-full bg-gray-50 border border-gray-200 focus:border-gray-400 text-gray-900 placeholder:text-gray-400 px-3 py-2 rounded-xl outline-none text-sm resize-none transition-colors"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setConfirmAction(
                      null
                    );
                    setActionNote(
                      ""
                    );
                  }}
                  className="flex-1 px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold rounded-xl text-sm transition-colors"
                >
                  Back
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (
                      confirmAction.type ===
                      "cancel"
                    ) {
                      handleCancelRequest(
                        confirmingAppt
                      );
                    } else {
                      handleRescheduleRequest(
                        confirmingAppt
                      );
                    }
                  }}
                  disabled={
                    !actionNote.trim()
                  }
                  className={`flex-1 px-4 py-2.5 font-semibold rounded-xl text-sm transition-colors text-white disabled:opacity-40 disabled:cursor-not-allowed ${
                    confirmAction.type ===
                    "cancel"
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-gray-900 hover:bg-gray-800"
                  }`}
                >
                  Confirm Request
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}