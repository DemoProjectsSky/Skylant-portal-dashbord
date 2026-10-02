
import { useState, type FormEvent } from "react";
import { BriefcaseBusiness, Eye, EyeOff, Lock, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { saveSession, signIn, signUp } from "../lib/authApi";
import type { PortalRole } from "../lib/roleApi";
import skylantLogo from "./public/skylant website logo.jpeg";
import "./login.css";


export default function SkylantLogin() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [role, setRole] = useState<PortalRole>("manager");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = mode === "signup" ? await signUp({ name, email, password, role }) : await signIn({ email, password, role });
      saveSession(response);
      navigate(response.user.role === "sales_executive" ? "/sales-dashboard" : "/dashboard", { replace: true });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to authenticate");
    } finally {
      setLoading(false);
    }
  };

  return <main className="login-page">
    <div className="login-dots" style={{ backgroundImage: "radial-gradient(circle, rgba(23,59,122,.12) 1px, transparent 1px)", backgroundSize: "28px 28px", WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 38%, black 0%, transparent 72%)", maskImage: "radial-gradient(ellipse 70% 60% at 50% 38%, black 0%, transparent 72%)" }} />
    <div className="login-glow login-glow-top" style={{ background: "radial-gradient(circle at 30% 30%, rgba(37,99,235,.15), transparent 62%)" }} />
    <div className="login-glow login-glow-bottom" style={{ background: "radial-gradient(circle at 70% 70%, rgba(23,59,122,.12), transparent 60%)" }} />
    <section className="login-card">
      <div className="brand"><img src={skylantLogo} alt="Skylant Tech Solution" className="skylant-logo" /><div className="brand-text"><div className="brand-name">Skylant</div><div className="brand-subtitle">TECH SOLUTION</div></div></div>
      <h1 className="login-title">{mode === "signin" ? "Welcome back" : "Create your account"}</h1>
      <p className="login-subtitle">{mode === "signin" ? "Sign in to your saved workspace" : "Your account and work will be saved locally"}</p>
      <div className="role-tabs"><button type="button" className={role === "manager" ? "active" : ""} onClick={() => setRole("manager")}><ShieldCheck size={17} /> Manager</button><button type="button" className={role === "sales_executive" ? "active" : ""} onClick={() => setRole("sales_executive")}><BriefcaseBusiness size={17} /> Sales Team</button></div>
      <form onSubmit={submit} className="login-form">
        {mode === "signup" && <div className="form-group"><label htmlFor="name" className="field-label">Full name</label><input id="name" className="field-input" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Chetan Sharma" required /></div>}
        <div className="form-group"><label htmlFor="email" className="field-label">Email</label><input id="email" type="text" autoComplete="username" className="field-input" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Enter any email" required /></div>
        <div className="form-group"><label htmlFor="password" className="field-label">Password</label><div className="password-wrapper"><input id="password" type={showPassword ? "text" : "password"} autoComplete={mode === "signin" ? "current-password" : "new-password"} className="field-input password-input" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter any password" required /><button type="button" className="password-toggle" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={19} /> : <Eye size={19} />}</button></div></div>
        {error ? <div className="auth-error">{error}</div> : null}
        <button type="submit" className="login-submit" disabled={loading}>{loading ? "PLEASE WAIT..." : mode === "signin" ? "SIGN IN" : "SIGN UP"}</button>
      </form>
      <button type="button" className="auth-mode-toggle" onClick={() => { setMode((current) => current === "signin" ? "signup" : "signin"); setError(""); }}>{mode === "signin" ? "New here? Create an account" : "Already registered? Sign in"}</button>
      <div className="login-footer"><Lock size={14} className="security-icon" /><span className="security-label">LOCAL PORTAL ACCESS</span></div>
    </section>
  </main>;
}

