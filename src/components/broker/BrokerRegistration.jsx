// src/components/broker/BrokerRegistration.jsx

import React, {useState, useEffect} from "react";
import {useNavigate} from "react-router-dom";
import BrokerFormField from "./BrokerFormField";
import BrokerMultiSelect from "./BrokerMultiSelect";
import BrokerOtpVerify from "./BrokerOtpVerify";
import BrokerEmailVerify from "./BrokerEmailVerify";
import BrokerSuccessScreen from "./BrokerSuccessScreen";
import {PROPERTY_TYPES, OPERATING_AREAS} from "./brokerConstants";
import {validateRegistrationForm} from "./brokerValidation";
import {registerBroker, registerWithWhatsApp} from "./brokerService";
import "./BrokerRegistration.css";

const INITIAL_FORM = {
    fullName: "", companyName: "", reraNumber: "",
    mobile: "", email: "", officeAddress: "", numberOfProperties: "",
};

const AREA_OPTIONS = OPERATING_AREAS.map((a) => ({id: a, label: a}));
const TYPE_OPTIONS = PROPERTY_TYPES;

const GoogleIcon = () => (
    <svg className="broker-btn__google-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path fill="#4285F4"
              d="M23.745 12.27c0-.79-.07-1.54-.19-2.27h-11.3v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/>
        <path fill="#34A853"
              d="M12.255 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96h-3.98v3.09C3.515 21.3 7.615 24 12.255 24z"/>
        <path fill="#FBBC05"
              d="M5.525 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62h-3.98a11.86 11.86 0 0 0 0 10.76l3.98-3.09z"/>
        <path fill="#EA4335"
              d="M12.255 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C18.205 1.19 15.495 0 12.255 0c-4.64 0-8.74 2.7-10.71 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/>
    </svg>
);

const WhatsAppIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
        <path
            d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/>
        <path
            d="M12 0C5.373 0 0 5.373 0 12c0 2.117.554 4.107 1.523 5.832L0 24l6.341-1.498A11.933 11.933 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 0 1-5.006-1.372l-.359-.213-3.764.889.937-3.654-.234-.375A9.818 9.818 0 1 1 12 21.818z"/>
    </svg>
);

