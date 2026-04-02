// const BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:8080/api";
const BASE_URL = process.env.REACT_APP_API_BASE_URL || "https://ogm-backend-clean-us-879813720468.us-central1.run.app/api";

export const registerBroker = async (payload) => {
    const res = await fetch(`${BASE_URL}/broker/register`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(payload),
    });
    let data;
    try { data = await res.json(); } catch { throw new Error("Server error. Please try again."); }
    if (!res.ok) throw new Error(data.error || "Registration failed. Please try again.");
    return data;
};

export const loginBroker = async (userJsonUrl) => {
    const res = await fetch(`${BASE_URL}/broker/login`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({userJsonUrl}),
    });
    let data;
    try { data = await res.json(); } catch { throw new Error("Server error."); }
    if (!res.ok) throw new Error(data.error || "Login failed.");
    return data;
};

export const registerWithWhatsApp = async (formData, selectedAreas = [], selectedTypes = []) => {
    const name       = formData.fullName          || "Not provided";
    const company    = formData.companyName       || "Not provided";
    const rera       = formData.reraNumber        || "N/A";
    const mobile     = formData.mobile            || "Not provided";
    const email      = formData.email             || "";
    const address    = formData.officeAddress     || "Not provided";
    const properties = formData.numberOfProperties|| "Not provided";
    const areas      = selectedAreas.length > 0 ? selectedAreas.join(", ") : "Not provided";
    const types      = selectedTypes.length > 0
        ? selectedTypes.map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(", ")
        : "Not provided";

    const divider = "----------------------------";
    const message =
        `${divider}
*Agent/Developer REGISTRATION REQUEST*
*One Global Marketplace*
${divider}

*Name:* ${name}
*Company:* ${company}
*RERA Number:* ${rera}
*Mobile:* +91 ${mobile}
*Email:* ${email}
*Office Address:* ${address}
*Operating Areas:* ${areas}
*Property Types:* ${types}
*No. of Properties:* ${properties}

${divider}
*Declaration:* I confirm I am an authorized Agent/Developer and agree to the Terms & Conditions of One Global Marketplace.

_Kindly process my broker registration._
${divider}`;

    // Step 1 — Open WhatsApp
    window.open("https://wa.me/918309120616?text=" + encodeURIComponent(message), "_blank");

    // Step 2 — Send confirmation email if email provided
    if (email && email.trim() !== "" && email !== "Not provided") {
        try {
            const res = await fetch(`${BASE_URL}/broker/whatsapp-register`, {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    fullName:           formData.fullName          || "",
                    companyName:        formData.companyName       || "",
                    reraNumber:         formData.reraNumber        || null,
                    mobile:             formData.mobile            || "",
                    email:              email,
                    officeAddress:      formData.officeAddress     || "",
                    numberOfProperties: formData.numberOfProperties|| 0,
                    operatingAreas:     selectedAreas,
                    propertyTypes:      selectedTypes,
                    authProvider:       "WHATSAPP",
                }),
            });
            const data = await res.json();
            console.log("[WhatsApp] Backend notified:", data.message);
        } catch (err) {
            console.warn("[WhatsApp] Could not send confirmation email:", err.message);
        }
    }
};

export const registerWithGoogle = () => {
    window.location.href = `${BASE_URL}/auth/google?role=broker`;
};

export const getBrokerProfile = async () => {
    const res = await fetch(`${BASE_URL}/broker/profile`, {
        headers: {Authorization: `Bearer ${localStorage.getItem("brokerToken")}`},
    });
    if (!res.ok) throw new Error("Failed to fetch profile");
    return await res.json();
};