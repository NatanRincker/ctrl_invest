// pages/login.js

import { useState } from "react";
import { useRouter } from "next/router";

const SIGNUP_URL = "/api/v1/users";
const LOGIN_URL = "/api/v1/sessions";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState("login"); // 'login' | 'signup'

  // Sign up state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [signingUp, setSigningUp] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [signupError, setSignupError] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState("");

  const isValidEmail = (value) => /[^\s@]+@[^\s@]+\.[^\s@]+/.test(value);

  // --- Sign Up ---
  const validateSignup = () => {
    const errors = {};
    if (!name.trim()) errors.name = "Name is required.";
    if (!email.trim()) errors.email = "Email is required.";
    else if (!isValidEmail(email)) errors.email = "Enter a valid email.";
    if (!password) errors.password = "Password is required.";
    else if (password.length < 8)
      errors.password = "Password must have at least 8 characters.";
    if (password !== confirmPassword)
      errors.confirmPassword = "Passwords need to match";
    return errors;
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setSignupError("");
    setSignupSuccess(false);

    const errors = validateSignup();
    if (Object.keys(errors).length > 0) {
      setSignupError(Object.values(errors)[0]);
      return;
    }

    try {
      setSigningUp(true);
      const payload = { name: name.trim(), email: email.trim(), password };
      const res = await fetch(SIGNUP_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.status === 201) {
        setSignupSuccess(true);
        setSignupError("");
        setName("");
        setEmail("");
        setPassword("");
        setConfirmPassword("");
      } else {
        const data = await safeJson(res);
        setSignupError(data?.error || `Sign up failed (HTTP ${res.status}).`);
      }
    } catch (_err) {
      setSignupError("Network error. Please try again.");
    } finally {
      setSigningUp(false);
    }
  };

  // --- Login ---
  const validateLogin = () => {
    const errors = {};
    if (!loginEmail.trim()) errors.email = "Email is required.";
    else if (!isValidEmail(loginEmail)) errors.email = "Enter a valid email.";
    if (!loginPassword) errors.password = "Password is required.";
    return errors;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError("");

    const errors = validateLogin();
    if (Object.keys(errors).length > 0) {
      setLoginError(Object.values(errors)[0]);
      return;
    }

    try {
      setLoggingIn(true);
      const payload = { email: loginEmail.trim(), password: loginPassword };
      const res = await fetch(LOGIN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        router.push("/home");
      } else {
        const data = await safeJson(res);
        setLoginError(data?.error || "Invalid credentials.");
      }
    } catch (_err) {
      setLoginError("Network error. Please try again.");
    } finally {
      setLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f0e] text-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold">Welcome</h1>
          <p className="text-gray-400 text-sm">
            Sign in to create your account or log in to continue.
          </p>
        </div>

        {/* Card */}
        <div className="bg-gray-900/60 border border-gray-800 rounded-2xl shadow-xl backdrop-blur">
          {/* Tabs */}
          <div className="grid grid-cols-2">
            <button
              className={`py-3 text-sm font-medium rounded-tl-2xl ${
                mode === "login"
                  ? "bg-gray-900 text-white"
                  : "bg-transparent text-gray-400 hover:text-gray-200"
              }`}
              onClick={() => setMode("login")}
              aria-pressed={mode === "login"}
              type="button"
            >
              Log in
            </button>
            <button
              className={`py-3 text-sm font-medium rounded-tr-2xl ${
                mode === "signup"
                  ? "bg-gray-900 text-white"
                  : "bg-transparent text-gray-400 hover:text-gray-200"
              }`}
              onClick={() => setMode("signup")}
              aria-pressed={mode === "signup"}
              type="button"
            >
              Sign up
            </button>
          </div>

          <div className="p-6">
            {mode === "signup" ? (
              <form onSubmit={handleSignup} className="space-y-4" noValidate>
                {signupSuccess && (
                  <div className="text-sm rounded-lg border border-emerald-700/50 bg-emerald-900/20 p-3">
                    ✅ User has been created successfully.
                  </div>
                )}
                {signupError && (
                  <div className="text-sm rounded-lg border border-red-800/50 bg-red-900/20 p-3">
                    {signupError}
                  </div>
                )}
                {formInputField({
                  name: "Name",
                  id: "name",
                  stateVar: name,
                  onChange: setName,
                  inputType: "text",
                  placeholder: "Your full name",
                  autoComplete: "name",
                })}
                {formInputField({
                  name: "Email",
                  id: "email",
                  stateVar: email,
                  onChange: setEmail,
                  inputType: "email",
                  placeholder: "your@email.com",
                  autoComplete: "email",
                })}
                {formInputField({
                  name: "New Password",
                  id: "password",
                  stateVar: password,
                  onChange: setPassword,
                  showPasswordOnClick: setShowPassword,
                  showPassword: showPassword,
                  inputType: "password",
                  placeholder: "Must Have at least 8 Charachters",
                  autoComplete: "new-password",
                })}
                {formInputField({
                  name: "Confirm Password",
                  id: "confirm_password",
                  stateVar: confirmPassword,
                  onChange: setConfirmPassword,
                  showPasswordOnClick: setShowConfirmPassword,
                  showPassword: showConfirmPassword,
                  inputType: "password",
                  placeholder: "insert the same password",
                  autoComplete: "off",
                })}
                <button
                  type="submit"
                  disabled={signingUp}
                  className="w-full rounded-lg bg-emerald-800 hover:bg-emerald-700 disabled:opacity-70 disabled:cursor-not-allowed transition-colors p-3 text-sm font-medium"
                >
                  {signingUp ? "Creating account…" : "Create account"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleLogin} className="space-y-4" noValidate>
                {loginError && (
                  <div className="text-sm rounded-lg border border-red-800/50 bg-red-900/20 p-3">
                    {loginError}
                  </div>
                )}
                {formInputField({
                  name: "Email",
                  id: "loginEmail",
                  stateVar: loginEmail,
                  onChange: setLoginEmail,
                  inputType: "email",
                  placeholder: "your@email.com",
                  autoComplete: "email",
                })}
                {formInputField({
                  name: "Password",
                  id: "loginPassword",
                  stateVar: loginPassword,
                  onChange: setLoginPassword,
                  showPasswordOnClick: setShowLoginPassword,
                  showPassword: showLoginPassword,
                  inputType: "password",
                  placeholder: "Your Password",
                  autoComplete: "password",
                })}
                <button
                  type="submit"
                  disabled={loggingIn}
                  className="w-full rounded-lg bg-emerald-800 hover:bg-emerald-700 disabled:opacity-70 disabled:cursor-not-allowed transition-colors p-3 text-sm font-medium"
                >
                  {loggingIn ? "Signing in…" : "Log in"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function formInputField(fieldValues) {
  const isPassword = fieldValues.inputType === "password";
  const resolvedType = isPassword
    ? fieldValues.showPassword
      ? "text"
      : "password"
    : fieldValues.inputType;
  return (
    <div>
      <label
        htmlFor={fieldValues.id}
        className="block text-sm text-gray-300 mb-1"
      >
        {fieldValues.name}
      </label>
      <div className="relative">
        <input
          id={fieldValues.id}
          type={resolvedType}
          value={fieldValues.stateVar}
          onChange={(e) => fieldValues.onChange(e.target.value)}
          className="w-full rounded-lg bg-gray-800 border border-gray-700 p-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
          placeholder={fieldValues.placeholder}
          autoComplete={fieldValues.autoComplete}
          required
        />
        {hidePasswordBtn(isPassword)}
      </div>
    </div>
  );
  function hidePasswordBtn(isPassword) {
    if (isPassword) {
      return (
        <button
          type="button"
          onClick={() => fieldValues.showPasswordOnClick((s) => !s)}
          className="absolute inset-y-0 right-0 px-3 text-xs text-gray-300 hover:text-white"
          aria-label={fieldValues.stateVar ? "Hide password" : "Show password"}
        >
          {fieldValues.showPassword ? "Hide" : "Show"}
        </button>
      );
    }
  }
}

async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}
