import React, { useEffect, useState } from "react";
import { db, auth } from "../../firebase";
import {
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  addDoc,
  setDoc, // 🔥 ADD THIS
  serverTimestamp,
} from "firebase/firestore";

import dayjs from "dayjs";

const categories = [
  "Martial Arts",
  "Team Ball Sports",
  "Racket Sports",
  "Fitness",
  "Target & Precision Sports",
  "Equestrian Sports",
  "Adventure & Outdoor Sports",
  "Ice Sports",
  "Wellness",
  "Dance",
];

const subCategoryMap = {
  "Martial Arts": [
    "Karate",
    "Taekwondo",
    "Boxing",
    "Wrestling",
    "Fencing",
    "Kendo",
  ],
  "Team Ball Sports": [
    "Football",
    "Hockey",
    "Basketball",
    "Handball",
    "Rugby",
    "American Football",
    "Water Polo",
    "Lacrosse",
  ],
  "Racket Sports": [
    "Tennis",
    "Badminton",
    "Pickleball",
    "Soft Tennis",
    "Padel Tennis",
    "Speedminton",
  ],
  Fitness: [
    "Strength / Muscular Fitness",
    "Muscular Endurance",
    "Flexibility Fitness",
    "Balance & Stability",
    "Skill / Performance Fitness",
  ],
  "Target & Precision Sports": [
    "Archery",
    "Shooting",
    "Darts",
    "Bowling",
    "Golf",
    "Billiards",
    "Bocce",
    "Lawn",
  ],
  "Equestrian Sports": [
    "Dressage",
    "Show Jumping",
    "Eventing",
    "Cross Country",
    "Endurance Riding",
    "Polo",
    "Horse Racing",
    "Para-Equestrian",
  ],
  "Adventure & Outdoor Sports": [
    "Rock Climbing",
    "Trekking",
    "Camping",
    "Kayaking",
    "Paragliding",
    "Surfing",
    "Mountain Biking",
    "Ziplining",
  ],
  "Ice Sports": [
    "Ice Skating",
    "Figure Skating",
    "Ice Hockey",
    "Speed Skating",
    "Short Track Skating",
    "Ice Dancing",
    "Curling",
    "Synchronized Skating",
  ],
  Wellness: [
    "Physical Wellness",
    "Mental Wellness",
    "Social Wellness",
    "Emotional Wellness",
    "Spiritual Wellness",
    "Lifestyle Wellness",
  ],
  Dance: [
    "Classical Dance",
    "Contemporary Dance",
    "Hip-Hop Dance",
    "Folk Dance",
    "Western Dance",
    "Latin Dance",
    "Fitness Dance",
    "Creative & Kids Dance",
  ],
};

