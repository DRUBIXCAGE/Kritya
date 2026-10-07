"use client";

import React, { useState } from "react";
import {
  X,
  Sparkles,
  PhoneCall,
  Globe,
  Upload,
  Code2,
  Send,
  Plane,
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  FileSpreadsheet,
  Copy,
  Check,
  Zap,
  Target,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { User } from "@/types";

interface PpcLeadIngestionModalProps {
  isOpen: boolean;
  currentUser: User;
  users?: User[];
  onClose: () => void;
  onSuccess: () => void;
}

type PpcTab = "call_inbound" | "web_form" | "batch_csv" | "webhook_sim";

const SAMPLE_CSV = `name,phone,email,origin,destination,departureDate,cabinClass,ticketPrice,salePrice,campaign,keyword
Marcus Vance,+1 212 555 0192,marcus.vance@techcorp.io,JFK,LHR,2026-10-22,BUSINESS,4200,4950,Google_Search_Luxury_UK,business class london
Lady Claire Davenport,+1 415 555 0812,claire@davenport-estates.com,SFO,CDG,2026-11-05,FIRST,8500,9800,Google_First_Europe,first class paris tickets
David Sterling,+1 312 555 9944,dsterling@apexlogistics.com,ORD,NRT,2026-10-30,BUSINESS,5100,5900,Bing_Asia_Corporate,flights to tokyo business
Sophia Al-Mansoor,+1 305 555 4421,sophia.al@mansoor-travel.ae,MIA,DXB,2026-11-12,BUSINESS,6200,7250,Meta_MiddleEast_Luxury,direct flight to dubai luxury
Alexander Wright,+1 206 555 7712,alex.wright@frontier-cap.com,SEA,LHR,2026-10-25,BUSINESS,3900,4600,Google_Search_Luxury_UK,last minute business flight`;

export function PpcLeadIngestionModal({
  isOpen,
  currentUser,
  users = [],
  onClose,
  onSuccess,
}: PpcLeadIngestionModalProps) {
  const [activeTab, setActiveTab] = useState<PpcTab>("call_inbound");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  // Available sales agents for assignment
  const salesAgents = users.filter(
    (u) =>
      (u.role === "SALES_AGENT" || u.role.endsWith("_AGENT") || u.role.endsWith("_OPERATOR")) &&
      u.isActive
  );

  // ----------------------------------------------------
  // Tab 1: Inbound Call PPC Lead State
  // ----------------------------------------------------
  const [callPhone, setCallPhone] = useState("+1 (555) 382-9910");
  const [callName, setCallName] = useState("Julian Thorne");
  const [callOrigin, setCallOrigin] = useState("JFK (New York)");
  const [callDestination, setCallDestination] = useState("LHR (London Heathrow)");
  const [callDeptDate, setCallDeptDate] = useState("2026-10-24");
  const [callReturnDate, setCallReturnDate] = useState("2026-11-04");
  const [callTicketCost, setCallTicketCost] = useState("4500");
  const [callSaleQuote, setCallSaleQuote] = useState("5300");
  const [callPpcSource, setCallPpcSource] = useState("google_ads");
  const [callCampaign, setCallCampaign] = useState("US_Search_BusinessClass_Europe_2026");
  const [callKeyword, setCallKeyword] = useState("cheap business class to london");
  const [callAdGroup, setCallAdGroup] = useState("JFK-LHR-ClickToCall");
  const [callIntent, setCallIntent] = useState("URGENT");
  const [callAssignee, setCallAssignee] = useState<string>(
    currentUser.role === "SALES_AGENT" ? currentUser.id : "UNASSIGNED"
  );
  const [callRemark, setCallRemark] = useState(
    "Inbound call from Google Ads call extension. Customer traveling for executive board meeting. Quoted $5,300 for BA-178 business suite. Customer ready to book."
  );

  // ----------------------------------------------------
  // Tab 2: PPC Web Landing Page State
  // ----------------------------------------------------
  const [webName, setWebName] = useState("Victoria Sterling");
  const [webEmail, setWebEmail] = useState("victoria.sterling@sterling-holdings.co.uk");
  const [webPhone, setWebPhone] = useState("+44 20 7946 0992");
  const [webCompany, setWebCompany] = useState("Sterling Holdings Ltd");
  const [webOrigin, setWebOrigin] = useState("SFO (San Francisco)");
  const [webDestination, setWebDestination] = useState("HND (Tokyo Haneda)");
  const [webDeptDate, setWebDeptDate] = useState("2026-11-08");
  const [webReturnDate, setWebReturnDate] = useState("2026-11-20");
  const [webCabinClass, setWebCabinClass] = useState("FIRST");
  const [webAirline, setWebAirline] = useState("All Nippon Airways (ANA)");
  const [webTicketCost, setWebTicketCost] = useState("14200");
  const [webSaleQuote, setWebSaleQuote] = useState("16500");
  const [webPpcSource, setWebPpcSource] = useState("google_ads");
  const [webCampaign, setWebCampaign] = useState("Tokyo_First_Luxury_Suites_Q4");
  const [webKeyword, setWebKeyword] = useState("ana first class the room deals");
  const [webGclid, setWebGclid] = useState("CjwKCAiA-ppc_lead_sim_99182");
  const [webAssignee, setWebAssignee] = useState("UNASSIGNED");

  // PCI Card Vault state (strict masking)
  const [includePciCard, setIncludePciCard] = useState(false);
  const [cardholderName, setCardholderName] = useState("VICTORIA STERLING");
  const [cardNumber, setCardNumber] = useState("4532890129484242");
  const [expiryMonth, setExpiryMonth] = useState("11");
  const [expiryYear, setExpiryYear] = useState("2028");
  const [cvv, setCvv] = useState("782");
  const [cardType, setCardType] = useState<"VISA" | "MASTERCARD" | "AMEX">("VISA");

  // ----------------------------------------------------
  // Tab 3: Batch CSV Import State
  // ----------------------------------------------------
  const [csvContent, setCsvContent] = useState(SAMPLE_CSV);
  const [batchAssignee, setBatchAssignee] = useState<string>("ROUND_ROBIN");
  const [parsedLeadsCount, setParsedLeadsCount] = useState<number>(5);

  // ----------------------------------------------------
  // Tab 4: Webhook Simulation State
  // ----------------------------------------------------
  const [webhookTemplate, setWebhookTemplate] = useState<"google_ads" | "meta_leads" | "zapier">("google_ads");
  const [webhookJson, setWebhookJson] = useState(() =>
    JSON.stringify(
      {
        event: "GOOGLE_ADS_LEAD_FORM_SUBMITTED",
        gclid: "CjwKCAiA-google-ads-token-88419",
        campaign_name: "Google_Search_Luxury_UK_2026",
        keyword: "best business class flights to london",
        lead_data: {
          full_name: "Sir Arthur Pendelton",
          phone_number: "+1 555 771 9901",
          email: "arthur.pendelton@oxford-holdings.co.uk",
          origin: "JFK",
          destination: "LHR",
          departure_date: "2026-10-28",
          cabin_class: "BUSINESS",
          quoted_net_fare: 4600,
        },
      },
      null,
      2
    )
  );

  if (!isOpen) return null;

  // Real-time MCO calculation for Tab 1
  const callTicketNum = parseFloat(callTicketCost) || 0;
  const callSaleNum = parseFloat(callSaleQuote) || 0;
  const callMcoNum = Math.max(0, callSaleNum - callTicketNum);

  // Quick Preset Loader
  const handleLoadPreset = (type: "google_call" | "meta_luxury" | "bing_same_day") => {
    if (type === "google_call") {
      setActiveTab("call_inbound");
      setCallName("Harrison Vance");
      setCallPhone("+1 (555) 749-1100");
      setCallOrigin("JFK (New York)");
      setCallDestination("LHR (London Heathrow)");
      setCallDeptDate("2026-10-21");
      setCallReturnDate("2026-10-31");
      setCallTicketCost("4200");
      setCallSaleQuote("4950");
      setCallPpcSource("google_ads");
      setCallCampaign("US_Search_BusinessClass_Europe_2026");
      setCallKeyword("last minute business class to london");
      setCallIntent("URGENT");
      setCallRemark("Customer dialed from Google Ads Call Extension. Immediate departure to London. Quoted BA-178 Club World.");
    } else if (type === "meta_luxury") {
      setActiveTab("web_form");
      setWebName("Dr. Kenji Takahashi");
      setWebEmail("kenji.takahashi@tokyo-biotech.jp");
      setWebPhone("+81 3 5555 0199");
      setWebCompany("Tokyo BioTech Labs");
      setWebOrigin("SFO (San Francisco)");
      setWebDestination("HND (Tokyo Haneda)");
      setWebDeptDate("2026-11-05");
      setWebReturnDate("2026-11-20");
      setWebCabinClass("FIRST");
      setWebAirline("All Nippon Airways (ANA)");
      setWebTicketCost("15500");
      setWebSaleQuote("18200");
      setWebPpcSource("meta_ads");
      setWebCampaign("Meta_Luxury_First_Suite_Campaign");
      setWebKeyword("luxury travel tokyo first suite");
    } else {
      setActiveTab("call_inbound");
      setCallName("Elena Rostova");
      setCallPhone("+1 (312) 555-8812");
      setCallOrigin("ORD (Chicago O'Hare)");
      setCallDestination("CDG (Paris Charles de Gaulle)");
      setCallDeptDate("2026-10-18");
      setCallReturnDate("2026-10-28");
      setCallTicketCost("3800");
      setCallSaleQuote("4500");
      setCallPpcSource("bing_ads");
      setCallCampaign("Bing_Corporate_Travel_Europe");
      setCallKeyword("corporate flight deals to paris");
      setCallIntent("HIGH");
      setCallRemark("Client called from Bing Search Ad. Needs lie-flat business class on Air France. Quoted $4,500.");
    }
  };

  // Submit Tab 1: Inbound Call Lead
  const handleSubmitCallLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/leads/ppc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: callName,
          phone: callPhone,
          email: `${callPhone.replace(/[^0-9]/g, "")}@ppc-call.travelocase.com`,
          origin: callOrigin,
          destination: callDestination,
          departureDate: callDeptDate,
          returnDate: callReturnDate || undefined,
          ticketPrice: callTicketNum,
          salePrice: callSaleNum > 0 ? callSaleNum : undefined,
          ppcSource: callPpcSource,
          campaignName: callCampaign,
          adGroup: callAdGroup,
          keyword: callKeyword,
          channel: "CALL_INBOUND",
          intentLevel: callIntent,
          assignedToId: callAssignee === "UNASSIGNED" ? undefined : callAssignee,
          initialRemark: callRemark,
          actorId: currentUser.id,
        }),
      });

      const data = await res.json();
      if (data.success) {
        onSuccess();
        onClose();
      } else {
        alert("Failed to create PPC call lead: " + data.error);
      }
    } catch (err) {
      console.error("PPC call lead error:", err);
      alert("Failed to submit PPC call lead.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Tab 2: Web Form Lead
  const handleSubmitWebLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        name: webName,
        email: webEmail,
        phone: webPhone,
        company: webCompany,
        origin: webOrigin,
        destination: webDestination,
        departureDate: webDeptDate,
        returnDate: webReturnDate || undefined,
        cabinClass: webCabinClass,
        airline: webAirline,
        ticketPrice: parseFloat(webTicketCost) || 0,
        salePrice: parseFloat(webSaleQuote) || undefined,
        ppcSource: webPpcSource,
        campaignName: webCampaign,
        keyword: webKeyword,
        gclid: webGclid,
        channel: "LANDING_PAGE_FORM",
        assignedToId: webAssignee === "UNASSIGNED" ? undefined : webAssignee,
        actorId: currentUser.id,
      };

      if (includePciCard) {
        payload.cardDetails = {
          cardholderName,
          cardNumber,
          expiryMonth,
          expiryYear,
          cvv,
          cardType,
          isAccessGrantedToAgent: false, // Strict PCI security: masked from agent by default
        };
      }

      const res = await fetch("/api/leads/ppc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        onSuccess();
        onClose();
      } else {
        alert("Failed to create PPC web lead: " + data.error);
      }
    } catch (err) {
      console.error("PPC web lead error:", err);
      alert("Failed to submit PPC web lead.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Tab 3: Batch CSV Import
  const handleBatchImport = async () => {
    setIsSubmitting(true);
    try {
      const lines = csvContent.trim().split("\n");
      if (lines.length < 2) {
        alert("Please provide at least one data row in the CSV.");
        setIsSubmitting(false);
        return;
      }

      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
      const items: any[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const values = line.split(",").map((v) => v.trim());
        const row: Record<string, string> = {};
        headers.forEach((h, idx) => {
          row[h] = values[idx] || "";
        });

        items.push({
          name: row["name"] || `PPC Lead ${i}`,
          phone: row["phone"] || "+1 555 019 0000",
          email: row["email"] || `lead_${i}@ppc-import.travelocase.com`,
          origin: row["origin"] || "JFK",
          destination: row["destination"] || "LHR",
          departureDate: row["departuredate"] || "2026-11-01",
          cabinClass: row["cabinclass"] || "BUSINESS",
          ticketPrice: parseFloat(row["ticketprice"]) || 3500,
          salePrice: parseFloat(row["saleprice"]) || 4200,
          campaignName: row["campaign"] || "PPC_Batch_Import",
          keyword: row["keyword"] || "cheap flight deals",
          ppcSource: "google_ads",
          channel: "SEARCH_AD",
          assignedToId: batchAssignee === "UNASSIGNED" ? undefined : batchAssignee === "ROUND_ROBIN" ? undefined : batchAssignee,
          initialRemark: `[CSV BATCH IMPORT] Ingested from bulk campaign file. Campaign: "${row["campaign"] || "PPC_Batch"}"`,
        });
      }

      const res = await fetch("/api/leads/ppc-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          actorId: currentUser.id,
        }),
      });

      const data = await res.json();
      if (data.success) {
        // If round-robin requested, distribute the imported leads
        if (batchAssignee === "ROUND_ROBIN" && data.leads && data.leads.length > 0) {
          const leadIds = data.leads.map((l: any) => l.id);
          await fetch("/api/leads/round-robin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ actorId: currentUser.id, leadIds }),
          });
        }

        alert(`✓ Successfully ingested ${data.count} PPC leads into the pipeline!`);
        onSuccess();
        onClose();
      } else {
        alert("Batch import failed: " + data.error);
      }
    } catch (err) {
      console.error("Batch import error:", err);
      alert("Failed to process batch CSV import.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Tab 4: Webhook Simulation
  const handleSimulateWebhook = async () => {
    setIsSubmitting(true);
    try {
      let parsed: any;
      try {
        parsed = JSON.parse(webhookJson);
      } catch {
        alert("Invalid JSON format in webhook editor.");
        setIsSubmitting(false);
        return;
      }

      const leadData = parsed.lead_data || parsed;
      const res = await fetch("/api/leads/ppc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: leadData.full_name || leadData.name || "Webhook PPC Lead",
          email: leadData.email || "webhook@travelocase.com",
          phone: leadData.phone_number || leadData.phone || "+1 (555) 880-9912",
          origin: leadData.origin || "JFK",
          destination: leadData.destination || "LHR",
          departureDate: leadData.departure_date || "2026-10-30",
          cabinClass: leadData.cabin_class || "BUSINESS",
          ticketPrice: parseFloat(leadData.quoted_net_fare || leadData.ticketPrice) || 4500,
          ppcSource: parsed.event?.includes("GOOGLE") ? "google_ads" : parsed.event?.includes("META") ? "meta_ads" : "zapier_webhook",
          campaignName: parsed.campaign_name || "Automated_Webhook_Stream",
          keyword: parsed.keyword || "business flights",
          gclid: parsed.gclid || "CjwKCAiA-webhook-live",
          channel: "LANDING_PAGE_FORM",
          initialRemark: `[LIVE WEBHOOK SIMULATION] Dispatched via ${parsed.event || "API Webhook"}. GCLID: ${parsed.gclid || "N/A"}`,
          actorId: currentUser.id,
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert(`✓ Live webhook event ingested! Booking #${data.lead?.bookingNumber} added.`);
        onSuccess();
        onClose();
      } else {
        alert("Webhook simulation failed: " + data.error);
      }
    } catch (err) {
      console.error("Webhook sim error:", err);
      alert("Failed to dispatch webhook event.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyWebhookUrl = () => {
    if (typeof window !== "undefined") {
      const url = `${window.location.origin}/api/leads/ppc`;
      navigator.clipboard.writeText(url);
      setCopiedWebhook(true);
      setTimeout(() => setCopiedWebhook(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-2xl border border-slate-200 bg-white shadow-2xl p-4 sm:p-6 text-slate-900 max-h-[96vh] sm:max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 sm:pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-500/25 shrink-0">
              <Target className="h-6 w-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  PPC Advertising & Inbound Lead Center
                </h2>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold">
                  Google &bull; Meta &bull; Bing Ads
                </span>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" /> PCI Masked
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Capture inbound telephone calls, digital ad clicks, batch CSV imports, or connect live PPC webhooks.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Quick Presets Bar */}
        <div className="my-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-slate-700 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
            Quick PPC Presets:
          </span>
          <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => handleLoadPreset("google_call")}
              className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition"
            >
              📞 Google Call: JFK &rarr; LHR ($4,950)
            </button>
            <button
              type="button"
              onClick={() => handleLoadPreset("meta_luxury")}
              className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 transition"
            >
              🌐 Meta Luxury: SFO &rarr; HND First ($18,200)
            </button>
            <button
              type="button"
              onClick={() => handleLoadPreset("bing_same_day")}
              className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border border-cyan-200 transition"
            >
              📞 Bing Corp: ORD &rarr; CDG Business ($4,500)
            </button>
          </div>
        </div>

        {/* Input Method Navigation Tabs */}
        <div className="flex items-center gap-1 border-b border-slate-200 overflow-x-auto no-scrollbar touch-scroll mb-4 text-xs font-semibold">
          <button
            onClick={() => setActiveTab("call_inbound")}
            className={`flex items-center gap-2 py-2 px-3.5 border-b-2 transition whitespace-nowrap ${
              activeTab === "call_inbound"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <PhoneCall className="h-3.5 w-3.5" />
            <span>Method 1: Inbound Call Lead (Click-to-Call)</span>
          </button>

          <button
            onClick={() => setActiveTab("web_form")}
            className={`flex items-center gap-2 py-2 px-3.5 border-b-2 transition whitespace-nowrap ${
              activeTab === "web_form"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <Globe className="h-3.5 w-3.5" />
            <span>Method 2: Landing Page Ad Form</span>
          </button>

          <button
            onClick={() => setActiveTab("batch_csv")}
            className={`flex items-center gap-2 py-2 px-3.5 border-b-2 transition whitespace-nowrap ${
              activeTab === "batch_csv"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Method 3: Batch CSV / Bulk Import</span>
          </button>

          <button
            onClick={() => setActiveTab("webhook_sim")}
            className={`flex items-center gap-2 py-2 px-3.5 border-b-2 transition whitespace-nowrap ${
              activeTab === "webhook_sim"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <Code2 className="h-3.5 w-3.5" />
            <span>Method 4: Live Webhook & API</span>
          </button>
        </div>

        {/* -------------------------------------------------------------------------------- */}
        {/* TAB 1: INBOUND PHONE CALL PPC LEAD ENTRY                                         */}
        {/* -------------------------------------------------------------------------------- */}
        {activeTab === "call_inbound" && (
          <form onSubmit={handleSubmitCallLead} className="space-y-4 text-xs">
            <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 text-amber-900">
                <PhoneCall className="h-4 w-4 text-amber-600 shrink-0" />
                <span className="font-semibold text-xs">
                  Agent Rapid Phone Desk: Taking an incoming call from a PPC click-to-call ad.
                </span>
              </div>
              <div className="text-[11px] font-mono text-amber-950 font-bold bg-amber-100/90 border border-amber-300 px-2.5 py-0.5 rounded-md">
                ⚡ Auto-Calculates Agent MCO Profit
              </div>
            </div>

            {/* Caller & Route Information */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Caller Phone Number *
                </label>
                <input
                  type="text"
                  required
                  value={callPhone}
                  onChange={(e) => setCallPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-mono font-bold focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Caller / Passenger Name *
                </label>
                <input
                  type="text"
                  required
                  value={callName}
                  onChange={(e) => setCallName(e.target.value)}
                  placeholder="Full passenger name"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Origin Airport *
                </label>
                <input
                  type="text"
                  required
                  value={callOrigin}
                  onChange={(e) => setCallOrigin(e.target.value)}
                  placeholder="e.g. JFK or New York"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Destination Airport *
                </label>
                <input
                  type="text"
                  required
                  value={callDestination}
                  onChange={(e) => setCallDestination(e.target.value)}
                  placeholder="e.g. LHR or London"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Departure Date *
                </label>
                <input
                  type="date"
                  required
                  value={callDeptDate}
                  onChange={(e) => setCallDeptDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Return Date (Optional)
                </label>
                <input
                  type="date"
                  value={callReturnDate}
                  onChange={(e) => setCallReturnDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Pricing & MCO Calculator */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Net Ticket Cost ($) *
                </label>
                <input
                  type="number"
                  required
                  value={callTicketCost}
                  onChange={(e) => setCallTicketCost(e.target.value)}
                  placeholder="4200"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-mono font-bold focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-indigo-900 mb-1">
                  Quoted Sale Price ($) *
                </label>
                <input
                  type="number"
                  required
                  value={callSaleQuote}
                  onChange={(e) => setCallSaleQuote(e.target.value)}
                  placeholder="4950"
                  className="w-full bg-indigo-50/70 border border-indigo-300 rounded-lg px-2.5 py-1.5 text-xs text-indigo-950 font-mono font-bold focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Live Profit & MCO Banner */}
            <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
                <span className="text-xs font-semibold text-emerald-950">
                  Agent Profit Projection (MCO):
                </span>
                <span className="font-mono font-bold text-sm text-emerald-700">
                  +${callMcoNum.toLocaleString()}
                </span>
                <span className="text-[11px] text-slate-500">
                  (Sale ${callSaleNum.toLocaleString()} - Net Cost ${callTicketNum.toLocaleString()})
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold">
                MCO Commission Tracked
              </span>
            </div>

            {/* PPC Tracking & Attribution */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <span className="font-semibold text-slate-800 text-xs flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5 text-indigo-600" />
                PPC Campaign Attribution & Keywords
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-0.5">PPC Network</label>
                  <select
                    value={callPpcSource}
                    onChange={(e) => setCallPpcSource(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-slate-800"
                  >
                    <option value="google_ads">Google Ads (Search)</option>
                    <option value="bing_ads">Microsoft / Bing Ads</option>
                    <option value="meta_ads">Meta / Facebook Ads</option>
                    <option value="display">Display Retargeting</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Campaign Name</label>
                  <input
                    type="text"
                    value={callCampaign}
                    onChange={(e) => setCallCampaign(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Keyword / Query</label>
                  <input
                    type="text"
                    value={callKeyword}
                    onChange={(e) => setCallKeyword(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Caller Intent</label>
                  <select
                    value={callIntent}
                    onChange={(e) => setCallIntent(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-slate-800"
                  >
                    <option value="URGENT">🔥 Urgent (Departs &lt; 48h)</option>
                    <option value="HIGH">High (Firm Budget)</option>
                    <option value="STANDARD">Standard Inquiry</option>
                    <option value="FLEXIBLE">Flexible Dates</option>
                  </select>
                </div>
              </div>

              {/* Assignment Selector */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Assign Lead To:
                </label>
                <select
                  value={callAssignee}
                  onChange={(e) => setCallAssignee(e.target.value)}
                  className="w-full sm:w-80 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium"
                >
                  <option value={currentUser.id}>👤 Assign to Me ({currentUser.name})</option>
                  <option value="UNASSIGNED">📥 Unassigned Pool (Sales Manager Queue)</option>
                  {salesAgents
                    .filter((a) => a.id !== currentUser.id)
                    .map((agent) => (
                      <option key={agent.id} value={agent.id}>
                        👤 {agent.name} (@{agent.username || agent.name})
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* Inbound Call Remark */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Initial Call Remark / Conversation Notes:
              </label>
              <textarea
                rows={2}
                required
                value={callRemark}
                onChange={(e) => setCallRemark(e.target.value)}
                placeholder="Log notes from the customer phone call..."
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Submit */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
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
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-indigo-600/25 transition active:scale-95 cursor-pointer"
              >
                <PhoneCall className="h-4 w-4" />
                <span>{isSubmitting ? "Logging Inbound Call..." : "Create & Tag Inbound PPC Call Lead"}</span>
              </button>
            </div>
          </form>
        )}

        {/* -------------------------------------------------------------------------------- */}
        {/* TAB 2: PPC LANDING PAGE AD WEB FORM                                              */}
        {/* -------------------------------------------------------------------------------- */}
        {activeTab === "web_form" && (
          <form onSubmit={handleSubmitWebLead} className="space-y-4 text-xs">
            <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 text-indigo-900">
                <Globe className="h-4 w-4 text-indigo-600 shrink-0" />
                <span className="font-semibold text-xs">
                  PPC Landing Page Lead: Lead submitted from Google/Meta digital campaigns.
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 border border-indigo-300 font-bold">
                Full UTM Telemetry
              </span>
            </div>

            {/* Passenger & Routing */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Passenger Name *</label>
                <input
                  type="text"
                  required
                  value={webName}
                  onChange={(e) => setWebName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Email Address *</label>
                <input
                  type="email"
                  required
                  value={webEmail}
                  onChange={(e) => setWebEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Phone Number *</label>
                <input
                  type="text"
                  required
                  value={webPhone}
                  onChange={(e) => setWebPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Company (Optional)</label>
                <input
                  type="text"
                  value={webCompany}
                  onChange={(e) => setWebCompany(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Origin *</label>
                <input
                  type="text"
                  required
                  value={webOrigin}
                  onChange={(e) => setWebOrigin(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Destination *</label>
                <input
                  type="text"
                  required
                  value={webDestination}
                  onChange={(e) => setWebDestination(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Cabin Class</label>
                <select
                  value={webCabinClass}
                  onChange={(e) => setWebCabinClass(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-slate-900"
                >
                  <option value="ECONOMY">Economy</option>
                  <option value="PREMIUM_ECONOMY">Premium Economy</option>
                  <option value="BUSINESS">Business Class</option>
                  <option value="FIRST">First Class Suite</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Preferred Airline</label>
                <input
                  type="text"
                  value={webAirline}
                  onChange={(e) => setWebAirline(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900"
                />
              </div>
            </div>

            {/* Pricing */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Net Ticket Fare ($)</label>
                <input
                  type="number"
                  value={webTicketCost}
                  onChange={(e) => setWebTicketCost(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-indigo-900 mb-0.5">Quoted Sale Price ($)</label>
                <input
                  type="number"
                  value={webSaleQuote}
                  onChange={(e) => setWebSaleQuote(e.target.value)}
                  className="w-full bg-white border border-indigo-300 rounded-lg px-2.5 py-1.5 text-xs text-indigo-950 font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Assigned Agent</label>
                <select
                  value={webAssignee}
                  onChange={(e) => setWebAssignee(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-slate-800"
                >
                  <option value="UNASSIGNED">📥 Unassigned (Sales Manager Queue)</option>
                  {salesAgents.map((a) => (
                    <option key={a.id} value={a.id}>
                      👤 {a.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Optional PCI Card Vault - Strictly Masked */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800 text-xs flex items-center gap-1.5">
                  <CreditCard className="h-4 w-4 text-emerald-600" />
                  PCI Card Vault Tokenization (Optional)
                </span>
                <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={includePciCard}
                    onChange={(e) => setIncludePciCard(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Attach Card to Vault</span>
                </label>
              </div>

              {includePciCard && (
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-200">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Cardholder Name</label>
                    <input
                      type="text"
                      value={cardholderName}
                      onChange={(e) => setCardholderName(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Card Number (Full Vault)</label>
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Expiry Month</label>
                    <input
                      type="text"
                      value={expiryMonth}
                      onChange={(e) => setExpiryMonth(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Expiry Year</label>
                    <input
                      type="text"
                      value={expiryYear}
                      onChange={(e) => setExpiryYear(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-0.5">CVV Code</label>
                    <input
                      type="text"
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Card Type</label>
                    <select
                      value={cardType}
                      onChange={(e) => setCardType(e.target.value as any)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900"
                    >
                      <option value="VISA">VISA</option>
                      <option value="MASTERCARD">MasterCard</option>
                      <option value="AMEX">American Express</option>
                    </select>
                  </div>
                  <div className="sm:col-span-4 text-[10px] text-slate-500 italic">
                    🔒 PCI-DSS Guarantee: Stored encrypted. Card numbers and CVVs are masked from sales agents by default. Only managers can grant temporary 3-minute clearance.
                  </div>
                </div>
              )}
            </div>

            {/* Submit */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
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
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-indigo-600/25 transition active:scale-95 cursor-pointer"
              >
                <Globe className="h-4 w-4" />
                <span>{isSubmitting ? "Ingesting..." : "Ingest PPC Web Form Lead"}</span>
              </button>
            </div>
          </form>
        )}

        {/* -------------------------------------------------------------------------------- */}
        {/* TAB 3: BATCH CSV / BULK PPC IMPORT                                               */}
        {/* -------------------------------------------------------------------------------- */}
        {activeTab === "batch_csv" && (
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-xl bg-purple-50/70 border border-purple-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 text-purple-900">
                <FileSpreadsheet className="h-4 w-4 text-purple-600 shrink-0" />
                <span className="font-semibold text-xs">
                  Bulk CSV Import: Ingest lead exports from Google Ads Lead Forms or Meta Lead Ads.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setCsvContent(SAMPLE_CSV)}
                className="text-[11px] font-semibold text-purple-700 hover:underline cursor-pointer"
              >
                Reset to Sample CSV
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Paste CSV Data (name, phone, email, origin, destination, departureDate, cabinClass, ticketPrice, salePrice, campaign, keyword):
              </label>
              <textarea
                rows={6}
                value={csvContent}
                onChange={(e) => setCsvContent(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Distribution Target */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <span className="font-semibold text-slate-800 text-xs block">
                  Lead Distribution Policy for Batch Import:
                </span>
                <span className="text-[11px] text-slate-500">
                  Choose how these imported PPC leads will be assigned immediately.
                </span>
              </div>
              <select
                value={batchAssignee}
                onChange={(e) => setBatchAssignee(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 font-semibold"
              >
                <option value="ROUND_ROBIN">⚡ 1-Click Round-Robin Auto Distribute</option>
                <option value="UNASSIGNED">📥 Unassigned Pool (Sales Manager Queue)</option>
                {salesAgents.map((a) => (
                  <option key={a.id} value={a.id}>
                    👤 Assign All to {a.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Submit */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting || !csvContent.trim()}
                onClick={handleBatchImport}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-purple-600/25 transition active:scale-95 cursor-pointer"
              >
                <Upload className="h-4 w-4" />
                <span>{isSubmitting ? "Ingesting Batch..." : "Parse & Import Batch PPC Leads"}</span>
              </button>
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------------------------- */}
        {/* TAB 4: LIVE WEBHOOK & API PAYLOAD GENERATOR                                      */}
        {/* -------------------------------------------------------------------------------- */}
        {activeTab === "webhook_sim" && (
          <div className="space-y-4 text-xs">
            {/* Live Webhook URL Box */}
            <div className="p-3.5 rounded-xl bg-slate-900 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-mono tracking-wider text-indigo-400 font-bold block">
                  Live Webhook Receiver Endpoint:
                </span>
                <span className="font-mono text-xs text-slate-200 break-all select-all">
                  POST /api/leads/ppc
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyWebhookUrl}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition active:scale-95 shrink-0"
              >
                {copiedWebhook ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedWebhook ? "Copied Endpoint!" : "Copy URL"}</span>
              </button>
            </div>

            {/* Template Selector */}
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700 text-xs">
                Select Webhook Payload Template:
              </span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setWebhookTemplate("google_ads");
                    setWebhookJson(
                      JSON.stringify(
                        {
                          event: "GOOGLE_ADS_LEAD_FORM_SUBMITTED",
                          gclid: "CjwKCAiA-google-ads-token-88419",
                          campaign_name: "Google_Search_Luxury_UK_2026",
                          keyword: "best business class flights to london",
                          lead_data: {
                            full_name: "Sir Arthur Pendelton",
                            phone_number: "+1 555 771 9901",
                            email: "arthur.pendelton@oxford-holdings.co.uk",
                            origin: "JFK",
                            destination: "LHR",
                            departure_date: "2026-10-28",
                            cabin_class: "BUSINESS",
                            quoted_net_fare: 4600,
                          },
                        },
                        null,
                        2
                      )
                    );
                  }}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                    webhookTemplate === "google_ads"
                      ? "bg-indigo-50 text-indigo-700 border border-indigo-300 font-bold"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  Google Ads Lead Form
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setWebhookTemplate("meta_leads");
                    setWebhookJson(
                      JSON.stringify(
                        {
                          event: "META_LEAD_AD_RECEIVED",
                          ad_id: "meta_ad_994821",
                          campaign_name: "Meta_First_Class_Tokyo",
                          lead_data: {
                            full_name: "Dr. Kenji Takahashi",
                            phone_number: "+81 3 5555 0199",
                            email: "kenji@tokyo-biotech.jp",
                            origin: "SFO",
                            destination: "HND",
                            departure_date: "2026-11-05",
                            cabin_class: "FIRST",
                            quoted_net_fare: 14500,
                          },
                        },
                        null,
                        2
                      )
                    );
                  }}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                    webhookTemplate === "meta_leads"
                      ? "bg-indigo-50 text-indigo-700 border border-indigo-300 font-bold"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  Meta Lead Ads
                </button>
              </div>
            </div>

            {/* JSON Code Editor */}
            <div>
              <textarea
                rows={9}
                value={webhookJson}
                onChange={(e) => setWebhookJson(e.target.value)}
                className="w-full bg-slate-900 text-emerald-400 border border-slate-700 rounded-xl p-3 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Action */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleSimulateWebhook}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-emerald-600/25 transition active:scale-95 cursor-pointer"
              >
                <Zap className="h-4 w-4" />
                <span>{isSubmitting ? "Dispatched..." : "Simulate Live Webhook Hit"}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
