import React, { useEffect, useState } from "react";
import { collection, getDocs, collectionGroup } from "firebase/firestore";
import { db } from "../firebase";

const AdminPaymentsPage = () => {
  const [trainerPayments, setTrainerPayments] = useState([]);
  const [institutePayments, setInstitutePayments] = useState([]);

  const [trainersMap, setTrainersMap] = useState({});
  const [institutesMap, setInstitutesMap] = useState({});

  const [razorPayments, setRazorPayments] = useState([]);
  const [transfers, setTransfers] = useState([]);

  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);

      // Trainers
      const trainerSnap = await getDocs(collection(db, "trainers"));
      let tMap = {};
      trainerSnap.forEach((doc) => {
        const d = doc.data();
        tMap[doc.id] = (d.firstName || "") + " " + (d.lastName || "");
      });
      setTrainersMap(tMap);

      // Institutes
      const instSnap = await getDocs(collection(db, "institutes"));
      let iMap = {};
      instSnap.forEach((doc) => {
        iMap[doc.id] = doc.data().instituteName;
      });
      setInstitutesMap(iMap);

      // Payments
      const paySnap = await getDocs(collectionGroup(db, "payments"));

      let trainerList = [];
      let instList = [];

      paySnap.forEach((docSnap) => {
        const d = docSnap.data();

        if (d.trainerId) trainerList.push({ id: docSnap.id, ...d });
        if (d.instituteId) instList.push({ id: docSnap.id, ...d });
      });

      setTrainerPayments(trainerList);
      setInstitutePayments(instList);

      // Razorpay Payments
      const rp = await fetch("http://localhost:5000/all-payments");
      setRazorPayments(await rp.json());

      // Transfers
      const tr = await fetch("http://localhost:5000/all-transfers");
      setTransfers(await tr.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // 🔥 Match Razorpay Payment
  const findRazor = (p) =>
    razorPayments.find((r) => r.id === p.paymentId || r.order_id === p.orderId);

  // 🔥 Match Transfer
  const findTransfer = (p) =>
    transfers.find((t) => t.source === p.paymentId || t.source === p.orderId);

  // 🔍 FILTER
  const filterData = (list, isInstitute = false) => {
    return list.filter((p) => {
      const name = isInstitute
        ? institutesMap[p.instituteId] || ""
        : trainersMap[p.trainerId] || "";

      return (
        name.toLowerCase().includes(search.toLowerCase()) ||
        (p.paymentId || "").toLowerCase().includes(search.toLowerCase()) ||
        (p.orderId || "").toLowerCase().includes(search.toLowerCase())
      );
    });
  };

  const filteredTrainer = filterData(trainerPayments).sort((a, b) => {
    const dateA = new Date(a.paidDate || a.createdAt?.seconds * 1000 || 0);
    const dateB = new Date(b.paidDate || b.createdAt?.seconds * 1000 || 0);
    return dateB - dateA; // latest first
  });

  const filteredInstitute = filterData(institutePayments, true).sort((a, b) => {
    const dateA = new Date(a.date || a.createdAt?.seconds * 1000 || 0);
    const dateB = new Date(b.date || b.createdAt?.seconds * 1000 || 0);
    return dateB - dateA; // latest first
  });

  const calculate = (p, isInstitute = false) => {
    const r = findRazor(p);
    const t = findTransfer(p);

    const amount = isInstitute ? p.totalAmount || 0 : p.paidAmount || 0;
    const fee = r ? (r.fee || 0) / 100 : 0;
    const tax = r ? (r.tax || 0) / 100 : 0;
    const net = amount - fee - tax;
    const transferred = t ? (t.amount || 0) / 100 : 0;
    const balance = net - transferred;

    return { amount, fee, tax, net, transferred, balance, t };
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-4">Advanced Finance Dashboard</h1>

      {/* SEARCH */}
      <input
        className="border p-2 rounded w-full mb-6"
        placeholder="Search by Payment ID / Order ID / Name"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {loading ? (
        <div className="text-center py-10">Loading...</div>
      ) : (
        <>
          {/* ================= TRAINERS ================= */}
          <h2 className="text-xl font-semibold mb-3">Trainer Payments</h2>

          <div className="overflow-x-auto bg-white rounded shadow mb-10">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-3">Trainer</th>
                  <th className="p-3">Student</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Payment ID</th>
                  <th className="p-3">Order ID</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Method</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Fee</th>
                  <th className="p-3">Tax</th>
                  <th className="p-3">Net</th>
                  <th className="p-3">Transferred</th>
                  <th className="p-3">Account</th>
                  <th className="p-3">Balance</th>
                </tr>
              </thead>

              <tbody>
                {filteredTrainer.map((p) => {
                  const c = calculate(p);

                  return (
                    <tr key={p.id} className="border-t">
                      <td className="p-3">{trainersMap[p.trainerId]}</td>
                      <td className="p-3">{p.studentId}</td>
                      <td className="p-3">
                        {p.category} / {p.subCategory}
                      </td>
                      <td className="p-3">{p.paymentId}</td>
                      <td className="p-3">{p.orderId}</td>
                      <td className="p-3">{p.paidDate}</td>
                      <td className="p-3">{p.paymentMethod}</td>
                      <td className="p-3">{p.paymentStatus}</td>
                      <td className="p-3 text-green-600">₹{c.amount}</td>
                      <td className="p-3">₹{c.fee}</td>
                      <td className="p-3">₹{c.tax}</td>
                      <td className="p-3 font-semibold">₹{c.net}</td>
                      <td className="p-3 text-blue-600">₹{c.transferred}</td>
                      <td className="p-3 text-xs">{c.t?.account || "-"}</td>
                      <td className="p-3">
                        {c.balance > 0 ? (
                          <span className="text-red-500">₹{c.balance}</span>
                        ) : (
                          <span className="text-green-600">Settled</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ================= INSTITUTES ================= */}
          <h2 className="text-xl font-semibold mb-3">Institute Payments</h2>

          <div className="overflow-x-auto bg-white rounded shadow">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-3">Institute</th>
                  <th className="p-3">Student</th>
                  <th className="p-3">Items</th>
                  <th className="p-3">Payment ID</th>
                  <th className="p-3">Order ID</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Fee</th>
                  <th className="p-3">Tax</th>
                  <th className="p-3">Net</th>
                  <th className="p-3">Transferred</th>
                  <th className="p-3">Account</th>
                  <th className="p-3">Balance</th>
                </tr>
              </thead>

              <tbody>
                {filteredInstitute.map((p) => {
                  const c = calculate(p, true);

                  return (
                    <tr key={p.id} className="border-t">
                      <td className="p-3">{institutesMap[p.instituteId]}</td>
                      <td className="p-3">{p.studentName}</td>
                      <td className="p-3">
                        {p.items?.map((i, idx) => (
                          <div key={idx}>
                            {i.category} / {i.subCategory}
                          </div>
                        ))}
                      </td>
                      <td className="p-3">{p.paymentId}</td>
                      <td className="p-3">{p.orderId}</td>
                      <td className="p-3">{p.date}</td>
                      <td className="p-3">{p.status}</td>
                      <td className="p-3 text-blue-600">₹{c.amount}</td>
                      <td className="p-3">₹{c.fee}</td>
                      <td className="p-3">₹{c.tax}</td>
                      <td className="p-3 font-semibold">₹{c.net}</td>
                      <td className="p-3 text-blue-600">₹{c.transferred}</td>
                      <td className="p-3 text-xs">{c.t?.account || "-"}</td>
                      <td className="p-3">
                        {c.balance > 0 ? (
                          <span className="text-red-500">₹{c.balance}</span>
                        ) : (
                          <span className="text-green-600">Settled</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminPaymentsPage;
