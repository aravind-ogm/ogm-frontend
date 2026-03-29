// brokerValidation.js — all form validation logic

export const validateFullName = (value) => {
    if (!value || !value.trim()) return "Full name is required";
    if (value.trim().length < 3) return "Name must be at least 3 characters";
    return null;
};

export const validateCompanyName = (value) => {
    if (!value || !value.trim()) return "Company name is required";
    return null;
};

export const validateReraNumber = (value) => {
    // Optional field — only validate format if provided
    if (!value || !value.trim()) return null;
    const reraRegex = /^[A-Z]{2}\/\d{4}\/\d{4,}$/i;
    if (!reraRegex.test(value.trim())) return "Invalid RERA format (e.g. KA/2023/12345)";
    return null;
};

export const validateMobile = (value) => {
    if (!value || !value.trim()) return "Mobile number is required";
    if (!/^\d{10}$/.test(value.trim())) return "Enter a valid 10-digit mobile number";
    return null;
};

export const validateEmail = (value) => {
    if (!value || !value.trim()) return "Email address is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return "Enter a valid email address";
    return null;
};

export const validateOfficeAddress = (value) => {
    if (!value || !value.trim()) return "Office address is required";
    if (value.trim().length < 10) return "Please enter a complete address";
    return null;
};

export const validateOperatingAreas = (areas) => {
    if (!areas || areas.length === 0) return "Select at least one operating area";
    return null;
};

export const validatePropertyTypes = (types) => {
    if (!types || types.length === 0) return "Select at least one property type";
    return null;
};

export const validateNumberOfProperties = (value) => {
    if (!value && value !== 0) return null; // optional
    if (isNaN(value) || Number(value) < 0) return "Enter a valid number";
    return null;
};

export const validateTerms = (agreed) => {
    if (!agreed) return "You must agree to the Terms & Conditions";
    return null;
};

export const validateOtp = (otp, expectedLength = 6) => {
    if (!otp || otp.trim() === "") return "OTP is required";
    if (otp.trim().length !== expectedLength) return `Enter the ${expectedLength}-digit OTP`;
    return null;
};

/**
 * Runs all validations for the full registration form.
 * Returns an object of { fieldName: errorMessage }.
 */
export const validateRegistrationForm = ({ form, otpVerified, selectedAreas, selectedTypes, agreed }) => {
    const errors = {};

    const nameErr = validateFullName(form.fullName);
    if (nameErr) errors.fullName = nameErr;

    const companyErr = validateCompanyName(form.companyName);
    if (companyErr) errors.companyName = companyErr;

    const reraErr = validateReraNumber(form.reraNumber);
    if (reraErr) errors.reraNumber = reraErr;

    const mobileErr = validateMobile(form.mobile);
    if (mobileErr) errors.mobile = mobileErr;

    if (!otpVerified) errors.otp = "Please verify your mobile number via OTP";

    const emailErr = validateEmail(form.email);
    if (emailErr) errors.email = emailErr;

    const addressErr = validateOfficeAddress(form.officeAddress);
    if (addressErr) errors.officeAddress = addressErr;

    const areasErr = validateOperatingAreas(selectedAreas);
    if (areasErr) errors.operatingAreas = areasErr;

    const typesErr = validatePropertyTypes(selectedTypes);
    if (typesErr) errors.propertyTypes = typesErr;

    const termsErr = validateTerms(agreed);
    if (termsErr) errors.terms = termsErr;

    return errors;
};