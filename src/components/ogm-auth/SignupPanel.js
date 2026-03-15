import { useState } from "react";
import { authApi } from "./utils/authapi";
import { validateFields, isValid } from "./utils/validators";
import { useAsync } from "./hooks/useasync";
import FormField from "./FormField";
import SocialAuthButtons from "./SocialAuthButtons";

export default function SignupPanel({ onSuccess }) {
    const [fields, setFields] = useState({ name: "", email: "", password: "" });
    const [fieldErrors, setFieldErrors] = useState({});
    const [successMsg, setSuccessMsg] = useState("");
    const { run, loading, error } = useAsync();

    const set = (key) => (e) =>
        setFields((prev) => ({ ...prev, [key]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();

        const errors = validateFields(fields);
        setFieldErrors(errors);
        if (!isValid(errors)) return;

        const data = await run(() =>
            authApi.signup(fields.name, fields.email, fields.password)
        );
        if (!data) return;

        setSuccessMsg("Account created! Redirecting to login…");
        setTimeout(() => onSuccess?.(), 900);
    };

    return (
        <form className="ogm-auth-form" onSubmit={handleSubmit} noValidate>
            <FormField
                type="text"
                placeholder="Full Name"
                value={fields.name}
                onChange={set("name")}
                error={fieldErrors.name}
                required
            />

            <FormField
                type="email"
                placeholder="Email address"
                value={fields.email}
                onChange={set("email")}
                error={fieldErrors.email}
                required
            />

            <FormField
                type="password"
                placeholder="Create password"
                value={fields.password}
                onChange={set("password")}
                error={fieldErrors.password}
                required
            />

            {error && (
                <p className="ogm-auth-error" role="alert">
                    {error}
                </p>
            )}
            {successMsg && (
                <p className="ogm-auth-success" role="status">
                    {successMsg}
                </p>
            )}

            <button className="ogm-primary-btn" disabled={loading} type="submit">
                {loading ? "Creating account…" : "Create Account"}
            </button>

            <SocialAuthButtons />
        </form>
    );
}