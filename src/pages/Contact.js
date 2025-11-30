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
    <div className="contact-wrapper">
      <div className="contact-card">
        <h2 className="contact-title">Contact Us</h2>
        <p className="contact-subtitle">
          We would love to hear from you. Please fill out the form below.
        </p>

        <form className="contact-form" onSubmit={handleSubmit}>
          {/* NAME */}
          <div className="input-group">
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

          {/* EMAIL */}
          <div className="input-group">
            <label>Email Address</label>
            <input
              name="email"
              type="email"
              placeholder="Enter your email"
              value={form.email}
              onChange={handleChange}

            />
          </div>

          {/* MOBILE NUMBER */}
          <div className="input-group">
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

          {/* MESSAGE */}
          <div className="input-group">
            <label>Your Message</label>
            <textarea
              name="message"
              rows="4"
              placeholder="Write your message..."
              value={form.message}
              onChange={handleChange}

            ></textarea>
          </div>

          <button type="submit" className="submit-btn">
            Send Message
          </button>

          {status && !showModal && <p className="form-status">{status}</p>}
        </form>
      </div>

      {/* SUCCESS MODAL */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Success!</h3>
            <p>Your message has been sent successfully.</p>
            <button onClick={closeModal} className="modal-btn">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
