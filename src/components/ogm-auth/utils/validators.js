/**
 * validators.js
 * Pure validation functions – no side effects, easy to unit-test.
 */

export const validators = {
    email: (v) =>
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : "Enter a valid email address",

    password: (v) =>
        v.length >= 8 ? null : "Password must be at least 8 characters",

    name: (v) =>
        v.trim().length >= 2 ? null : "Name must be at least 2 characters",

    phone: (v) =>
        /^[6-9]\d{9}$/.test(v) ? null : "Enter a valid 10-digit mobile number",

    otp: (v) =>
        /^\d{6}$/.test(v) ? null : "Enter a valid 6-digit OTP",
};

/**
 * Runs a map of { fieldName: value } through their validators.
 * Returns an errors object { fieldName: errorMessage | null }.
 */
export function validateFields(fields) {
    return Object.entries(fields).reduce((acc, [key, value]) => {
        acc[key] = validators[key] ? validators[key](value) : null;
        return acc;
    }, {});
}

/** Returns true when every value in an errors object is null */
export const isValid = (errors) => Object.values(errors).every((e) => e === null);