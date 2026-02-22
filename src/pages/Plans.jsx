import React, { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import {
  doc,
  getDoc,
  setDoc,
  Timestamp,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";

export default function Plans() {
  const navigate = useNavigate();
  const [billing, setBilling] = useState("monthly");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  // 🔐 Detect logged-in user
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => setUser(u));
    return () => unsubscribe();
  }, []);

  // 🔐 Detect role securely
  const getRole = async () => {
    if (!user) return null;
    const trainerSnap = await getDoc(doc(db, "trainers", user.uid));
    const instituteSnap = await getDoc(doc(db, "institutes", user.uid));
    if (trainerSnap.exists()) return "trainer";
    if (instituteSnap.exists()) return "institute";
    return null;
  };

  const handleSubscription = async (planType, amount, durationDays) => {
    if (!user) return alert("User not authenticated");
    setLoading(true);

    try {
      const orderId = "ORD_" + Date.now();
      const role = await getRole();
      if (!role) throw new Error("Role not found");

      // 🔐 Store pending payment in Firestore
      await setDoc(doc(db, "pendingPayments", orderId), {
        orderId,
        userId: user.uid,
        role,
        planType,
        amount,
        durationDays,
        status: "PENDING",
        createdAt: serverTimestamp(),
      });

      // 🔁 Initiate payment
      const res = await fetch(
        "https://backendpayments.onrender.com/api/ccav/initiate",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount,
            order_id: orderId,
            customer: { name: user.displayName || "User", email: user.email },
            planType,
            durationDays,
            userId: user.uid,
            role,
          }),
        },
      );

      if (!res.ok) throw new Error("Backend error");
      const data = await res.json();
      if (!data?.encRequest || !data?.access_code || !data?.url)
        throw new Error("Invalid payment payload");

      // 🔁 Redirect to CCAvenue
      const form = document.createElement("form");
      form.method = "POST";
      form.action = data.url;
      form.innerHTML = `
        <input type="hidden" name="encRequest" value="${data.encRequest}" />
        <input type="hidden" name="access_code" value="${data.access_code}" />
      `;
      document.body.appendChild(form);
      form.submit();
    } catch (err) {
      console.error("Payment error:", err);
      alert("Payment initiation failed");
      setLoading(false);
    }
  };

  // ✅ Payment success handler (like Free Trial)
  useEffect(() => {
    if (!user) return;

    const params = new URLSearchParams(window.location.search);
    const status = params.get("status");
    const orderId = params.get("order_id");
    const amount = params.get("amount");

    if (status === "success" && orderId && amount) {
      (async () => {
        try {
          const planSnap = await getDoc(doc(db, "pendingPayments", orderId));
          if (!planSnap.exists()) return;

          const { planType, durationDays, role } = planSnap.data();
          const startDate = Timestamp.now();
          const endDate = Timestamp.fromDate(
            new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000),
          );

          // 🔐 Save subscription in Firestore (same as Free Trial)
          await setDoc(doc(db, "plans", user.uid), {
            role,
            freeTrialUsed: false, // Free trial commented
            currentPlan: { planType, startDate, endDate, status: "active" },
            history: [
              {
                planType,
                startDate,
                endDate,
                amount: Number(amount),
              },
            ],
            createdAt: serverTimestamp(),
          });

          // 🔐 Update pendingPayments
          await updateDoc(doc(db, "pendingPayments", orderId), {
            status: "Success",
          });

          alert("✅ Subscription Activated");

          // 🔁 Redirect to dashboard like Free Trial
          if (role === "trainer")
            navigate("/trainers/dashboard", { replace: true });
          else if (role === "institute")
            navigate("/institutes/dashboard", { replace: true });
        } catch (e) {
          console.error("Firestore update error:", e);
        }
      })();
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center py-16">
      <h1 className="text-3xl font-bold mb-2">Get Started</h1>
      <p className="text-gray-500 mb-6">
        Start for free or subscribe to a plan. Ready to be part of the future
      </p>

      {/* Toggle */}
      <div className="flex border rounded-full mb-10 overflow-hidden">
        <button
          onClick={() => setBilling("monthly")}
          className={`px-6 py-2 ${
            billing === "monthly" ? "bg-orange-500 text-black" : "bg-white"
          }`}
        >
          Monthly Plan
        </button>
        <button
          onClick={() => setBilling("annual")}
          className={`px-6 py-2 ${
            billing === "annual" ? "bg-orange-500 text-black" : "bg-white"
          }`}
        >
          Annual Plan
        </button>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl w-full px-6">
        {/* FREE */}
        <div className="bg-gray-900 text-white rounded-xl p-8 relative">
          <h2 className="text-xl font-bold mb-2">₹ 0/-</h2>
          <p className="text-lime-400 font-semibold mb-4">FREE (1 Month)</p>
          <ul className="space-y-2 text-sm">
            <li>✔ Trainer & Institutes</li>
            <li>✔ Attendance Tracking</li>
            <li>✔ Fees Payment Tracking</li>
            <li>✔ Reports Generator</li>
          </ul>
          {/* Free Trial commented */}
        </div>

        {/* TRAINER */}
        <div className="bg-gray-900 text-white rounded-xl p-8 relative">
          <span className="absolute top-3 right-3 bg-lime-400 text-black text-xs px-2 py-1 rounded">
            20% OFF
          </span>
          <h2 className="text-xl font-bold mb-2">
            {billing === "monthly" ? "₹ 1/-" : "₹ 4,790 / Year"}
          </h2>
          <p className="text-lime-400 font-semibold mb-4">Trainer’s Plan</p>
          <ul className="space-y-2 text-sm">
            <li>✔ Attendance Tracking</li>
            <li>✔ Fees Payment Tracking</li>
            <li>✔ Reports Generator</li>
            <li>✔ 01 Free Ad Per Year</li>
          </ul>
          <button
            onClick={() =>
              handleSubscription(
                "Trainer",
                billing === "monthly" ? 1 : 4790,
                billing === "monthly" ? 30 : 365,
              )
            }
            disabled={loading}
            className="mt-6 w-full bg-lime-400 text-black py-2 rounded font-semibold"
          >
            {loading ? "Redirecting..." : "Subscribe"}
          </button>
        </div>

        {/* INSTITUTE */}
        <div className="bg-gray-900 text-white rounded-xl p-8 relative">
          <span className="absolute top-3 right-3 bg-lime-400 text-black text-xs px-2 py-1 rounded">
            20% OFF
          </span>
          <h2 className="text-xl font-bold mb-2">
            {billing === "monthly" ? "₹ 999/-" : "₹ 9,590 / Year"}
          </h2>
          <p className="text-lime-400 font-semibold mb-4">Institutes Plan</p>
          <ul className="space-y-2 text-sm">
            <li>✔ Trainers Management Attendance</li>
            <li>✔ Institute Workforce Attendance</li>
            <li>✔ Salary Tracking</li>
            <li>✔ Reports</li>
            <li>✔ 03 Ads Free Per Year</li>
          </ul>
          <button
            onClick={() =>
              handleSubscription(
                "Institute",
                billing === "monthly" ? 999 : 9590,
                billing === "monthly" ? 30 : 365,
              )
            }
            disabled={loading}
            className="mt-6 w-full bg-lime-400 text-black py-2 rounded font-semibold"
          >
            {loading ? "Redirecting..." : "Subscribe"}
          </button>
        </div>
      </div>
    </div>
  );
}
