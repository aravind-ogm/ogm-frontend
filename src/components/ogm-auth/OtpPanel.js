import { useEffect, useState } from "react";
import api from "../../api";

export default function OtpPanel() {
    const [phone, setPhone] = useState("");
    const [otp, setOtp] = useState("");
    const [step, setStep] = useState("PHONE");
    const [loading, setLoading] = useState(false);
    const [timer, setTimer] = useState(30);
    const [error, setError] = useState("");

    useEffect(() => {
        if (step === "OTP" && timer > 0) {
            const interval = setInterval(() => {
                setTimer((t) => t - 1);
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [step, timer]);

    const sendOtp = async () => {
        if (!/^[6-9]\d{9}$/.test(phone)) {
            setError("Enter valid mobile number");
            return;
        }

        setError("");
        setLoading(true);

        try {
            await api.post("/api/auth/otp/send", null, {
                params: { identifier: "+91" + phone }
            });

            setStep("OTP");
            setTimer(30);
        } catch (err) {
            setError("Failed to send OTP");
        } finally {
            setLoading(false);
        }
    };

    const verifyOtp = async () => {
        if (otp.length !== 6) {
            setError("Enter 6 digit OTP");
            return;
        }

        setError("");
        setLoading(true);

        try {
            await api.post("/api/auth/otp/verify", {
                email: "+91" + phone, // backend uses same field for email/phone
                otp
            });

            alert("OTP Verified 🎉");
        } catch (err) {
            setError("Invalid or expired OTP");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form
            className="ogm-auth-form"
            onSubmit={(e) => {
                e.preventDefault();
                step === "PHONE" ? sendOtp() : verifyOtp();
            }}
        >
            {step === "PHONE" && (
                <input
                    type="tel"
                    placeholder="Mobile number"
                    maxLength={10}
                    value={phone}
                    onChange={(e) =>
                        setPhone(e.target.value.replace(/\D/g, ""))
                    }
                    required
                />
            )}

            {step === "OTP" && (
                <input
                    type="text"
                    placeholder="Enter OTP"
                    maxLength={6}
                    value={otp}
                    autoFocus
                    onChange={(e) =>
                        setOtp(e.target.value.replace(/\D/g, ""))
                    }
                    required
                />
            )}

            {error && <p className="ogm-error">{error}</p>}

            <button className="ogm-primary-btn" disabled={loading}>
                {loading
                    ? "Please wait..."
                    : step === "PHONE"
                        ? "Send OTP"
                        : "Verify OTP"}
            </button>

            {step === "OTP" && (
                <span
                    className={`ogm-resend-otp ${timer > 0 ? "disabled" : ""}`}
                    onClick={timer === 0 ? sendOtp : undefined}
                >
                    {timer > 0 ? `Resend OTP in ${timer}s` : "Resend OTP"}
                </span>
            )}
        </form>
    );
}
