// brokerConstants.js — shared data for all broker components

export const PROPERTY_TYPES = [
    { id: "apartment", label: "Apartment", icon: "🏢" },
    { id: "villa", label: "Villa", icon: "🏡" },
    { id: "plot", label: "Plot", icon: "🗺️" },
    { id: "commercial", label: "Commercial", icon: "🏬" },
    { id: "studio", label: "Studio", icon: "🛋️" },
    { id: "penthouse", label: "Penthouse", icon: "🏙️" },
    { id: "rowhouse", label: "Row House", icon: "🏘️" },
];

export const OPERATING_AREAS = [
    "Whitefield",
    "Electronic City",
    "Koramangala",
    "HSR Layout",
    "Indiranagar",
    "Marathahalli",
    "Sarjapur Road",
    "Bannerghatta Road",
    "Yelahanka",
    "Hebbal",
    "JP Nagar",
    "BTM Layout",
    "Bellandur",
    "Varthur",
    "Kengeri",
    "Rajajinagar",
    "Malleshwaram",
    "Jayanagar",
];

export const BROKER_STATUS = {
    PENDING: "pending",
    VERIFIED: "verified",
    REJECTED: "rejected",
    ACTIVE: "active",
};

export const INDIA_COUNTRY_CODE = "+91";

export const OTP_LENGTH = 6;

export const REGISTRATION_STEPS = [
    { id: 1, label: "Basic Details" },
    { id: 2, label: "Verify OTP" },
    { id: 3, label: "Business Info" },
];