import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ClientDashboard() {
  const navigate = useNavigate();

  // Mock data para sa mga bookings ng client (maaari itong palitan ng API call mamaya)
  const [bookings, setBookings] = useState([
    {
      id: 1,
      packageName: 'Standard Self-Portrait Package',
      date: '2026-11-20',
      time: '02:00 PM',
      status: 'Confirmed',
    },
    {
      id: 2,
      packageName: 'Premium Studio Session',
      date: '2026-10-15',
      time: '10:00 AM',
      status: 'Completed',
    },
  ]);

  const clientInfo = {
    name: 'Edrian Balingbing',
    email: 'edrian@example.com',
    phone: '+63 912 345 6789',
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      {/* Header */}
      <div className="max-w-5xl mx-auto flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Client Dashboard</h1>
          <p className="text-slate-600">Welcome back, {clientInfo.name}!</p>
        </div>
        <button
          onClick={() => navigate('/book')}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition shadow"
        >
          + Book New Session
        </button>
      </div>

      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 md:col-span-1 h-fit">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">My Profile</h2>
          <div className="space-y-3 text-sm">
            <div>
              <span className="text-slate-400 block">Full Name</span>
              <span className="font-medium text-slate-700">{clientInfo.name}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Email Address</span>
              <span className="font-medium text-slate-700">{clientInfo.email}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Phone Number</span>
              <span className="font-medium text-slate-700">{clientInfo.phone}</span>
            </div>
          </div>
        </div>

        {/* Bookings List */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 md:col-span-2">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">My Appointments</h2>
          {bookings.length === 0 ? (
            <p className="text-slate-500 text-sm">No bookings found yet.</p>
          ) : (
            <div className="space-y-4">
              {bookings.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border border-slate-100 rounded-xl bg-slate-50 gap-4"
                >
                  <div>
                    <h3 className="font-semibold text-slate-800">{item.packageName}</h3>
                    <p className="text-sm text-slate-500">
                      📅 {item.date} at {item.time}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      item.status === 'Confirmed'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}