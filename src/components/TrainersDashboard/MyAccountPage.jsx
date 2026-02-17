import React, { useEffect, useState } from "react";
import { db } from "../../firebase";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  query,
  where,
} from "firebase/firestore";

import { serverTimestamp } from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";
import { User, Users, ImageUp } from "lucide-react";
import { useNavigate } from "react-router-dom";

const MyAccountPage = ({ setActiveMenu }) => {
  const { user } = useAuth();

  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("edit");

  const [profile, setProfile] = useState({
    fullName: "",
    email: "",
    phone: "",
    bio: "",
    profileImage: "", // ✅ added
  });

  const [media, setMedia] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [editingTrainer, setEditingTrainer] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showTrainerDeleteModal, setShowTrainerDeleteModal] = useState(false);
  const [trainerToDelete, setTrainerToDelete] = useState(null);
  const [deleteReason, setDeleteReason] = useState("");

  const [activeCount, setActiveCount] = useState(0);
  const [leftCount, setLeftCount] = useState(0);
  const [newCount, setNewCount] = useState(0);

  /* ================= CUSTOMERS STATE ================= */
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [statusFilter, setStatusFilter] = useState("All");
  const [searchText, setSearchText] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [leaveReason, setLeaveReason] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");
  const [showUploadTypeModal, setShowUploadTypeModal] = useState(false);
  const [selectedUploadType, setSelectedUploadType] = useState("");
  const [pendingFile, setPendingFile] = useState(null);

  /* ================= FETCH PROFILE ================= */
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.uid) return;

      const ref = doc(db, "trainers", user.uid);

      const snap = await getDoc(ref);

      if (snap.exists()) {
        const data = snap.data();

        setProfile({
          fullName: `${data.firstName || ""} ${data.lastName || ""}`.trim(),
          email: data.email || "",
          phone: data.phoneNumber || "",
          bio: data.experience || "",
          profileImage: data.profileImageUrl || "",
        });
      }
    };

    fetchProfile();
  }, [user]);

  /* ================= FETCH MEDIA ================= */
  useEffect(() => {
    const fetchMedia = async () => {
      if (!user?.uid) return;

      const snap = await getDocs(collection(db, "trainers", user.uid, "media"));
      setMedia(snap.docs.map((d) => d.data().image));
    };

    fetchMedia();
  }, [user]);
  useEffect(() => {
    if (activeTab !== "management" || !user?.uid) return;

    const fetchTrainers = async () => {
      const q = query(
        collection(db, "trainers"),
        where("role", "==", "trainer"),
      );

      const snap = await getDocs(q);

      const list = snap.docs
        .map((d) => ({
          id: d.id,
          ...d.data(),
        }))
        .filter((t) => t.status !== "Left");

      setTrainers(list);
    };

    fetchTrainers();
  }, [activeTab, user]);

  /* ================= FETCH STUDENTS ================= */
  useEffect(() => {
    if (activeTab !== "customers" || !user?.uid) return;
    const fetchLeftTrainers = async () => {
      const q = query(
        collection(db, "trainerstudents"),
        where("trainerId", "==", user.uid),
        where("status", "==", "Left"),
      );

      const snap = await getDocs(q);

      const leftList = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      console.log("Left Trainers:", leftList); // check in console
    };

    const fetchStudents = async () => {
      const q = query(
        collection(db, "trainerstudents"),
        where("trainerId", "==", user.uid),
      );

      const snap = await getDocs(q);

      const list = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        status: d.data().status || "Active", // default Active
      }));

      setStudents(list);
      setFilteredStudents(list);
    };

    fetchStudents();
  }, [activeTab, user]);

  const uploadToCloudinary = async (file, type) => {
    setUploading(true);
    setUploadMsg("");

    const data = new FormData();
    data.append("file", file);
    data.append("upload_preset", "kridana_upload");

    try {
      const res = await fetch(
        `https://api.cloudinary.com/v1_1/daiyvial8/${type}/upload`,
        {
          method: "POST",
          body: data,
        },
      );

      const result = await res.json();

      if (!result.secure_url) {
        throw new Error(result.error?.message || "Cloudinary upload failed");
      }

      setUploadMsg("✅ Upload Successful!");
      return result.secure_url;
    } catch (err) {
      console.error("Cloudinary Upload Error:", err);
      alert("Upload Failed: " + err.message);
      return "";
    } finally {
      setUploading(false);
      setTimeout(() => setUploadMsg(""), 3000);
    }
  };

  /* ================= FILTER STUDENTS ================= */
  useEffect(() => {
    let data = [...students];

    if (statusFilter !== "All") {
      data = data.filter((s) => s.status === statusFilter);
    }

    if (searchText) {
      data = data.filter((s) =>
        `${s.firstName} ${s.lastName}`
          .toLowerCase()
          .includes(searchText.toLowerCase()),
      );
    }

    setFilteredStudents(data);
  }, [searchText, statusFilter, students]);
  /* ================= UPDATE COUNTS INSTANTLY ================= */
  useEffect(() => {
    const active = students.filter((s) => s.status === "Active").length;
    const left = students.filter((s) => s.status === "Left").length;

    const now = new Date();
    const last30Days = students.filter((s) => {
      if (!s.createdAt) return false;
      const created = s.createdAt.toDate();
      const diff = (now - created) / (1000 * 60 * 60 * 24);
      return diff <= 30;
    }).length;

    setActiveCount(active);
    setLeftCount(left);
    setNewCount(last30Days);
  }, [students]);

  /* ================= HANDLE INPUT ================= */
  const handleChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  /* ================= SAVE PROFILE ================= */
  const handleSave = async () => {
    await setDoc(doc(db, "trainers", user.uid), profile, { merge: true });

    alert("Profile Saved ✅");
  };

  /* ================= UPLOAD PROFILE IMAGE ================= */
  const handleProfileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result;

      const updatedProfile = { ...profile, profileImage: base64 };
      setProfile(updatedProfile);

      await setDoc(doc(db, "trainers", user.uid), updatedProfile, {
        merge: true,
      });
    };

    reader.readAsDataURL(file);
  };

  /* ================= UPLOAD MEDIA ================= */
  const handleUpload = async () => {
    if (!pendingFile || !selectedUploadType || !user?.uid) return;

    const cloudType = selectedUploadType === "image" ? "image" : "video";

    const url = await uploadToCloudinary(pendingFile, cloudType);
    if (!url) return;

    const instituteRef = doc(db, "trainers", user.uid);

    const snap = await getDoc(instituteRef);
    if (!snap.exists()) return;

    const data = snap.data() || {};

    let updateData = {};

    if (selectedUploadType === "image") {
      updateData = {
        images: [...(data.images || []), url],
        updatedAt: serverTimestamp(),
      };
    }

    if (selectedUploadType === "video") {
      updateData = {
        videos: [...(data.videos || []), url],
        updatedAt: serverTimestamp(),
      };
    }

    if (selectedUploadType === "reel") {
      updateData = {
        reels: [...(data.reels || []), url],
        updatedAt: serverTimestamp(),
      };
    }

    await updateDoc(instituteRef, updateData);

    setMedia((prev) => [...prev, url]); // preview
    setPendingFile(null);
    setSelectedUploadType("");
    setShowUploadTypeModal(false);
  };

  const confirmDeleteTrainer = async () => {
    if (!trainerToDelete || !deleteReason.trim()) {
      alert("Please enter reason");
      return;
    }

    try {
      await updateDoc(doc(db, "trainerstudents", trainerToDelete.id), {
        status: "Left",
        leftReason: deleteReason,
        leftDate: serverTimestamp(),
      });

      // Remove from UI immediately
      setTrainers((prev) => prev.filter((t) => t.id !== trainerToDelete.id));

      setDeleteReason("");
      setTrainerToDelete(null);
      setShowTrainerDeleteModal(false);
    } catch (error) {
      console.error("Error updating trainer:", error);
    }
  };

  const handleEditTrainer = (trainer) => {
    setEditingTrainer(trainer);
    setShowEditModal(true);
  };

  const handleUpdateTrainer = async () => {
    await updateDoc(
      doc(db, "trainerstudents", editingTrainer.id),
      editingTrainer,
    );

    setTrainers((prev) =>
      prev.map((t) => (t.id === editingTrainer.id ? editingTrainer : t)),
    );

    setShowEditModal(false);
  };
  const markStudentLeft = async () => {
    if (!selectedStudent) return;

    await updateDoc(doc(db, "trainerstudents", selectedStudent.id), {
      status: "Left",
      leftReason: leaveReason,
      leftDate: serverTimestamp(),
    });

    setStudents((prev) =>
      prev.map((s) =>
        s.id === selectedStudent.id
          ? {
              ...s,
              status: "Left",
              leftReason: leaveReason,
              leftDate: serverTimestamp(),
            }
          : s,
      ),
    );

    setLeaveReason("");
    setShowDeleteModal(false);
    setSelectedStudent(null);
  };
  const permanentlyDeleteStudent = async (student) => {
    if (!window.confirm("Permanently delete this customer?")) return;

    await deleteDoc(doc(db, "trainerstudents", student.id));

    setStudents((prev) => prev.filter((s) => s.id !== student.id));
  };

  const handleDeleteStudent = async (id) => {
    if (!window.confirm("Mark this customer as Left?")) return;

    await updateDoc(doc(db, "trainerstudents", id), {
      status: "Left",
      leftDate: serverTimestamp(),
    });

    setStudents((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, status: "Left", leftDate: serverTimestamp() } : s,
      ),
    );
  };
  const markAsLeftConfirm = async (student) => {
    const reason = prompt("Enter reason for marking as Left:");
    if (!reason) return;

    await updateDoc(doc(db, "trainerstudents", student.id), {
      status: "Left",
      leftReason: reason,
      leftDate: serverTimestamp(),
    });

    setStudents((prev) =>
      prev.map((s) =>
        s.id === student.id
          ? {
              ...s,
              status: "Left",
              leftReason: reason,
              leftDate: serverTimestamp(),
            }
          : s,
      ),
    );
  };

  return (
    <div className="px-4 sm:px-6 md:px-8 lg:px-10 py-6 bg-[#FAFAFA] min-h-screen">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-black">My Account</h1>
          <p className="text-orange-500 text-sm">
            Manage your profile, team, and customers
          </p>
        </div>

        {/* Change Profile Circle */}
        <div className="flex flex-col items-center">
          <label className="cursor-pointer">
            <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-300">
              {profile.profileImage && (
                <img
                  src={profile.profileImage}
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <input type="file" hidden onChange={handleProfileUpload} />
          </label>
          <span className="text-xs mt-1 text-gray-600">Change Profile</span>
        </div>
      </div>

      {/* TABS */}
      <div className="flex flex-wrap gap-4 sm:gap-8 border-b pb-2 mb-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab("edit")}
          className={`flex items-center gap-2 pb-2 border-b-2 ${
            activeTab === "edit"
              ? "text-orange-500 border-orange-500 font-semibold"
              : "text-gray-600 border-transparent"
          }`}
        >
          <User size={18} /> Edit Profile
        </button>

        <button
          onClick={() => setActiveTab("customers")}
          className={`flex items-center gap-2 pb-2 border-b-2 ${
            activeTab === "customers"
              ? "text-orange-500 border-orange-500 font-semibold"
              : "text-gray-600 border-transparent"
          }`}
        >
          <Users size={18} /> Customers
        </button>
      </div>

      {/* PROFILE CARD */}
      {activeTab === "edit" && (
        <div className="bg-white border rounded-lg p-6 shadow-sm">
          <h2 className="text-orange-500 font-semibold mb-4 text-[15px]">
            Profile Information
          </h2>

          <div className="space-y-5">
            {/* Full Name */}
            <div>
              <label className="block text-sm text-gray-700 mb-1">
                Full Name
              </label>
              <input
                name="fullName"
                value={profile.fullName}
                onChange={handleChange}
                className="w-full bg-[#F3F4F6] border border-gray-300 rounded px-3 py-2
focus:outline-none focus:border-orange-300"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm text-gray-700 mb-1">
                E - Mail Id
              </label>
              <input
                name="email"
                value={profile.email}
                onChange={handleChange}
                className="w-full bg-[#F3F4F6] border border-gray-300 rounded px-3 py-2
focus:outline-none focus:border-orange-300"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                name="phone"
                value={profile.phone}
                onChange={handleChange}
                className="w-full bg-[#F3F4F6] border border-gray-300 rounded px-3 py-2
focus:outline-none focus:border-orange-300"
              />
            </div>

            {/* Bio */}
            <div>
              <label className="block text-sm text-gray-700 mb-1">Bio</label>
              <textarea
                name="bio"
                value={profile.bio}
                onChange={handleChange}
                className="w-full bg-[#F3F4F6] border border-gray-300 rounded px-3 py-2 h-28 resize-none
focus:outline-none focus:border-orange-300"
              />
            </div>

            {/* Save Button */}
            <button
              onClick={handleSave}
              className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2 rounded"
            >
              Save Changes
            </button>
          </div>
          {/* MEDIA GALLERY */}
          <div className="bg-white border rounded-lg p-6 mt-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-orange-500 font-semibold">Media Gallery</h2>

              <label className="bg-orange-500 text-white px-4 py-2 rounded flex items-center gap-2 cursor-pointer">
                <ImageUp size={18} /> Upload Media
                <input
                  type="file"
                  hidden
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    setPendingFile(file);
                    setShowUploadTypeModal(true);
                  }}
                />
              </label>
            </div>

            <div className="flex gap-4 flex-wrap">
              {media.map((img, i) => (
                <img
                  key={i}
                  src={img}
                  className="w-full sm:w-56 h-40 sm:h-32 object-cover rounded-md"
                />
              ))}
            </div>
            {/* MANAGEMENT TAB */}
          </div>
        </div>
      )}
      {/* MANAGEMENT TAB */}

      {/* EDIT TRAINER MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-[95%] sm:w-[700px] rounded-2xl shadow-xl overflow-hidden">
            <div className="max-h-[75vh] overflow-y-auto">
              {/* HEADER */}
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <h2 className="text-xl font-semibold text-gray-800">
                  Edit Management Details
                </h2>

                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-400 hover:text-red-500 text-xl"
                >
                  ✖
                </button>
              </div>

              {/* FORM */}
              <div className="p-5 space-y-5">
                <div className="grid grid-cols-2 gap-6">
                  {/* Name */}
                  <div>
                    <label className="text-sm font-medium">Name*</label>
                    <input
                      value={editingTrainer.firstName}
                      onChange={(e) =>
                        setEditingTrainer({
                          ...editingTrainer,
                          firstName: e.target.value,
                        })
                      }
                      className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
                    />
                  </div>

                  {/* Role */}
                  <div>
                    <label className="text-sm font-medium">Role*</label>
                    <input
                      value={editingTrainer.designation}
                      onChange={(e) =>
                        setEditingTrainer({
                          ...editingTrainer,
                          designation: e.target.value,
                        })
                      }
                      className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="text-sm font-medium">E - Mail*</label>
                    <input
                      value={editingTrainer.email || ""}
                      onChange={(e) =>
                        setEditingTrainer({
                          ...editingTrainer,
                          email: e.target.value,
                        })
                      }
                      className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="text-sm font-medium">Phone Number*</label>
                    <input
                      value={editingTrainer.phone}
                      onChange={(e) =>
                        setEditingTrainer({
                          ...editingTrainer,
                          phone: e.target.value,
                        })
                      }
                      className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
                    />
                  </div>

                  {/* Bio */}
                  <div className="col-span-2">
                    <label className="text-sm font-medium">Bio*</label>
                    <textarea
                      value={editingTrainer.experience}
                      onChange={(e) =>
                        setEditingTrainer({
                          ...editingTrainer,
                          experience: e.target.value,
                        })
                      }
                      className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
                    />
                  </div>

                  {/* Joined Date */}
                  <div>
                    <label className="text-sm font-medium">Joined Date*</label>
                    <input
                      type="date"
                      value={editingTrainer.joinedDate || ""}
                      onChange={(e) =>
                        setEditingTrainer({
                          ...editingTrainer,
                          joinedDate: e.target.value,
                        })
                      }
                      className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
                    />
                  </div>
                </div>

                {/* ACHIEVEMENTS */}
                <div className="border-t pt-6">
                  <h3 className="text-xl font-semibold mb-4">Achievements</h3>

                  {(editingTrainer.achievements || []).map((a, index) => (
                    <div key={index} className="flex items-center gap-3 mb-3">
                      <input
                        value={a}
                        onChange={(e) => {
                          const updated = [...editingTrainer.achievements];
                          updated[index] = e.target.value;
                          setEditingTrainer({
                            ...editingTrainer,
                            achievements: updated,
                          });
                        }}
                        className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
                      />

                      <button
                        onClick={() => {
                          const updated = editingTrainer.achievements.filter(
                            (_, i) => i !== index,
                          );
                          setEditingTrainer({
                            ...editingTrainer,
                            achievements: updated,
                          });
                        }}
                        className="text-red-500"
                      >
                        🗑️
                      </button>
                    </div>
                  ))}

                  <button
                    onClick={() =>
                      setEditingTrainer({
                        ...editingTrainer,
                        achievements: [
                          ...(editingTrainer.achievements || []),
                          "",
                        ],
                      })
                    }
                    className="w-full bg-orange-500 text-white py-3 rounded-md mt-3"
                  >
                    + Add Achievements
                  </button>
                </div>
              </div>

              {/* FOOTER */}
              <div className="flex justify-end gap-4 px-6 py-4 border-t">
                <button onClick={() => setShowEditModal(false)}>Cancel</button>

                <button
                  onClick={handleUpdateTrainer}
                  className="bg-orange-500 text-white px-6 py-2 rounded-md"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showTrainerDeleteModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-[90%] sm:w-[400px] rounded-2xl shadow-xl p-6">
            <h2 className="text-center font-semibold text-lg mb-4">
              Please Provide the reason for deleting the details
            </h2>

            <label className="text-sm text-gray-600">Enter your Reason</label>

            <input
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 mt-2 mb-6"
            />

            <div className="flex justify-center gap-4">
              <button
                onClick={() => {
                  setShowTrainerDeleteModal(false);
                  setDeleteReason("");
                  setTrainerToDelete(null);
                }}
                className="bg-gray-300 px-6 py-2 rounded-md"
              >
                Cancel
              </button>

              <button
                onClick={confirmDeleteTrainer}
                className="bg-red-500 text-white px-6 py-2 rounded-md"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === "customers" && (
        <div className="bg-white border rounded-lg p-6 shadow-sm">
          {/* ===== SUMMARY CARDS ===== */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            <div className="border border-orange-200 rounded-lg p-4 bg-[#FFFDF9]">
              <p className="text-sm text-gray-500">Active Customers</p>
              <div className="flex justify-between items-center mt-2">
                <span className="text-orange-500 text-lg font-semibold">
                  {activeCount}
                </span>
                <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center">
                  ↗
                </div>
              </div>
            </div>

            <div className="border border-orange-200 rounded-lg p-4 bg-[#FFFDF9]">
              <p className="text-sm text-gray-500">Left Customers</p>
              <div className="flex justify-between items-center mt-2">
                <span className="text-orange-500 text-lg font-semibold">
                  {leftCount}
                </span>
                <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center">
                  ↘
                </div>
              </div>
            </div>

            <div className="border border-orange-200 rounded-lg p-4 bg-[#FFFDF9]">
              <p className="text-sm text-gray-500">New (30 days)</p>
              <div className="flex justify-between items-center mt-2">
                <span className="text-orange-500 text-lg font-semibold">
                  {newCount}
                </span>
                <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center">
                  ●
                </div>
              </div>
            </div>
          </div>

          {/* HEADER */}
          {/* HEADER */}
          <div className="flex justify-between items-start mb-5">
            <div>
              <h2 className="text-orange-500 text-lg font-semibold">
                Customer Management
              </h2>
              <p className="text-sm text-gray-500">
                Track and manage your students
              </p>
            </div>

            <button
              onClick={() => setActiveMenu("Add Students Details")}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md font-medium"
            >
              + Add Customer
            </button>
          </div>

          {/* SEARCH + FILTER ROW */}
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-4">
            {/* SEARCH BOX */}
            <div className="relative w-full md:w-[320px]">
              <input
                type="text"
                placeholder="Search Customers..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-orange-300 rounded-md
      focus:outline-none focus:border-orange-400 bg-white"
              />

              {/* SEARCH ICON */}
              <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
            </div>

            {/* FILTER BUTTONS */}
            <div className="flex gap-2">
              {["All", "Active", "Left"].map((item) => (
                <button
                  key={item}
                  onClick={() => setStatusFilter(item)}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition
        ${
          statusFilter === item
            ? "bg-orange-500 text-white"
            : "bg-gray-200 text-gray-700"
        }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {/* TABLE */}
          <div className="overflow-x-auto rounded-lg border">
            {/* TABLE HEADER */}
            <div
              className={`grid ${
                statusFilter === "Left"
                  ? "grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr_1fr_100px]"
                  : "grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr_100px]"
              } bg-[#E9B489] text-black font-medium px-6 py-3 items-center`}
            >
              <p>Name</p>
              <p>Age</p>
              <p>Belt</p>
              <p>Status</p>
              {statusFilter === "Left" && <p>Reason</p>}
              <p>Added Date</p>
              <p>Left Date</p>
              <p className="text-center">Action</p>
            </div>

            {/* TABLE BODY */}
            {filteredStudents.map((student) => (
              <div
                key={student.id}
                className={`grid ${
                  statusFilter === "Left"
                    ? "grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr_1fr_100px]"
                    : "grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr_100px]"
                } px-6 py-4 items-center border-t`}
              >
                <p>{student.firstName}</p>
                <p className="whitespace-pre-line">
                  {student.age
                    ?.replace(" years", "") // 👈 removes years
                    .replace(" Adults", "\nAdults")
                    .replace(" Teenage", "\nTeenage")}
                </p>
                <p>{student.belt}</p>

                {/* STATUS BADGE */}
                <p>
                  <span
                    className={`px-3 py-1 rounded-full text-sm ${
                      student.status === "Left"
                        ? "bg-red-400 text-white"
                        : "bg-green-400 text-black"
                    }`}
                  >
                    {student.status}
                  </span>
                </p>
                {statusFilter === "Left" && (
                  <p className="text-sm text-gray-600">
                    {student.leftReason || "-"}
                  </p>
                )}

                <p>
                  {student.createdAt?.toDate?.().toLocaleDateString?.() || "-"}
                </p>

                <p>
                  {student.leftDate?.toDate
                    ? student.leftDate.toDate().toLocaleDateString()
                    : "-"}
                </p>

                {/* ACTION BUTTON */}
                <div className="flex items-center justify-center h-full">
                  {statusFilter === "Left" ? (
                    <button
                      onClick={() => permanentlyDeleteStudent(student)}
                      className="w-8 h-8 flex items-center justify-center mx-auto"
                      title="Delete Permanently"
                    >
                      <img
                        src="/delete-icon.png"
                        alt="Delete"
                        className="w-5 h-5 object-contain"
                      />
                    </button>
                  ) : (
                    <button
                      onClick={() => markAsLeftConfirm(student)}
                      className="w-8 h-8 flex items-center justify-center"
                      title="Mark as Left"
                    >
                      <img
                        src="/delete-icon.png"
                        alt="Mark as Left"
                        className="w-5 h-5 object-contain"
                      />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* ================= UPLOAD TYPE MODAL ================= */}
      {showUploadTypeModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-[90%] sm:w-[360px] rounded-xl p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-center mb-4">
              Select Media Type
            </h3>

            <div className="grid grid-cols-3 gap-3 mb-5">
              <button
                onClick={() => setSelectedUploadType("image")}
                className={`py-2 rounded border ${
                  selectedUploadType === "image"
                    ? "bg-orange-500 text-white"
                    : "bg-gray-100"
                }`}
              >
                Image
              </button>

              <button
                onClick={() => setSelectedUploadType("video")}
                className={`py-2 rounded border ${
                  selectedUploadType === "video"
                    ? "bg-orange-500 text-white"
                    : "bg-gray-100"
                }`}
              >
                Video
              </button>

              <button
                onClick={() => setSelectedUploadType("reel")}
                className={`py-2 rounded border ${
                  selectedUploadType === "reel"
                    ? "bg-orange-500 text-white"
                    : "bg-gray-100"
                }`}
              >
                Reel
              </button>
            </div>

            {/* Upload Status */}
            {uploading && (
              <p className="text-center text-sm text-orange-500 mb-3 animate-pulse">
                ⏳ Please wait, media file is uploading...
              </p>
            )}

            {uploadMsg && (
              <p className="text-center text-sm text-green-600 mb-3">
                {uploadMsg}
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowUploadTypeModal(false);
                  setPendingFile(null);
                  setSelectedUploadType("");
                }}
                className="flex-1 border rounded py-2"
              >
                Cancel
              </button>

              <button
                disabled={!selectedUploadType || uploading}
                onClick={handleUpload}
                className="flex-1 bg-orange-500 text-white rounded py-2 disabled:opacity-50"
              >
                Upload
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyAccountPage;
