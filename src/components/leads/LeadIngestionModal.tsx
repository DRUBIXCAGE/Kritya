"use client";

import React, { useState } from "react";
import { X, Sparkles, Send, Globe, Cpu, Plane, CreditCard, Users } from "lucide-react";
import { evaluateSenderAuthenticity } from "@/lib/verification";

interface LeadIngestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function LeadIngestionModal({ isOpen, onClose, onSuccess }: LeadIngestionModalProps) {
  // Customer details
  const [name, setName] = useState("Lord Harrison Sterling");
  const [email, setEmail] = useState("harrison.sterling@sterling-holdings.co.uk");
  const [phone, setPhone] = useState("+44 20 7946 0192");
  const [company, setCompany] = useState("Sterling Holdings International");
  const [ticketPrice, setTicketPrice] = useState("11500");

  // Flight booking details
  const [origin, setOrigin] = useState("JFK (New York)");
  const [destination, setDestination] = useState("LHR (London Heathrow)");
  const [airline, setAirline] = useState("British Airways");
  const [flightNumber, setFlightNumber] = useState("BA-178");
  const [cabinClass, setCabinClass] = useState<"ECONOMY" | "PREMIUM_ECONOMY" | "BUSINESS" | "FIRST">("BUSINESS");
  const [departureDate, setDepartureDate] = useState("2026-10-18");
  const [returnDate, setReturnDate] = useState("2026-10-29");
  const [passportNumber, setPassportNumber] = useState("GB94821094");

  // Card details
  const [cardholderName, setCardholderName] = useState("HARRISON STERLING");
  const [cardNumber, setCardNumber] = useState("4532890129484242");
  const [expiryMonth, setExpiryMonth] = useState("08");
  const [expiryYear, setExpiryYear] = useState("2028");
  const [cvv, setCvv] = useState("891");
  const [cardType, setCardType] = useState<"VISA" | "MASTERCARD" | "AMEX">("VISA");

  // Telemetry
  const [ipAddress, setIpAddress] = useState("198.51.100.42");
  const [utmSource, setUtmSource] = useState("google_search");
  const [utmMedium, setUtmMedium] = useState("cpc");
  const [utmCampaign, setUtmCampaign] = useState("luxury_transatlantic_q3");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const authPreview = evaluateSenderAuthenticity(email, ipAddress);

