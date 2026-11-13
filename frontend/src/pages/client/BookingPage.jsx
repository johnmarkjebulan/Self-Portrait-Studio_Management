import React, { useState } from 'react';
import Navbar from '../../components/Public/Navbar';
import Footer from '../../components/Public/Footer';
import PackageCard from '../../components/client/PackageCard';

const BookingPage = () => {
  const [selectedPackage, setSelectedPackage] = useState(null);

  const packages = [
    {
      id: 1,
      title: 'Solo Express',
      price: 499,
      duration: '15 mins',
      features: ['1 Person', '1 Background Choice', '5 Soft Copies', '1 Printed Copy']
    },
    {
      id: 2,
      title: 'Duo Special',
      price: 899,
      duration: '25 mins',
      features: ['2 Persons', '2 Background Choices', '10 Soft Copies', '2 Printed Copies']
    },
    {
      id: 3,
      title: 'Squad Session',
      price: 1499,
      duration: '45 mins',
      features: ['Up to 5 Persons', 'All Backgrounds', 'All Digital Soft Copies', '5 Printed Copies']
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto px-6 py-10 w-full">
        <h2 className="text-3xl font-bold text-slate-900 mb-2 text-center">Select Your Booking Package</h2>
        <p className="text-slate-600 text-center mb-10">Choose the perfect photo shoot package for your session.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {packages.map((pkg) => (
            <PackageCard
              key={pkg.id}
              title={pkg.title}
              price={pkg.price}
              duration={pkg.duration}
              features={pkg.features}
              onSelect={() => setSelectedPackage(pkg)}
            />
          ))}
        </div>

        {selectedPackage && (
          <div className="bg-white p-6 rounded-xl shadow-md border border-amber-300 max-w-md mx-auto text-center">
            <h3 className="text-lg font-bold text-slate-800">Selected: {selectedPackage.title}</h3>
            <p className="text-sm text-slate-600 mb-4">Total Price: ₱{selectedPackage.price}</p>
            <button className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold py-2.5 rounded-lg transition-colors">
              Proceed to Schedule & Payment
            </button>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default BookingPage;