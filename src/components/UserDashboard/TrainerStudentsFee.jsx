import React, { useEffect, useState } from "react";
import { auth, db } from "../../firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  setDoc,
  serverTimestamp,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

const MONTHS = [
  { label: "January", value: "01" },
  { label: "February", value: "02" },
  { label: "March", value: "03" },
  { label: "April", value: "04" },
  { label: "May", value: "05" },
  { label: "June", value: "06" },
  { label: "July", value: "07" },
  { label: "August", value: "08" },
  { label: "September", value: "09" },
  { label: "October", value: "10" },
  { label: "November", value: "11" },
  { label: "December", value: "12" },
];

const StudentFeePayment = ({ studentUid }) => {
  const [student, setStudent] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [loading, setLoading] = useState(false);
  const [paidMonths, setPaidMonths] = useState([]);
  const [user, setUser] = useState(null);

  console.log("💡 Selected student UID:", studentUid);

  /* ================= AUTH ================= */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) setUser(u);
    });
    return () => unsub();
  }, []);

  /* ================= FETCH STUDENT ================= */
  useEffect(() => {
    if (!studentUid) return;

    const q = query(
      collection(db, "trainerstudents"),
      where("studentUid", "==", studentUid),
    );

    return onSnapshot(q, (snap) => {
      if (!snap.empty) {
        setStudent({ id: snap.docs[0].id, ...snap.docs[0].data() });
      }
    });
  }, [studentUid]);

  /* ================= FETCH PAID MONTHS ================= */
  useEffect(() => {
    if (!studentUid) return;

    const fetchPayments = async () => {
      const q = query(
        collection(db, "payments"),
        where("studentUid", "==", studentUid),
        where("status", "==", "Success"),
      );

      const snap = await getDocs(q);
      const months = snap.docs.map((d) => d.data().month);
      setPaidMonths(months);
    };

    fetchPayments();
  }, [studentUid]);

  /* ================= PAY ================= */
  const handlePay = async () => {
    if (!selectedMonth) return alert("Select month");
    if (!student) return;
    if (!user) return alert("User not authenticated");

    if (paidMonths.includes(selectedMonth)) {
      return alert("Fees already paid for this month ✅");
    }

    setLoading(true);

    try {
      const orderId = "ORD_" + Date.now();

      /* 🔐 Store pending */
      await setDoc(doc(db, "pendingPayments", orderId), {
        orderId,
        studentUid: user.uid,
        studentId: student.id,
        trainerId: student.trainerId,
        month: selectedMonth,
        amount: Number(student.fees),
        status: "PENDING",
        createdAt: serverTimestamp(),
      });

      /* 🔁 CALL BACKEND (RENDER SERVER) */
      const res = await fetch(
        "https://backendpayments.onrender.com/api/ccav/initiate",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: Number(student.fees),
            order_id: orderId,
            customer: {
              name: student.firstName + " " + student.lastName,
              email: student.email,
              phone: student.phone,
            },
          }),
        },
      );

      if (!res.ok) throw new Error("Backend error");

      const data = await res.json();

      if (!data?.encRequest || !data?.access_code || !data?.url) {
        throw new Error("Invalid encryption payload");
      }

      /* 🔁 Redirect to CCAvenue */
      const form = document.createElement("form");
      form.method = "POST";
      form.action = data.url;

      const encInput = document.createElement("input");
      encInput.type = "hidden";
      encInput.name = "encRequest";
      encInput.value = data.encRequest;

      const accessInput = document.createElement("input");
      accessInput.type = "hidden";
      accessInput.name = "access_code";
      accessInput.value = data.access_code;

      form.appendChild(encInput);
      form.appendChild(accessInput);
      document.body.appendChild(form);
      form.submit();
    } catch (err) {
      console.error("Payment error:", err);
      alert("Payment initiation failed");
      setLoading(false);
    }
  };

  /* ================= PAYMENT SUCCESS HANDLER ================= */
  const paymentSuccess = async (orderId, amount, month) => {
    try {
      /* ✅ payments collection */
      await setDoc(doc(db, "payments", orderId), {
        orderId,
        studentUid: student.studentUid,
        studentId: student.id,
        trainerId: student.trainerId,
        month,
        amount,
        status: "Success",
        createdAt: serverTimestamp(),
      });

      /* ✅ update trainerstudents */
      const studentRef = doc(db, "trainerstudents", student.id);
      await updateDoc(studentRef, {
        paid: amount,
        status: "Payment Completed",
      });

      /* ✅ update pendingPayments */
      await updateDoc(doc(db, "pendingPayments", orderId), {
        status: "Success",
      });

      console.log("✅ Payment completed & Firestore updated");
    } catch (e) {
      console.error("❌ Firestore update error:", e);
    }
  };

  /* ================= AUTO SUCCESS LISTENER ================= */
  useEffect(() => {
    if (!student) return;

    const params = new URLSearchParams(window.location.search);
    const status = params.get("status");
    const orderId = params.get("order_id");
    const amount = params.get("amount");

    if (status === "success" && orderId && amount) {
      paymentSuccess(orderId, Number(amount), selectedMonth);
    }
  }, [student]);

  /* ================= UI (UNCHANGED) ================= */

  if (!student) {
    return (
      <div className="min-h-screen flex items-center justify-center text-xl font-semibold">
        Loading student data...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f3f4f6] flex justify-center items-center p-4">
      <div className="bg-white w-full max-w-md rounded-xl shadow-lg p-6 space-y-5">
        <h2 className="text-2xl font-bold text-center">Fee Payment</h2>

        <div className="border rounded-lg p-4 space-y-2">
          <p>
            <b>Name:</b> {student.firstName} {student.lastName}
          </p>
          <p>
            <b>Session:</b> {student.sessions}
          </p>
          <p>
            <b>Category:</b> {student.category}
          </p>
        </div>

        <div>
          <label className="block mb-1 font-medium">Select Month</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full border rounded-lg p-2"
          >
            <option value="">-- Select Month --</option>
            {MONTHS.map((m) => (
              <option
                key={m.value}
                value={m.value}
                disabled={paidMonths.includes(m.value)}
              >
                {m.label} {paidMonths.includes(m.value) ? "✅ Paid" : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="border rounded-lg p-4 bg-gray-50">
          <p className="text-lg font-semibold">Payable Amount</p>
          <p className="text-3xl font-bold text-orange-500">
            ₹ {Number(student.fees)}
          </p>
        </div>

        <button
          onClick={handlePay}
          disabled={loading}
          className="w-full bg-orange-500 text-white py-3 rounded-lg font-semibold text-lg hover:bg-orange-600 transition disabled:opacity-50"
        >
          {loading ? "Redirecting to Payment Gateway..." : "Pay Now"}
        </button>
      </div>
    </div>
  );
};

export default StudentFeePayment;