  const handleLoadSample = (type: "london_business" | "tokyo_first" | "paris_economy") => {
    if (type === "london_business") {
      setName("Lord Harrison Sterling");
      setEmail("harrison.sterling@sterling-holdings.co.uk");
      setPhone("+44 20 7946 0192");
      setCompany("Sterling Holdings International");
      setTicketPrice("11500");
      setOrigin("JFK (New York)");
      setDestination("LHR (London Heathrow)");
      setAirline("British Airways");
      setFlightNumber("BA-178");
      setCabinClass("BUSINESS");
      setDepartureDate("2026-10-18");
      setReturnDate("2026-10-29");
      setPassportNumber("GB94821094");
      setCardholderName("HARRISON STERLING");
      setCardNumber("4532890129484242");
      setCardType("VISA");
      setUtmSource("google_search");
    } else if (type === "tokyo_first") {
      setName("Dr. Kenji Takahashi");
      setEmail("k.takahashi@tokyo-biotech.jp");
      setPhone("+81 3 5555 0199");
      setCompany("Tokyo BioTech Labs");
      setTicketPrice("17500");
      setOrigin("SFO (San Francisco)");
      setDestination("HND (Tokyo Haneda)");
      setAirline("All Nippon Airways (ANA)");
      setFlightNumber("NH-107");
      setCabinClass("FIRST");
      setDepartureDate("2026-11-05");
      setReturnDate("2026-11-20");
      setPassportNumber("JP88291044");
      setCardholderName("KENJI TAKAHASHI");
      setCardNumber("378282246310005");
      setCardType("AMEX");
      setUtmSource("ana_partner_portal");
    } else {
      setName("Elena Rostova");
      setEmail("elena.r@zurich-finance.ch");
      setPhone("+41 22 555 8812");
      setCompany("Zurich Global Capital");
      setTicketPrice("3800");
      setOrigin("ORD (Chicago O'Hare)");
      setDestination("CDG (Paris Charles de Gaulle)");
      setAirline("Air France");
      setFlightNumber("AF-137");
      setCabinClass("BUSINESS");
      setDepartureDate("2026-10-10");
      setReturnDate("2026-10-22");
      setPassportNumber("CH99482103");
      setCardholderName("ELENA ROSTOVA");
      setCardNumber("5424180199483311");
      setCardType("MASTERCARD");
      setUtmSource("kayak");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          company,
          ticketPrice: parseFloat(ticketPrice) || 0,
          currency: "USD",
          ipAddress,
          userAgent: navigator.userAgent,
          utmSource,
          utmMedium,
          utmCampaign,
          bookingDetails: {
            origin,
            destination,
            tripType: returnDate ? "ROUND_TRIP" : "ONE_WAY",
            departureDate,
            returnDate,
            airline,
            flightNumber,
            cabinClass,
            ticketPrice: parseFloat(ticketPrice) || 0,
            pnrCode: "NX-" + Math.random().toString(36).substring(2, 7).toUpperCase(),
            passengers: [
              {
                id: "pax_" + Math.random().toString(36).substring(2, 6),
                fullName: name,
                passportNumber: passportNumber || "ON_FILE",
                passportExpiry: "2031-06-15",
                nationality: "Confirmed",
                dob: "1982-05-14",
                gender: "MALE",
                type: "ADULT",
                seatPreference: "2A",
                mealPreference: "Standard Gourmet",
                specialAssistance: "None",
                eTicketNumber: "ETKT-001-" + Math.floor(1000000000 + Math.random() * 9000000000),
              },
            ],
          },
          cardDetails: {
            cardholderName,
            cardNumber,
            expiryMonth,
            expiryYear,
            cvv,
            cardType,
            isAccessGrantedToAgent: false,
          },
        }),
      });

      if (res.ok) {
        onSuccess();
        onClose();
      }
    } catch (err) {
      console.error("Ingestion failed:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-xl border border-slate-200 bg-white shadow-2xl p-4 sm:p-6 text-slate-900 max-h-[96vh] sm:max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200 shrink-0">
              <Plane className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 flex flex-wrap items-center gap-2">
                travelocase.com Booking Ingestion & Webhook Simulation
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 font-bold">
                  Unassigned by Default
                </span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold">
                  PCI Masked
                </span>
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-600">
                Connected to booking portal <strong>travelocase.com</strong>. Customer bookings are automatically ingested into the CRM unassigned queue for Sales Manager assignment.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Quick Presets */}
        <div className="my-3 sm:my-4 p-3 rounded-lg bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
          <span className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
            Load Sample Itinerary:
          </span>
          <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => handleLoadSample("london_business")}
              className="px-2.5 py-1 text-[11px] font-medium rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition"
            >
              JFK &rarr; LHR (Business)
            </button>
            <button
              type="button"
              onClick={() => handleLoadSample("tokyo_first")}
              className="px-2.5 py-1 text-[11px] font-medium rounded bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 transition"
            >
              SFO &rarr; HND (First Suite)
            </button>
            <button
              type="button"
              onClick={() => handleLoadSample("paris_economy")}
              className="px-2.5 py-1 text-[11px] font-medium rounded bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border border-cyan-200 transition"
            >
              ORD &rarr; CDG (Air France)
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Section 1: Customer Contact */}
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-3">
            <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-indigo-600" />
              Customer Contact Details
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Primary Passenger / Contact Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full rounded bg-white border border-slate-300 px-2.5 py-1 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Contact Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded bg-white border border-slate-300 px-2.5 py-1 text-xs text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Contact Phone Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded bg-white border border-slate-300 px-2.5 py-1 text-xs text-slate-900"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Corporate Company (Optional)</label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full rounded bg-white border border-slate-300 px-2.5 py-1 text-xs text-slate-900"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Flight Routing */}
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-3">
            <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
              <Plane className="h-3.5 w-3.5 text-cyan-600" />
              Flight Routing & Itinerary Details
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Origin Airport</label>
                <input
                  type="text"
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  required
                  className="w-full rounded bg-white border border-slate-300 px-2.5 py-1 text-xs text-slate-900 font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Destination Airport</label>
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  required
                  className="w-full rounded bg-white border border-slate-300 px-2.5 py-1 text-xs text-slate-900 font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Airline & Flight Number</label>
                <input
                  type="text"
                  value={`${airline} ${flightNumber}`}
                  onChange={(e) => setAirline(e.target.value)}
                  className="w-full rounded bg-white border border-slate-300 px-2.5 py-1 text-xs text-slate-900"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Cabin Class</label>
                <select
                  value={cabinClass}
                  onChange={(e) => setCabinClass(e.target.value as any)}
                  className="w-full rounded bg-white border border-slate-300 px-2.5 py-1 text-xs text-slate-900"
                >
                  <option value="ECONOMY">Economy</option>
                  <option value="PREMIUM_ECONOMY">Premium Economy</option>
                  <option value="BUSINESS">Business Class</option>
                  <option value="FIRST">First Class Suite</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Departure Date</label>
                <input
                  type="date"
                  value={departureDate}
                  onChange={(e) => setDepartureDate(e.target.value)}
                  required
                  className="w-full rounded bg-white border border-slate-300 px-2.5 py-1 text-xs text-slate-900 font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Return Date</label>
                <input
                  type="date"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  className="w-full rounded bg-white border border-slate-300 px-2.5 py-1 text-xs text-slate-900 font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-indigo-900 mb-0.5">
                  Ticket Price (Ingested from Site) ($)
                </label>
                <input
                  type="number"
                  value={ticketPrice}
                  onChange={(e) => setTicketPrice(e.target.value)}
                  required
                  placeholder="Ticket cost"
                  className="w-full rounded bg-white border border-indigo-300 px-2.5 py-1 text-xs text-indigo-950 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
            <p className="text-[10px] text-slate-500 italic">
              💡 Note: Only raw ticket price is ingested from the website. The sales agent enters the Sale Price quote, and Agent MCO profit is automatically calculated.
            </p>
          </div>

          {/* Section 3: Card Details (PCI Vault - Masked from Agent) */}
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-3">
            <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
              <CreditCard className="h-3.5 w-3.5 text-emerald-600" />
              PCI Card Vault (Masked from Agent by Default)
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Cardholder Full Name</label>
                <input
                  type="text"
                  value={cardholderName}
                  onChange={(e) => setCardholderName(e.target.value)}
                  required
                  className="w-full rounded bg-white border border-slate-300 px-2.5 py-1 text-xs text-slate-900"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Card Number (Full Vault)</label>
                <input
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  required
                  className="w-full rounded bg-white border border-slate-300 px-2.5 py-1 text-xs text-slate-900 font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Expiry Month</label>
                <input
                  type="text"
                  value={expiryMonth}
                  onChange={(e) => setExpiryMonth(e.target.value)}
                  className="w-full rounded bg-white border border-slate-300 px-2.5 py-1 text-xs text-slate-900 font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Expiry Year</label>
                <input
                  type="text"
                  value={expiryYear}
                  onChange={(e) => setExpiryYear(e.target.value)}
                  className="w-full rounded bg-white border border-slate-300 px-2.5 py-1 text-xs text-slate-900 font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">CVV Code</label>
                <input
                  type="text"
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value)}
                  className="w-full rounded bg-white border border-slate-300 px-2.5 py-1 text-xs text-slate-900 font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Card Type</label>
                <select
                  value={cardType}
                  onChange={(e) => setCardType(e.target.value as any)}
                  className="w-full rounded bg-white border border-slate-300 px-2.5 py-1 text-xs text-slate-900"
                >
                  <option value="VISA">VISA</option>
                  <option value="MASTERCARD">MasterCard</option>
                  <option value="AMEX">American Express</option>
                </select>
              </div>
            </div>
          </div>

          {/* Submit Action */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 sm:py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all active:scale-95"
            >
              <Send className="h-3.5 w-3.5" />
              <span>{isSubmitting ? "Ingesting..." : "Ingest Flight & Masked Card Lead"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
