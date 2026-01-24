import { useState } from "react";
import "./Contact.css";

export default function Contact() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    mobile: "",
    message: "",
  });

  const [status, setStatus] = useState("");
  const [showModal, setShowModal] = useState(false);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("Sending...");

    try {
      const response = await fetch("http://localhost:8080/api/contact/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!response.ok) throw new Error("Failed");

      setStatus("Message sent successfully!");
      setForm({ name: "", email: "", mobile: "", message: "" });
      setShowModal(true);
    } catch (err) {
      console.error(err);
      setStatus("Failed to send message. Try again.");
    }
  };

  const closeModal = () => setShowModal(false);

  return (
    <div className="contact-premium-wrapper">

      <div className="contact-premium-card">

        <h2 className="premium-title">Get in Touch</h2>
        <p className="premium-subtitle">
          We're here to assist you with any queries about properties or services.
        </p>

        <form className="premium-form" onSubmit={handleSubmit}>
          <div className="premium-input">
            <label>Your Name</label>
            <input
              name="name"
              type="text"
              placeholder="Enter your name"
              value={form.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="premium-input">
            <label>Email Address</label>
            <input
              name="email"
              type="email"
              placeholder="Enter your email"
              value={form.email}
              onChange={handleChange}
            />
          </div>

          <div className="premium-input">
            <label>Mobile Number</label>
            <input
              name="mobile"
              type="tel"
              placeholder="Enter your mobile number"
              value={form.mobile}
              onChange={handleChange}
              pattern="[0-9]{10}"
              required
            />
          </div>

          <div className="premium-input">
            <label>Your Message</label>
            <textarea
              name="message"
              rows="4"
              placeholder="Type your message..."
              value={form.message}
              onChange={handleChange}
            ></textarea>
          </div>

          <button type="submit" className="premium-submit">
            Send Message
          </button>

          {status && !showModal && (
            <p className="premium-status">{status}</p>
          )}
        </form>
      </div>

      {showModal && (
        <div className="premium-modal-bg">
          <div className="premium-modal-box">
            <h3>Message Sent!</h3>
            <p>Thank you for contacting us. We’ll get back to you shortly.</p>
            <button onClick={closeModal} className="premium-modal-btn">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
