import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

const ADMIN_EMAIL = "ceo@kdastshofintechsolutions.com";

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [institutes, setInstitutes] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [users, setUsers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [helpRequests, setHelpRequests] = useState([]);

  const [showHelp, setShowHelp] = useState(false);

  const [stats, setStats] = useState({
    institutes: 0,
    trainers: 0,
    users: 0,
    students: 0,
    reels: 0,
    pending: 0,
  });

  useEffect(() => {
    if (!user) return;

    if (user.email !== ADMIN_EMAIL) {
      navigate("/");
      return;
    }

    loadData();
  }, [user]);

  const loadData = async () => {
    const instituteSnap = await getDocs(collection(db, "institutes"));
    const trainerSnap = await getDocs(collection(db, "trainers"));
    const userSnap = await getDocs(collection(db, "users"));
    const planSnap = await getDocs(collection(db, "plans"));
    const helpSnap = await getDocs(collection(db, "helpcenter"));

    let instituteList = [];
    let trainerList = [];
    let userList = [];
    let planList = [];
    let helpList = [];

    let totalStudents = 0;
    let totalReels = 0;
    let pending = 0;

    instituteSnap.forEach((doc) => {
      const data = doc.data();
      instituteList.push({ id: doc.id, ...data });

      totalStudents += Array.isArray(data.students) ? data.students.length : 0;
      totalReels += Array.isArray(data.reels) ? data.reels.length : 0;

      if (data.status === "pending") pending++;
    });

    trainerSnap.forEach((doc) => {
      const data = doc.data();
      trainerList.push({ id: doc.id, ...data });

      totalStudents += Array.isArray(data.students) ? data.students.length : 0;
      totalReels += Array.isArray(data.reels) ? data.reels.length : 0;

      if (data.status === "pending") pending++;
    });

    userSnap.forEach((doc) => {
      userList.push({ id: doc.id, ...doc.data() });
    });

    planSnap.forEach((doc) => {
      planList.push({ id: doc.id, ...doc.data() });
    });

    helpSnap.forEach((doc) => {
      helpList.push({ id: doc.id, ...doc.data() });
    });

    setInstitutes(instituteList);
    setTrainers(trainerList);
    setUsers(userList);
    setPlans(planList);
    setHelpRequests(helpList);

    setStats({
      institutes: instituteList.length,
      trainers: trainerList.length,
      users: userList.length,
      students: totalStudents,
      reels: totalReels,
      pending,
    });
  };

  const getPlan = (id) => plans.find((p) => p.id === id);

  const getUserRole = (uid) => {
    if (institutes.find((i) => i.id === uid)) return "Institute";
    if (trainers.find((t) => t.id === uid)) return "Trainer";
    if (users.find((u) => u.id === uid)) return "User";
    return "-";
  };

  const resolveTicket = async (id) => {
    await updateDoc(doc(db, "helpcenter", id), {
      status: "Resolved",
      resolvedOn: serverTimestamp(),
    });

    loadData();
  };

  const pendingTickets = helpRequests.filter(
    (h) => h.status === "Pending",
  ).length;

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Platform Admin Dashboard</h1>

        <button
          onClick={() => setShowHelp(!showHelp)}
          className="relative bg-red-500 text-white px-4 py-2 rounded"
        >
          Help Requests
          {pendingTickets > 0 && (
            <span className="absolute -top-2 -right-2 bg-black text-white text-xs px-2 py-1 rounded-full">
              {pendingTickets}
            </span>
          )}
        </button>
      </div>

      {showHelp ? (
        <Section title="Help Requests">
          <Table
            headers={[
              "Ticket",
              "Name",
              "Role",
              "Email",
              "Phone",
              "Issue",
              "Reported",
              "Status",
              "Action",
            ]}
            rows={helpRequests.map((h) => [
              h.ticketId,
              h.fullName,
              getUserRole(h.uid),
              h.email,
              h.contactNumber,
              h.issue,
              h.reportedOn?.toDate().toLocaleString(),
              h.status,
              h.status === "Pending" ? (
                <button
                  onClick={() => resolveTicket(h.id)}
                  className="bg-green-500 text-white px-3 py-1 rounded"
                >
                  Resolve
                </button>
              ) : (
                "Resolved"
              ),
            ])}
          />
        </Section>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            <Card title="Institutes" value={stats.institutes} />
            <Card title="Trainers" value={stats.trainers} />
            <Card title="Users" value={stats.users} />
            <Card title="Students" value={stats.students} />
            <Card title="Reels" value={stats.reels} />
            <Card title="Pending" value={stats.pending} />
          </div>

          <Section title="Institutes">
            <Table
              headers={[
                "Institute",
                "Category",
                "City",
                "Students",
                "Trainers",
                "Rating",
                "Plan",
                "Status",
                "Start",
                "End",
                "Amount",
              ]}
              rows={institutes.map((i) => {
                const plan = getPlan(i.id);

                return [
                  i.instituteName,
                  i.category,
                  i.city,
                  i.students?.length || 0,
                  i.trainers?.length || 0,
                  i.rating || 0,
                  plan?.currentPlan?.planType || "-",
                  plan?.currentPlan?.status || "-",
                  plan?.currentPlan?.startDate?.toDate().toLocaleDateString() ||
                    "-",
                  plan?.currentPlan?.endDate?.toDate().toLocaleDateString() ||
                    "-",
                  plan?.currentPlan?.payment?.amount
                    ? "₹" + plan.currentPlan.payment.amount
                    : "Free",
                ];
              })}
            />
          </Section>

          <Section title="Trainers">
            <Table
              headers={[
                "Trainer",
                "Category",
                "Experience",
                "Students",
                "Plan",
                "Status",
                "Start",
                "End",
                "Amount",
              ]}
              rows={trainers.map((t) => {
                const plan = getPlan(t.id);

                return [
                  t.firstName,
                  t.category,
                  t.experience || t.yearsExperience,
                  t.students?.length || 0,
                  plan?.currentPlan?.planType || "-",
                  plan?.currentPlan?.status || "-",
                  plan?.currentPlan?.startDate?.toDate().toLocaleDateString() ||
                    "-",
                  plan?.currentPlan?.endDate?.toDate().toLocaleDateString() ||
                    "-",
                  plan?.currentPlan?.payment?.amount
                    ? "₹" + plan.currentPlan.payment.amount
                    : "Free",
                ];
              })}
            />
          </Section>

          <Section title="Users">
            <Table
              headers={["Name", "Email", "Created"]}
              rows={users.map((u) => [
                u.name,
                u.emailOrPhone,
                u.createdAt?.toDate().toLocaleDateString(),
              ])}
            />
          </Section>
        </>
      )}
    </div>
  );
};

const Card = ({ title, value }) => (
  <div className="bg-white rounded-xl shadow p-4 text-center">
    <p className="text-gray-500 text-sm">{title}</p>
    <h2 className="text-2xl font-bold mt-1">{value}</h2>
  </div>
);

const Section = ({ title, children }) => (
  <div className="bg-white rounded-xl shadow p-6 mb-8">
    <h2 className="text-xl font-bold mb-4">{title}</h2>
    {children}
  </div>
);

const Table = ({ headers, rows }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-sm">
      <thead className="bg-gray-200">
        <tr>
          {headers.map((h, i) => (
            <th key={i} className="p-3 text-left">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className="border-b">
            {row.map((cell, j) => (
              <td key={j} className="p-3">
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default AdminDashboard;