const BrokerRegistration = () => {
    const [form, setForm] = useState(INITIAL_FORM);
    const [mobileVerified, setMobileVerified] = useState(false);
    const [mobileStage, setMobileStage] = useState("idle");
    const [emailVerified, setEmailVerified] = useState(false);
    const [emailStage, setEmailStage] = useState("idle");
    const [selectedAreas, setSelectedAreas] = useState([]);
    const [selectedTypes, setSelectedTypes] = useState(["apartment", "villa", "plot", "commercial"]);
    const [agreed, setAgreed] = useState(false);
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [googleError, setGoogleError] = useState("");

    // ── Handle Google OAuth redirect back ─────────────────────────────
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const token = params.get("token");
        const brokerId = params.get("brokerId");
        const isNew = params.get("isNew");
        const error = params.get("error");

        if (error) {
            setGoogleError(decodeURIComponent(error));
            window.history.replaceState({}, "", "/broker/register");
            return;
        }

        if (token && brokerId) {
            localStorage.setItem("brokerToken", token);
            if (isNew === "true") {
                setResult({brokerId, fromGoogle: true});
            } else {
                setResult({brokerId, fromGoogle: false});
            }
            window.history.replaceState({}, "", "/broker/register");
        }
    }, []);

    const updateField = (field) => (e) =>
        setForm((prev) => ({...prev, [field]: e.target.value}));

    const handleMobileVerified = (verifiedMobile) => {
        setMobileVerified(true);
        setMobileStage("verified");
        setForm((prev) => ({...prev, mobile: verifiedMobile}));
    };

    const handleEmailVerified = (verifiedEmail) => {
        setEmailVerified(true);
        setEmailStage("verified");
        setForm((prev) => ({...prev, email: verifiedEmail}));
    };

    const handleGoogleRegister = () => {
        // window.location.href = "http://localhost:8080/api/auth/google?role=broker";
        window.location.href = "https://ogm-backend-clean-us-879813720468.us-central1.run.app/api/auth/google?role=broker";
    };

    // ── WhatsApp Registration ─────────────────────────────────────────
    const handleWhatsAppRegister = async () => {
        const missing = [];
        if (!form.fullName.trim())      missing.push("Full Name");
        if (!form.companyName.trim())   missing.push("Company Name");
        if (!form.mobile.trim())        missing.push("Mobile Number");
        if (!form.email.trim())         missing.push("Email Address");
        if (!form.officeAddress.trim()) missing.push("Office Address");
        if (selectedAreas.length === 0) missing.push("Operating Areas");
        if (selectedTypes.length === 0) missing.push("Property Types");

        if (missing.length > 0) {
            setErrors({submit: `Please fill in: ${missing.join(", ")} before registering via WhatsApp.`});
            window.scrollTo({top: 0, behavior: "smooth"});
            return;
        }

        setErrors({});
        await registerWithWhatsApp(form, selectedAreas, selectedTypes);
    };

    const handleSubmit = async () => {
        const errs = validateRegistrationForm({
            form, otpVerified: mobileVerified, selectedAreas, selectedTypes, agreed,
        });
        if (!emailVerified) errs.email = "Please verify your email address";
        if (Object.keys(errs).length > 0) {
            setErrors(errs);
            document.querySelector(".broker-field--error")
                ?.scrollIntoView({behavior: "smooth", block: "center"});
            return;
        }

        setErrors({});
        setLoading(true);
        try {
            const payload = {
                ...form,
                operatingAreas: selectedAreas,
                propertyTypes: selectedTypes,
                agreedToTerms: agreed,
                mobileVerified: true,
                emailVerified: true,
            };
            const res = await registerBroker(payload);
            if (res.success) setResult({brokerId: res.brokerId});
            else setErrors({submit: res.message || "Registration failed."});
        } catch (err) {
            setErrors({submit: err.message || "Something went wrong."});
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setForm(INITIAL_FORM);
        setMobileVerified(false);
        setMobileStage("idle");
        setEmailVerified(false);
        setEmailStage("idle");
        setSelectedAreas([]);
        setSelectedTypes(["apartment", "villa", "plot", "commercial"]);
        setAgreed(false);
        setErrors({});
        setResult(null);
        setGoogleError("");
    };

    if (result) {
        return (
            <div className="broker-page">
                <BrokerSuccessScreen
                    brokerName={form.fullName || "Broker"}
                    brokerId={result.brokerId}
                    fromGoogle={result.fromGoogle}
                    onReset={handleReset}
                />
            </div>
        );
    }

    return (
        <div className="broker-page">
            <div className="broker-header">
                <h1 className="broker-header__title">Agent/Developer Registration</h1>
                <p className="broker-header__subtitle">Join our platform and start getting qualified leads today!</p>
                <div className="broker-header__promo">
                    <span className="broker-header__promo-badge">🎁 Free Leads for the First 3 Months</span>
                </div>
            </div>

            <div className="broker-card">
                <h2 className="broker-card__section-title">Basic Details</h2>

                {/* Google error */}
                {googleError && (
                    <div style={{background: "#fff5f5", border: "1px solid #fca5a5", borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: "0.85rem", color: "#dc2626"}}>
                        ⚠ Google sign-in failed: {googleError}
                    </div>
                )}

                <BrokerFormField icon="👤" label="Full Name" error={errors.fullName} required>
                    <input className="broker-input" placeholder="Enter your full name"
                           value={form.fullName} onChange={updateField("fullName")}/>
                </BrokerFormField>

                <BrokerFormField icon="🏢" label="Company Name" error={errors.companyName} required>
                    <input className="broker-input" placeholder="Enter your company name"
                           value={form.companyName} onChange={updateField("companyName")}/>
                </BrokerFormField>

                <BrokerFormField icon="📋" label={<>RERA Number<span className="broker-optional"> (Optional)</span></>}>
                    <input className="broker-input" placeholder="e.g. KA/2023/12345"
                           value={form.reraNumber} onChange={updateField("reraNumber")}/>
                </BrokerFormField>

                {/* Mobile + phone.email */}
                <div className={`broker-field${errors.mobile || errors.otp ? " broker-field--error" : ""}`}>
                    <div className="broker-field__inner">
                        <div className="broker-field__label-row">
                            <span className="broker-field__icon">📞</span>
                            <label className="broker-field__label">Mobile Number<span className="broker-field__required">*</span></label>
                        </div>
                        <div className="broker-field__control broker-mobile-wrap">
                            <span className="broker-mobile-code">+91</span>
                            <input
                                className="broker-input"
                                placeholder="10-digit mobile number"
                                value={form.mobile}
                                onChange={(e) => {
                                    updateField("mobile")(e);
                                    if (mobileStage !== "idle") setMobileStage("idle");
                                    setMobileVerified(false);
                                }}
                                maxLength={10}
                                inputMode="numeric"
                                disabled={mobileVerified}
                            />
                            {!mobileVerified && (
                                <BrokerOtpVerify mobile={form.mobile} stage={mobileStage}
                                                 onStageChange={setMobileStage} onVerified={handleMobileVerified}
                                                 panelOnly={false}/>
                            )}
                            {mobileVerified && (
                                <div className="broker-otp__verified">
                                    <span className="broker-otp__verified-icon">✓</span><span>Verified</span>
                                </div>
                            )}
                        </div>
                    </div>
                    {!mobileVerified && (
                        <BrokerOtpVerify mobile={form.mobile} stage={mobileStage}
                                         onStageChange={setMobileStage} onVerified={handleMobileVerified}
                                         panelOnly={true}/>
                    )}
                    {(errors.mobile || errors.otp) && (
                        <p className="broker-field__error"><span>⚠</span> {errors.mobile || errors.otp}</p>
                    )}
                </div>

                {/* Email + phone.email email verification */}
                <div className={`broker-field${errors.email ? " broker-field--error" : ""}`}>
                    <div className="broker-field__inner">
                        <div className="broker-field__label-row">
                            <span className="broker-field__icon">✉️</span>
                            <label className="broker-field__label">Email Address<span className="broker-field__required">*</span></label>
                        </div>
                        <div className="broker-field__control broker-mobile-wrap">
                            <input
                                className="broker-input"
                                placeholder="Enter your email address"
                                value={form.email}
                                onChange={(e) => {
                                    updateField("email")(e);
                                    if (emailStage !== "idle") setEmailStage("idle");
                                    setEmailVerified(false);
                                }}
                                type="email"
                                disabled={emailVerified}
                                style={{flex: 1}}
                            />
                            {!emailVerified && (
                                <BrokerEmailVerify email={form.email} stage={emailStage}
                                                   onStageChange={setEmailStage} onVerified={handleEmailVerified}
                                                   panelOnly={false}/>
                            )}
                            {emailVerified && (
                                <div className="broker-otp__verified">
                                    <span className="broker-otp__verified-icon">✓</span><span>Verified</span>
                                </div>
                            )}
                        </div>
                    </div>
                    {!emailVerified && (
                        <BrokerEmailVerify email={form.email} stage={emailStage}
                                           onStageChange={setEmailStage} onVerified={handleEmailVerified}
                                           panelOnly={true}/>
                    )}
                    {errors.email && <p className="broker-field__error"><span>⚠</span> {errors.email}</p>}
                </div>

                <BrokerFormField icon="📍" label="Office Address" error={errors.officeAddress} required>
                    <input className="broker-input" placeholder="Enter your office address"
                           value={form.officeAddress} onChange={updateField("officeAddress")}/>
                </BrokerFormField>

                <BrokerFormField icon="🏙️" label="Operating Areas" error={errors.operatingAreas} required>
                    <BrokerMultiSelect options={AREA_OPTIONS} selected={selectedAreas}
                                       onChange={setSelectedAreas} placeholder="Select operating areas"/>
                </BrokerFormField>

                <BrokerFormField icon="🏠" label="Property Types" error={errors.propertyTypes} required>
                    <BrokerMultiSelect options={TYPE_OPTIONS} selected={selectedTypes}
                                       onChange={setSelectedTypes} placeholder="Select property types"/>
                </BrokerFormField>

                <BrokerFormField icon="#️⃣" label="No. of Properties">
                    <input className="broker-input" placeholder="Enter number of properties"
                           value={form.numberOfProperties} onChange={updateField("numberOfProperties")}
                           type="number" min="0"/>
                </BrokerFormField>

                <label className="broker-terms">
                    <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)}/>
                    <span>I confirm I am an authorized broker/agent and agree to the{" "}
                        <span
                            className="broker-terms__link"
                            onClick={() => window.open("/terms.html", "_blank")}
                        >
                            Terms &amp; Conditions
                        </span>
                    </span>
                </label>
                {errors.terms  && <p className="broker-terms__error">⚠ {errors.terms}</p>}
                {errors.submit && (
                    <p style={{color: "var(--broker-red)", fontSize: "0.85rem", marginBottom: 12}}>
                        ⚠ {errors.submit}
                    </p>
                )}

                <div className="broker-btn-group">
                    <button className="broker-btn broker-btn--primary" onClick={handleSubmit} disabled={loading}>
                        {loading ? "Registering…" : "Register"}
                    </button>
                    <button className="broker-btn broker-btn--whatsapp" onClick={handleWhatsAppRegister}>
                        <WhatsAppIcon/> Register with WhatsApp
                    </button>
                    <button className="broker-btn broker-btn--google" onClick={handleGoogleRegister}>
                        <GoogleIcon/> Register with Google
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BrokerRegistration;