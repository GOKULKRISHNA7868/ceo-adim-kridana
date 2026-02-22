import React, { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../../../firebase";
import { useAuth } from "../../../../context/AuthContext";

// 🔥 Firestore save
import { doc, setDoc, arrayUnion } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const ParticipantConfiguration = ({ formData, setFormData }) => {
  const { user } = useAuth();
  const auth = getAuth();

  const [students, setStudents] = useState([]);
  const [otherCustomers, setOtherCustomers] = useState([
    { name: "", phone: "" },
  ]);

  const inputStyle =
    "w-full border border-orange-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-400 outline-none";

  const ageGroups = [
    "3 – 5 years",
    "6 – 8 years",
    "9 – 12 years",
    "13 – 15 years",
    "16 – 18 years",
    "18+ years",
  ];

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      participants: {
        ...prev.participants,
        [field]: value,
      },
    }));
  };

  // =========================
  // Fetch institute students
  // =========================
  useEffect(() => {
    const fetchStudents = async () => {
      if (!user?.uid) return;

      const q = query(
        collection(db, "students"),
        where("instituteId", "==", user.uid),
      );

      const snapshot = await getDocs(q);
      const list = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setStudents(list);
    };

    fetchStudents();
  }, [user]);

  // =========================
  // Save other institute customers to formData
  // =========================
  useEffect(() => {
    handleChange("otherInstituteCustomers", otherCustomers);
  }, [otherCustomers]);

  // =========================
  // 🔥 Firestore Save Logic
  // =========================
  const saveParticipantConfiguration = async () => {
    try {
      const currentUser = auth.currentUser;

      if (!currentUser) {
        console.error("Institute not logged in ❌");
        return;
      }

      const instituteId = currentUser.uid;

      const eventRef = doc(db, "events", instituteId);

      const participantData = {
        ageGroup: formData?.participants?.ageGroup || "",
        eligibility: formData?.participants?.eligibility || "",
        skillLevel: formData?.participants?.skillLevel || "",
        maxParticipants: formData?.participants?.maxParticipants || "",
        selectedInstituteCustomers:
          formData?.participants?.selectedCustomers || [], // multiple
        otherInstituteCustomers:
          formData?.participants?.otherInstituteCustomers || [],
        createdAt: new Date(),
      };

      await setDoc(
        eventRef,
        {
          participantConfiguration: arrayUnion(participantData),
        },
        { merge: true },
      );

      console.log("Participant Configuration saved ✅");
    } catch (error) {
      console.error("Error saving Participant Configuration ❌", error);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* ================= MAIN CARD ================= */}
      <div className="bg-white rounded-xl shadow-md p-6 space-y-6">
        <h2 className="text-xl font-bold">Participant Configuration</h2>

        {/* Age Groups */}
        <div>
          <label className="block font-medium mb-3">
            Participant Age Group*
          </label>

          <div className="flex flex-wrap gap-3">
            {ageGroups.map((age, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleChange("ageGroup", age)}
                className={`px-4 py-2 rounded-md border text-sm transition
                  ${
                    formData?.participants?.ageGroup === age
                      ? "bg-orange-500 text-white border-orange-500"
                      : "border-orange-400 text-gray-700 hover:bg-orange-50"
                  }`}
              >
                {age}
              </button>
            ))}
          </div>
        </div>

        {/* Eligibility + Skill */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block font-medium mb-2">
              Eligibility Criteria*
            </label>
            <input
              type="text"
              className={inputStyle}
              value={formData?.participants?.eligibility || ""}
              onChange={(e) => handleChange("eligibility", e.target.value)}
            />
          </div>

          <div>
            <label className="block font-medium mb-2">Skill Level*</label>
            <select
              className={inputStyle}
              value={formData?.participants?.skillLevel || ""}
              onChange={(e) => handleChange("skillLevel", e.target.value)}
            >
              <option value="">Select Skill Level</option>
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>
          </div>
        </div>

        {/* Documents + Max Participants */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block font-medium mb-2">
              Upload required Documents*
            </label>

            <div className="border border-orange-300 rounded-lg h-10 flex items-center justify-between px-3">
              <span className="text-gray-400 text-sm">Upload Documents</span>

              <input type="file" className="hidden" id="docs" />
              <label htmlFor="docs" className="cursor-pointer text-orange-500">
                <img
                  src="/upload.png"
                  alt="Upload"
                  className="w-5 h-5 object-contain"
                />
              </label>
            </div>
          </div>

          <div>
            <label className="block font-medium mb-2">
              Maximum Participants*
            </label>
            <input
              type="number"
              placeholder="eg: 30"
              className={inputStyle}
              value={formData?.participants?.maxParticipants || ""}
              onChange={(e) => handleChange("maxParticipants", e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* ================= INSTITUTE CUSTOMERS ================= */}
      <div className="bg-white rounded-xl shadow-md p-6 space-y-4">
        <h3 className="text-lg font-semibold">
          Choose Customers From Your Institute
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block font-medium mb-2">Select Customer’s*</label>

            {/* 🔥 MULTI SELECT */}
            <select
              multiple
              className={inputStyle}
              value={formData?.participants?.selectedCustomers || []}
              onChange={(e) => {
                const selected = Array.from(
                  e.target.selectedOptions,
                  (option) => option.value,
                );
                handleChange("selectedCustomers", selected);
              }}
            >
              {students.map((student) => (
                <option
                  key={student.id}
                  value={`${student.firstName} ${student.lastName}`}
                >
                  {student.firstName} {student.lastName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-medium mb-2">Add Category*</label>
            <select className={inputStyle}>
              <option>Select Categories</option>
              <option>Martial Arts</option>
              <option>Team Ball Sports</option>
              <option>Racket Sports</option>
              <option>Fitness</option>
              <option>Target & Precision Sports</option>
              <option>Equestrian Sports</option>
              <option>Adventure & Outdoor Sports</option>
              <option>Ice Sports</option>
              <option>Wellness</option>
              <option>Dance</option>
            </select>
          </div>
        </div>
      </div>

      {/* ================= OTHER INSTITUTE CUSTOMERS ================= */}
      <div className="bg-white rounded-xl shadow-md p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">
            Choose Customers From Other Institutes
          </h3>

          <button
            type="button"
            onClick={() =>
              setOtherCustomers([...otherCustomers, { name: "", phone: "" }])
            }
            className="bg-orange-500 text-white px-4 py-1 rounded-md text-sm hover:bg-orange-600 transition"
          >
            + Add
          </button>
        </div>

        {otherCustomers.map((customer, index) => (
          <div
            key={index}
            className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4"
          >
            <div>
              <label className="block font-medium mb-2">
                Add Customer Name*
              </label>
              <input
                type="text"
                className={inputStyle}
                value={customer.name}
                onChange={(e) => {
                  const updated = [...otherCustomers];
                  updated[index].name = e.target.value;
                  setOtherCustomers(updated);
                }}
              />
            </div>

            <div>
              <label className="block font-medium mb-2">
                Add Contact Number*
              </label>
              <input
                type="tel"
                className={inputStyle}
                value={customer.phone}
                onChange={(e) => {
                  const updated = [...otherCustomers];
                  updated[index].phone = e.target.value;
                  setOtherCustomers(updated);
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* 🔥 Hidden save trigger (UI untouched) */}
      <div className="hidden">
        <button onClick={saveParticipantConfiguration}>Save</button>
      </div>
    </div>
  );
};

export default ParticipantConfiguration;
