import React from "react";
import axios from "axios";

const API = "https://backendpayments.onrender.com"; // Render backend

const TestPayment = () => {
  const payNow = async () => {
    try {
      const res = await axios.post(`${API}/api/ccav/initiate`, {
        amount: 100, // ₹100 test
        order_id: "ORD_" + Date.now(),
        customer: {
          name: "Test User",
          email: "test@kridana.net",
          phone: "9999999999",
        },
      });

      const { url, encRequest, access_code } = res.data;

      // Create auto-submit form
      const form = document.createElement("form");
      form.method = "POST";
      form.action = url;

      const encInput = document.createElement("input");
      encInput.type = "hidden";
      encInput.name = "encRequest";
      encInput.value = encRequest;

      const accInput = document.createElement("input");
      accInput.type = "hidden";
      accInput.name = "access_code";
      accInput.value = access_code;

      form.appendChild(encInput);
      form.appendChild(accInput);
      document.body.appendChild(form);
      form.submit();
    } catch (err) {
      console.error("Payment Error:", err);
      alert("Payment initiation failed. Check console.");
    }
  };

  return (
    <div style={{ padding: "40px", textAlign: "center" }}>
      <h2>CC Avenue Payment Test</h2>
      <p>Backend: backendpayments.onrender.com</p>
      <button
        onClick={payNow}
        style={{
          padding: "12px 24px",
          fontSize: "16px",
          background: "#16a34a",
          color: "#fff",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
        }}
      >
        Pay ₹100
      </button>
    </div>
  );
};

export default TestPayment;
