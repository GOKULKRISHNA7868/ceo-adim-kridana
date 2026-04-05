import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";

const AdminKYCPage = () => {
  const [data, setData] = useState([]);
  const [view, setView] = useState("institutes"); // 🔥 toggle
  const [loading, setLoading] = useState(true);

  // 🔥 Fetch Data (Institutes or Trainers)
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      try {
        const querySnapshot = await getDocs(collection(db, view));

        const result = await Promise.all(
          querySnapshot.docs.map(async (docSnap) => {
            const baseData = docSnap.data();
            const uid = docSnap.id;

            let kycData = null;

            try {
              const kycRef = doc(db, view, uid, "Kyc", "details");
              const kycSnap = await getDoc(kycRef);

              if (kycSnap.exists()) {
                kycData = kycSnap.data();
              }
            } catch (err) {}

            return {
              id: uid,
              ...baseData,
              kyc: kycData,
            };
          }),
        );

        setData(result);
      } catch (err) {
        console.error(err);
      }

      setLoading(false);
    };

    fetchData();
  }, [view]);

  if (loading) {
    return <div className="p-10 text-center">Loading {view}...</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* 🔥 HEADER */}
      <h1 className="text-3xl font-bold text-center mb-6">
        Admin KYC Dashboard
      </h1>

      {/* 🔥 FILTER BUTTONS */}
      <div className="flex justify-center gap-4 mb-6">
        <button
          onClick={() => setView("institutes")}
          className={`px-6 py-2 rounded-xl font-semibold ${
            view === "institutes" ? "bg-blue-600 text-white" : "bg-gray-200"
          }`}
        >
          Institutes
        </button>

        <button
          onClick={() => setView("trainers")}
          className={`px-6 py-2 rounded-xl font-semibold ${
            view === "trainers" ? "bg-green-600 text-white" : "bg-gray-200"
          }`}
        >
          Trainers
        </button>
      </div>

      {/* 🔥 GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data.map((item) => (
          <div
            key={item.id}
            className="bg-white shadow-xl rounded-2xl p-5 border hover:shadow-2xl transition"
          >
            {/* 🔹 PROFILE HEADER */}
            <div className="flex items-center gap-3 mb-4">
              <img
                src={item.profileImageUrl || "https://via.placeholder.com/50"}
                alt="profile"
                className="w-12 h-12 rounded-full object-cover border"
              />

              <div>
                <h2 className="text-lg font-bold text-blue-600">
                  {view === "institutes"
                    ? item.instituteName || "No Name"
                    : item.firstName + " " + item.lastName || "Trainer"}
                </h2>

                <p className="text-xs text-gray-500 capitalize">{view}</p>
              </div>
            </div>

            {/* 🔹 BASIC INFO */}
            <div className="text-sm mb-3 space-y-1">
              <p>📞 {item.phoneNumber}</p>
              <p>✉️ {item.email}</p>

              {view === "institutes" ? (
                <p>
                  📍 {item.city}, {item.state}
                </p>
              ) : (
                <p>🎓 {item.designation}</p>
              )}
            </div>

            {/* 🔹 KYC SECTION */}
            <div className="border-t pt-3">
              <h3 className="font-semibold mb-2 text-gray-700">KYC Details</h3>

              {item.kyc ? (
                <div className="space-y-1 text-sm max-h-40 overflow-y-auto pr-1">
                  {Object.entries(item.kyc).map(([key, value]) => {
                    let displayValue = value;

                    // ✅ Timestamp fix
                    if (value && value.seconds) {
                      displayValue = new Date(
                        value.seconds * 1000,
                      ).toLocaleString();
                    }

                    // 🔒 Mask account number
                    if (key === "accountNumber") {
                      displayValue = "****" + value.slice(-4);
                    }

                    return (
                      <p key={key} className="break-all">
                        <strong className="capitalize">{key}:</strong>{" "}
                        {String(displayValue)}
                      </p>
                    );
                  })}
                </div>
              ) : (
                <p className="text-red-500 text-sm">❌ KYC Not Submitted</p>
              )}
            </div>

            {/* 🔹 STATUS BADGE */}
            <div className="mt-4">
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  item.kyc
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {item.kyc ? "KYC Completed" : "Pending"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminKYCPage;