export default function StudentPerformanceReport() {
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(dayjs().format("YYYY-MM"));
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubCategory, setSelectedSubCategory] = useState("");
  const [attendancePercent, setAttendancePercent] = useState(null);
  /* 🔽 AUTO-FILL EXISTING REPORT STATE */
  const [existingReportId, setExistingReportId] = useState(null);

  const [attendanceStats, setAttendanceStats] = useState({
    total: 0,
    present: 0,
  });

  const [metrics, setMetrics] = useState({
    attendance: "",
    focus: "",
    skill: "",
    coach: "",
    fitness: "",
    team: "",
    discipline: "",
  });

  const [metricObservations, setMetricObservations] = useState({
    focus: "",
    skill: "",
    coach: "",
    fitness: "",
    team: "",
    discipline: "",
  });

  /* 🔽 NEW STATE ONLY */
  const [showPhysicalFitness, setShowPhysicalFitness] = useState(false);

  /* 🔽 NEW STATE (LOGIC ONLY, NO UI CHANGE) */
  const [physicalFitness, setPhysicalFitness] = useState({
    speed: { value: "", observation: "" },
    strength: { value: "", observation: "" },
    flexibility: { value: "", observation: "" },
    stamina: { value: "", observation: "" },
    agility: { value: "", observation: "" },
  });

  useEffect(() => {
    console.log("[INIT] Component Mounted");
    fetchInstituteStudents();
  }, []);

  useEffect(() => {
    console.log("[MONTH CHANGE]", selectedMonth);
    filterByMonth();
  }, [selectedMonth, students]);

  useEffect(() => {
    console.log("[STUDENT SELECTED]", selectedStudent);
    if (selectedStudent) {
      fetchAttendance();
      fetchExistingPerformance(); // 🔥 new
    }
  }, [selectedStudent, selectedMonth]);

  const fetchInstituteStudents = async () => {
    try {
      const user = auth.currentUser;
      console.log("[AUTH USER]", user?.uid);
      if (!user) return;

      console.log("[FETCH MODE] instituteId based student fetch");

      const q = query(
        collection(db, "students"),
        where("instituteId", "==", user.uid),
      );

      const snap = await getDocs(q);

      console.log("[INSTITUTE STUDENTS COUNT]", snap.size);

      const list = [];
      snap.forEach((d) => {
        console.log("[STUDENT FOUND]", d.id, d.data());
        list.push({ id: d.id, ...d.data() });
      });

      console.log("[FINAL STUDENT LIST]", list);
      setStudents(list);
    } catch (err) {
      console.error("[ERROR fetchInstituteStudents]", err);
    }
  };

  const filterByMonth = () => {
    console.log("[FILTER BY MONTH] START");
    const month = dayjs(selectedMonth);
    const filtered = students.filter((s) => {
      if (!s.createdAt) {
        console.log("[NO CREATEDAT]", s.id);
        return false;
      }
      const joinDate = dayjs(s.createdAt.toDate());
      const valid =
        joinDate.isSame(month, "month") || joinDate.isBefore(month, "month");
      console.log("[MONTH FILTER]", s.id, joinDate.format(), valid);
      return valid;
    });
    console.log("[FILTERED STUDENTS]", filtered);
    setFilteredStudents(filtered);
  };

  const fetchAttendance = async () => {
    try {
      const user = auth.currentUser;
      if (!user || !selectedStudent) return;

      console.log("[FETCH ATTENDANCE] START");

      const start = dayjs(selectedMonth).startOf("month").format("YYYY-MM-DD");
      const end = dayjs(selectedMonth).endOf("month").format("YYYY-MM-DD");

      console.log("[MONTH RANGE]", start, "→", end);

      const colPath = `institutes/${user.uid}/attendance`;

      const snap = await getDocs(collection(db, colPath));

      const records = [];

      snap.forEach((d) => {
        const data = d.data();

        // 🔥 MATCHING NEW DATA STRUCTURE
        if (
          data.studentId === selectedStudent &&
          typeof data.date === "string" &&
          data.date >= start &&
          data.date <= end
        ) {
          records.push(data);
        }
      });

      console.log("[ATTENDANCE RECORDS]", records);

      if (records.length === 0) {
        console.log("[NO ATTENDANCE DATA]");
        setAttendancePercent(null);
        setAttendanceStats({ total: 0, present: 0 });
        setMetrics((prev) => ({ ...prev, attendance: "No Data" }));
        return;
      }

      let total = records.length;

      let present = records.filter(
        (r) => String(r.status).toLowerCase() === "present",
      ).length;

      const percent = ((present / total) * 100).toFixed(2);

      console.log("[ATTENDANCE CALC]", { total, present, percent });

      setAttendanceStats({ total, present });
      setAttendancePercent(percent);
      setMetrics((prev) => ({ ...prev, attendance: `${percent}%` }));
    } catch (err) {
      console.error("[ERROR fetchAttendance]", err);
    }
  };
  const fetchExistingPerformance = async () => {
    try {
      const user = auth.currentUser;
      if (!user || !selectedStudent || !selectedMonth) return;

      const monthKey = dayjs(selectedMonth).format("YYYY-MM");

      console.log("[CHECK EXISTING PERFORMANCE]", selectedStudent, monthKey);

      const q = query(
        collection(db, `institutes/${user.uid}/performancestudents`),
        where("studentId", "==", selectedStudent),
        where("month", "==", monthKey),
      );

      const snap = await getDocs(q);

      if (snap.empty) {
        console.log("[NO EXISTING REPORT]");
        setExistingReportId(null);
        return;
      }

      // Only one doc should exist (secure uniqueness)
      const docSnap = snap.docs[0];
      const data = docSnap.data();

      console.log("[EXISTING REPORT FOUND]", docSnap.id, data);

      setExistingReportId(docSnap.id);

      // 🔽 AUTO FILL
      setSelectedCategory(data.category || "");
      setSelectedSubCategory(data.subCategory || "");

      setAttendancePercent(data.attendance || null);
      setAttendanceStats(data.attendanceStats || { total: 0, present: 0 });

      setMetrics(
        data.metrics || {
          attendance: "",
          focus: "",
          skill: "",
          coach: "",
          fitness: "",
          team: "",
          discipline: "",
        },
      );
      if (data.metricObservations) {
        setMetricObservations({
          focus: data.metricObservations.focus || "",
          skill: data.metricObservations.skill || "",
          coach: data.metricObservations.coach || "",
          fitness: data.metricObservations.fitness || "",
          team: data.metricObservations.team || "",
          discipline: data.metricObservations.discipline || "",
        });
      }

      if (data.physicalFitness) {
        setPhysicalFitness({
          speed: data.physicalFitness.speed || { value: "", observation: "" },
          strength: data.physicalFitness.strength || {
            value: "",
            observation: "",
          },
          flexibility: data.physicalFitness.flexibility || {
            value: "",
            observation: "",
          },
          stamina: data.physicalFitness.stamina || {
            value: "",
            observation: "",
          },
          agility: data.physicalFitness.agility || {
            value: "",
            observation: "",
          },
        });
      }
    } catch (err) {
      console.error("[ERROR fetchExistingPerformance]", err);
    }
  };

  const handleSave = async () => {
    try {
      const user = auth.currentUser;
      if (!user || !selectedStudent) return;

      const monthKey = dayjs(selectedMonth).format("YYYY-MM");

      const savePath = `institutes/${user.uid}/performancestudents`;

      const payload = {
        studentId: selectedStudent,
        month: monthKey,
        category: selectedCategory,
        subCategory: selectedSubCategory,
        attendance: attendancePercent,
        attendanceStats,
        metrics,
        metricObservations,

        physicalFitness: {
          speed: physicalFitness.speed,
          strength: physicalFitness.strength,
          flexibility: physicalFitness.flexibility,
          stamina: physicalFitness.stamina,
          agility: physicalFitness.agility,
        },

        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      };

      if (existingReportId) {
        // 🔁 UPDATE MODE
        console.log("[UPDATE MODE]", existingReportId);

        await setDoc(doc(db, savePath, existingReportId), payload, {
          merge: true,
        });

        alert("Performance Report Updated Successfully ✅");
      } else {
        // ➕ CREATE MODE
        console.log("[CREATE MODE]");

        await addDoc(collection(db, savePath), {
          ...payload,
          createdAt: serverTimestamp(),
          createdBy: user.uid,
        });

        alert("Performance Report Saved Successfully ✅");
      }
    } catch (err) {
      console.error("[ERROR SAVE]", err);
    }
  };

  return (
    <div className="min-h-screen bg-white p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">
            Student <span className="text-orange-500">Performance</span> Report
          </h2>
          <p className="text-gray-500">
            Create comprehensive performance evaluations for students
          </p>
        </div>
        <select
          className="bg-orange-500 text-white px-4 py-2 rounded-lg w-full sm:w-auto"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
        >
          {Array.from({ length: 12 }).map((_, i) => {
            const m = dayjs().month(i).format("YYYY-MM");
            return (
              <option key={i} value={m}>
                {dayjs(m).format("MMMM YYYY")}
              </option>
            );
          })}
        </select>
      </div>

      {/* FILTERS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mt-6">
        <select
          className="border border-orange-300 rounded-lg p-3 w-full"
          value={selectedStudent}
          onChange={(e) => setSelectedStudent(e.target.value)}
        >
          <option value="">Select Student Name*</option>
          {filteredStudents.map((s) => (
            <option key={s.id} value={s.id}>
              {s.firstName} {s.lastName}
            </option>
          ))}
        </select>

        <select
          className="border border-orange-300 rounded-lg p-3"
          value={selectedCategory}
          onChange={(e) => {
            setSelectedCategory(e.target.value);
            setSelectedSubCategory("");
          }}
        >
          <option value="">Select Category*</option>
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>

        <select
          className="border border-orange-300 rounded-lg p-3"
          value={selectedSubCategory}
          onChange={(e) => setSelectedSubCategory(e.target.value)}
        >
          <option value="">Select Sub Category*</option>
          {(subCategoryMap[selectedCategory] || []).map((sc) => (
            <option key={sc}>{sc}</option>
          ))}
        </select>

        <select className="border border-orange-300 rounded-lg p-3">
          <option value="">Select Age</option>
          <option>01 – 10 years Kids</option>
          <option>11 – 20 years Teenage</option>
          <option>21 – 45 years Adults</option>
          <option>45 – 60 years Middle Age</option>
          <option>61 – 100 years Senior Citizens</option>
        </select>
        <select className="border border-orange-300 rounded-lg p-3">
          <option value="">Select Belt</option>
          <option>White</option>
          <option>Yellow</option>
          <option>Orange</option>
          <option>Blue</option>
          <option>Brown</option>
          <option>Black</option>
          <option>Green</option>
        </select>
      </div>

      {/* GENERAL METRICS */}
      <div className="mt-8">
        <h3 className="font-semibold text-lg mb-3">General Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {/* Attendance Auto */}
          <div className="border border-orange-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-orange-500">Attendance</p>
            <input
              className="w-full mt-2 p-2 border border-orange-300 rounded-lg bg-gray-100"
              value={metrics.attendance}
              readOnly
            />
            <p className="text-xs text-gray-500 mt-1">
              {attendanceStats.total > 0
                ? `${attendanceStats.present}/${attendanceStats.total} classes`
                : "No Data"}
            </p>
          </div>

          {["focus", "skill", "coach", "fitness", "team", "discipline"].map(
            (key, i) => (
              <div
                key={i}
                className="border border-orange-200 rounded-xl p-4 flex flex-col"
              >
                <p className="text-sm font-semibold text-orange-500">
                  {key.toUpperCase()}
                </p>
                <input
                  className="w-full mt-2 p-2 border border-orange-300 rounded-lg"
                  placeholder="Score Rating (Eg : 8/10)"
                  value={metrics[key]}
                  onChange={(e) =>
                    setMetrics({ ...metrics, [key]: e.target.value })
                  }
                />
                <input
                  className="w-full mt-2 p-2 border border-orange-300 rounded-lg"
                  placeholder="Add Observation"
                  value={metricObservations[key]}
                  onChange={(e) =>
                    setMetricObservations({
                      ...metricObservations,
                      [key]: e.target.value,
                    })
                  }
                />
              </div>
            ),
          )}
        </div>
      </div>

      {/* PHYSICAL FITNESS */}
      <div className="mt-6">
        <div
          onClick={() => setShowPhysicalFitness(!showPhysicalFitness)}
          className="bg-slate-800 text-white px-4 py-3 rounded-lg font-semibold flex items-center justify-between"
        >
          <span>Physical Fitness</span>
          <span className="text-lg flex items-center">
            {showPhysicalFitness ? "▲" : "▼"}
          </span>
        </div>

        {showPhysicalFitness && (
          <div className="mt-4 space-y-4">
            {["Speed", "Strength", "Flexibility", "Stamina", "Agility"].map(
              (item, i) => (
                <div
                  key={i}
                  className="border border-orange-200 rounded-xl p-4 bg-orange-50"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <p className="font-semibold text-orange-500">{item}</p>
                      <p className="text-xs text-gray-500">
                        Rate 1-10 or add custom value
                      </p>
                    </div>

                    <div>
                      <p className="text-sm font-semibold">Measured Value</p>
                      <input
                        className="w-full mt-2 p-2 border border-orange-300 rounded-lg bg-white"
                        placeholder="Value"
                        value={physicalFitness[item.toLowerCase()]?.value || ""}
                        onChange={(e) =>
                          setPhysicalFitness((prev) => ({
                            ...prev,
                            [item.toLowerCase()]: {
                              ...prev[item.toLowerCase()],
                              value: e.target.value,
                            },
                          }))
                        }
                      />
                      ...
                      <input
                        className="w-full mt-2 p-2 border border-orange-300 rounded-lg bg-white"
                        placeholder="Observation"
                        value={
                          physicalFitness[item.toLowerCase()]?.observation || ""
                        }
                        onChange={(e) =>
                          setPhysicalFitness((prev) => ({
                            ...prev,
                            [item.toLowerCase()]: {
                              ...prev[item.toLowerCase()],
                              observation: e.target.value,
                            },
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>
              ),
            )}
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div className="flex flex-col sm:flex-row justify-end gap-4 mt-10">
        <button className="text-orange-500 font-semibold">Back</button>
        <button
          onClick={handleSave}
          className="bg-orange-500 text-white px-6 py-2 rounded-lg font-semibold w-full sm:w-auto"
        >
          Save
        </button>
      </div>
    </div>
  );
}
