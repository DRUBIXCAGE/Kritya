"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Lead } from "@/types";
import { INITIAL_LEADS } from "@/lib/mock-data";
import { SimpleReservationView } from "@/components/leads/SimpleReservationView";

function ReservationContent() {
  const searchParams = useSearchParams();
  const idParam = searchParams.get("id");
  const tabParam = searchParams.get("tab") as "traveller" | "contact" | "flight" | "payment" | null;

  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchLead = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/leads");
      const data = await res.json();
      if (data.success && Array.isArray(data.leads) && data.leads.length > 0) {
        if (idParam) {
          const found = data.leads.find(
            (l: Lead) =>
              l.id === idParam ||
              l.bookingId?.toLowerCase() === idParam.toLowerCase() ||
              l.bookingDetails?.pnrCode?.toLowerCase() === idParam.toLowerCase() ||
              String(l.bookingNumber) === idParam
          );
          if (found) {
            setLead(found);
            return;
          }
        }
        setLead(data.leads[0]);
      } else {
        // Fallback to initial mock leads
        const fallback =
          INITIAL_LEADS.find(
            (l) =>
              l.id === idParam ||
              l.bookingId?.toLowerCase() === idParam?.toLowerCase() ||
              l.bookingDetails?.pnrCode?.toLowerCase() === idParam?.toLowerCase() ||
              String(l.bookingNumber) === idParam
          ) || INITIAL_LEADS[0];
        setLead(fallback);
      }
    } catch {
      const fallback =
        INITIAL_LEADS.find(
          (l) =>
            l.id === idParam ||
            l.bookingId?.toLowerCase() === idParam?.toLowerCase() ||
            l.bookingDetails?.pnrCode?.toLowerCase() === idParam?.toLowerCase() ||
            String(l.bookingNumber) === idParam
        ) || INITIAL_LEADS[0];
      setLead(fallback);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLead();
  }, [idParam]);

  const handleSaveLead = async (updatedLead: Lead) => {
    setLead(updatedLead);
    try {
      await fetch(`/api/leads/${updatedLead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedLead),
      });
    } catch (e) {
      console.error("Save error:", e);
    }
  };

  if (loading && !lead) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50 text-slate-500 font-medium">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3" />
        Loading Reservation Details...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <SimpleReservationView
        lead={lead}
        onRefresh={fetchLead}
        onSaveLead={handleSaveLead}
        initialTab={tabParam || "traveller"}
      />
    </div>
  );
}

export default function ReservationPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen w-screen flex items-center justify-center bg-slate-50 text-slate-500 font-medium">
          Loading Reservation...
        </div>
      }
    >
      <ReservationContent />
    </Suspense>
  );
}
