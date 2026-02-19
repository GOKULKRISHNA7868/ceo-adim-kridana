import React from "react";
import axios from "axios";

const API = "http://localhost:5000"; // backend

const Payment = () => {
  const payNow = async () => {
    const res = await axios.post(`${API}/api/ccav/initiate`, {
      amount: 100,
      order_id: "ORD_" + Date.now(),
      customer: {
        name: "Test User",
        email: "test@mail.com",
        phone: "9999999999",
      },
    });

    const { url, encRequest, access_code } = res.data;

    const form = document.createElement("form");
    form.method = "POST";
    form.action = url;

    const encInput = document.createElement("input");
    encInput.name = "encRequest";
    encInput.value = encRequest;

    const accInput = document.createElement("input");
    accInput.name = "access_code";
    accInput.value = access_code;

    form.appendChild(encInput);
    form.appendChild(accInput);
    document.body.appendChild(form);
    form.submit();
  };

  return (
    <div>
      <h2>CC Avenue Test Payment</h2>
      <button onClick={payNow}>Pay ₹100</button>
    </div>
  );
};

export default Payment;
