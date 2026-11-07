import React from 'react';
import Navbar from '../../components/Public/Navbar';
import Footer from '../../components/Public/Footer';
import { Link } from 'react-router-dom';

const LandingPage = () => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto px-6 py-12 flex flex-col justify-center items-center text-center">
        <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 mb-6 leading-tight">
          Capture Your Best Moments <br />
          <span className="text-amber-500">On Your Own Terms</span>
        </h1>
        <p className="text-lg text-slate-600 max-w-2xl mb-8">
          Professional self-portrait studio setup with remote shutter control, high-grade lighting, and instant photo prints.
        </p>
        <Link
          to="/book"
          className="bg-amber-500 hover:bg-amber-600 text-slate-900 text-lg font-bold px-8 py-4 rounded-xl shadow-lg transition-all"
        >
          Book a Session Now
        </Link>
      </main>
      <Footer />
    </div>
  );
};

export default LandingPage;