import React, { useEffect, useMemo, useState, useRef } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../context/AuthContext";
import { setDoc, doc, updateDoc, serverTimestamp } from "firebase/firestore";

import { ChevronDown } from "lucide-react";

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

const SalaryDetailsPage = () => {
  const { user } = useAuth();

  const [trainers, setTrainers] = useState([]);
  const [payslips, setPayslips] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTrainer, setSelectedTrainer] = useState(null);
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const monthRef = useRef(null);

  const [addData, setAddData] = useState({
    firstName: "",
    lastName: "",
    designation: "",
    monthlySalary: "",
  });

  const [editData, setEditData] = useState({
    firstName: "",
    lastName: "",
    designation: "",
    monthlySalary: "",
  });

  /* ================= FETCH TRAINERS ================= */
  useEffect(() => {
    if (!user) return;

    const fetchTrainers = async () => {
      const q = query(
        collection(db, "InstituteTrainers"),
        where("instituteId", "==", user.uid),
      );

      const snap = await getDocs(q);
      setTrainers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    };

    fetchTrainers();
  }, [user]);
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (monthRef.current && !monthRef.current.contains(e.target)) {
        setShowMonthDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* ================= FETCH PAYSLIPS ================= */
  useEffect(() => {
    if (!user) return;

    const fetchPayslips = async () => {
      const snap = await getDocs(
        collection(db, "institutes", user.uid, "payslips"),
      );
      setPayslips(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    };

    fetchPayslips();
  }, [user]);

  const addTrainer = async () => {
    const newRef = doc(collection(db, "InstituteTrainers"));

    const newTrainer = {
      id: newRef.id,
      ...addData,
      instituteId: user.uid,
      createdAt: new Date(),
    };

    await setDoc(newRef, {
      ...newTrainer,
      createdAt: serverTimestamp(),
    });

    // ✅ Update local state immediately
    setTrainers((prev) => [...prev, newTrainer]);

    setShowAddModal(false);
    setAddData({
      firstName: "",
      lastName: "",
      designation: "",
      monthlySalary: "",
    });
  };

  const updateTrainer = async () => {
    await updateDoc(doc(db, "InstituteTrainers", selectedTrainer.id), editData);

    // ✅ Update local state
    setTrainers((prev) =>
      prev.map((t) =>
        t.id === selectedTrainer.id ? { ...t, ...editData } : t,
      ),
    );

    setShowEditModal(false);
  };

  /* ================= FILTER ================= */
  const filteredTrainers = useMemo(() => {
    return trainers.filter((t) => {
      const nameMatch = `${t.firstName} ${t.lastName}`
        .toLowerCase()
        .includes(search.toLowerCase());

      return nameMatch;
    });
  }, [trainers, search]);

  const handleEdit = () => {
    if (!selectedTrainer) {
      alert("Select trainer first");
      return;
    }

    setEditData({
      firstName: selectedTrainer.firstName || "",
      lastName: selectedTrainer.lastName || "",
      designation: selectedTrainer.designation || "",
      monthlySalary: selectedTrainer.monthlySalary || "",
    });

    setShowEditModal(true);
  };

  /* ================= CALCULATIONS ================= */
  const totalTrainers = trainers.length;

  const totalSalaryAmount = trainers.reduce(
    (sum, t) => sum + Number(t.monthlySalary || 0),
    0,
  );

  const totalSalaryPaid = payslips.reduce(
    (sum, p) => sum + Number(p.salary?.net || 0),
    0,
  );

  const totalSalaryPending = totalSalaryAmount - totalSalaryPaid;

  /* ================= GET PAID DATA ================= */
  const getTrainerSalaryData = (trainer) => {
    const payslip = payslips.find((p) => p.trainerId === trainer.id);

    return {
      paid: payslip?.salary?.net || 0,
      date: payslip?.generatedAt
        ? new Date(payslip.generatedAt.seconds * 1000).toLocaleDateString()
        : "-",
    };
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <h1 className="text-3xl font-bold">Salary Details</h1>

        <div ref={monthRef} className="relative w-full sm:w-48">
          <button
            onClick={() => setShowMonthDropdown(!showMonthDropdown)}
            className="bg-orange-500 text-white rounded-lg px-4 py-3 font-semibold w-full flex items-center justify-between"
          >
            <span>
              {selectedMonth
                ? MONTHS.find((m) => m.value === selectedMonth)?.label
                : "Select Month"}
            </span>

            <ChevronDown
              size={18}
              className={`ml-2 transition-transform ${
                showMonthDropdown ? "rotate-180" : ""
              }`}
            />
          </button>

          {showMonthDropdown && (
            <div className="absolute z-50 mt-1 w-full bg-white border rounded-lg shadow-md max-h-48 overflow-y-auto">
              {MONTHS.map((m) => (
                <div
                  key={m.value}
                  onClick={() => {
                    setSelectedMonth(m.value);
                    setShowMonthDropdown(false);
                  }}
                  className="px-4 py-2 hover:bg-blue-100 cursor-pointer"
                >
                  {m.label}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Employees" value={totalTrainers} />
        <StatCard
          title="Total Salary Amount"
          value={`₹ ${totalSalaryAmount}`}
        />
        <StatCard
          title="Total Salary Pending"
          value={`₹ ${totalSalaryPending}`}
        />
        <StatCard title="Total Salary Paid" value={`₹ ${totalSalaryPaid}`} />
      </div>

      {/* SEARCH + FILTER + BUTTONS */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 mb-4">
        <input
          type="text"
          placeholder="Search here..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-orange-400 rounded px-4 py-2 w-full sm:w-80 focus:outline-none focus:ring-0 focus:border-orange-400"
        />

        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="bg-orange-500 text-white px-4 py-2 rounded"
            >
              + Add
            </button>
            <button
              type="button"
              onClick={handleEdit}
              className="border border-orange-500 text-orange-500 px-4 py-2 rounded"
            >
              Edit
            </button>
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <div className="grid grid-cols-5 min-w-[700px] bg-black text-orange-500 px-6 py-3 font-semibold">
          <div>Employee Names</div>
          <div>Designation</div>
          <div>Monthly Salary</div>
          <div>Paid</div>
          <div>Date</div>
        </div>

        {filteredTrainers.map((trainer) => {
          const salaryData = getTrainerSalaryData(trainer);

          return (
            <div
              key={trainer.id}
              onClick={() => setSelectedTrainer(trainer)}
              className={`grid grid-cols-5 min-w-[700px] px-6 py-4 border-t items-center cursor-pointer
  ${selectedTrainer?.id === trainer.id ? "bg-orange-50" : ""}`}
            >
              <div>
                {trainer.firstName} {trainer.lastName}
              </div>
              <div>{trainer.designation}</div>
              <div>₹ {trainer.monthlySalary || 0}</div>
              <div className="text-green-600 font-semibold">
                ₹ {salaryData.paid}
              </div>
              <div>{salaryData.date}</div>
            </div>
          );
        })}
      </div>

      {/* SAVE & CANCEL */}
      <div className="flex flex-col sm:flex-row justify-end gap-6 mt-8">
        <button
          onClick={() => {
            setSearch("");
            setSelectedMonth("");
          }}
          className="text-lg font-medium"
        >
          Cancel
        </button>

        <button
          onClick={() => alert("Saved Successfully")}
          className="bg-orange-500 text-white px-8 py-3 rounded-lg text-lg font-semibold w-full sm:w-auto"
        >
          Save
        </button>
      </div>
      {showAddModal && (
        <ModalForm
          title="Add Trainer"
          data={addData}
          setData={setAddData}
          onSave={addTrainer}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {showEditModal && (
        <ModalForm
          title="Edit Trainer"
          data={editData}
          setData={setEditData}
          onSave={updateTrainer}
          onClose={() => setShowEditModal(false)}
        />
      )}
    </div>
  );
};

const StatCard = ({ title, value }) => (
  <div className="bg-black text-white p-4 rounded-lg">
    <h3 className="text-sm">{title}</h3>
    <p className="text-xl font-bold text-orange-500 mt-2">{value}</p>
  </div>
);
const ModalForm = ({ title, data, setData, onSave, onClose }) => (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
    <div className="bg-white p-6 rounded-xl w-[90%] sm:w-96 space-y-4">
      <h2 className="font-semibold">{title}</h2>

      {Object.keys(data).map((k) => (
        <input
          key={k}
          className="border w-full p-2 rounded"
          placeholder={k}
          value={data[k]}
          onChange={(e) => setData({ ...data, [k]: e.target.value })}
        />
      ))}

      <div className="flex justify-end gap-3">
        <button type="button" onClick={onClose}>
          Cancel
        </button>

        <button
          type="button"
          onClick={onSave}
          className="bg-orange-500 text-white px-4 py-2 rounded"
        >
          Save
        </button>
      </div>
    </div>
  </div>
);

export default SalaryDetailsPage;
