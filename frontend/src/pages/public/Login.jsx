import { useState, useContext, useEffect } from "react";
import api from "../../services/api";
import { AppContext } from "../../context/AppContext";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { motion } from "framer-motion";
import { Mail, Lock, User, LogIn, UserPlus, HeartPulse } from "lucide-react";

const Login = () => {
  const navigate = useNavigate();
  const { isLoggedIn, setIsLoggedIn, getUserData } = useContext(AppContext);

  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isLoggedIn) {
      navigate("/app/dashboard", { replace: true });
    }
  }, [isLoggedIn, navigate]);

  const handleAuthSuccess = async () => {
    setIsLoggedIn(true);
    const user = await getUserData();

    if (!user?.isAccountVerified) {
      navigate("/verify-email");
    } else if (!user?.profileCompleted) {
      navigate("/complete-profile");
    } else {
      navigate("/app/dashboard");
    }
  };

  const onSubmitHandler = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data } = mode === "signup"
        ? await api.post("/auth/register", { name, email, password })
        : await api.post("/auth/login", { email, password });

      if (data.success) {
        toast.success(
          mode === "signup" ? "Account created successfully!" : "Login successful!"
        );
        await handleAuthSuccess();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">

      {/* LEFT SIDE BRANDING */}
      <div className="hidden h-screen md:flex w-1/2 bg-gradient-to-br from-blue-600 to-indigo-800 items-center justify-center text-white p-10">
        <div>
          <div className="flex items-center gap-3 mb-6">
            <HeartPulse size={44} className="text-white/90" />
          </div>
          <h1 className="text-5xl font-bold mb-4">Smart Health System</h1>
          <p className="text-lg opacity-90">Monitor. Analyze. Improve.</p>
        </div>
      </div>

      {/* RIGHT SIDE AUTH CARD */}
      <div className="flex w-full md:w-1/2 items-center justify-center bg-gradient-to-br from-gray-100 to-gray-300 px-6">
        <div className="bg-white shadow-2xl rounded-2xl p-8 w-full max-w-md border border-gray-100">

          {/* Heading with icon */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {mode === "login"
              ? <LogIn size={22} className="text-blue-600" />
              : <UserPlus size={22} className="text-blue-600" />
            }
            <h2 className="text-2xl font-semibold">
              {mode === "login" ? "Welcome Back" : "Create Account"}
            </h2>
          </div>

          {/* TOGGLE */}
          <div className="relative flex bg-gray-200 rounded-full p-1 mb-6">
            <div
              className={`absolute top-1 bottom-1 w-1/2 bg-white rounded-full shadow transition-all duration-300 ${
                mode === "login" ? "left-1" : "left-1/2"
              }`}
            />
            <button
              type="button"
              onClick={() => setMode("login")}
              className="relative z-10 w-1/2 py-2 text-sm font-semibold transition flex items-center justify-center gap-1.5"
            >
              <LogIn size={14} /> Login
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className="relative z-10 w-1/2 py-2 text-sm font-semibold transition flex items-center justify-center gap-1.5"
            >
              <UserPlus size={14} /> Sign Up
            </button>
          </div>

          {/* FORM */}
          <form onSubmit={onSubmitHandler} className="space-y-4">
            <motion.div
              key={mode}
              initial={{ opacity: 0, x: mode === "login" ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              {mode === "signup" && (
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Full Name"
                    className="w-full pl-9 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              )}

              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  placeholder="Email Address"
                  className="w-full pl-9 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  placeholder="Password"
                  className="w-full pl-9 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </motion.div>

            {mode === "login" && (
              <p
                onClick={() => navigate("/reset-password")}
                className="text-sm text-blue-600 cursor-pointer text-right"
              >
                Forgot Password?
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 hover:scale-[1.02] active:scale-[0.98] transition transform duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                "Please wait..."
              ) : mode === "login" ? (
                <><LogIn size={16} /> Login</>
              ) : (
                <><UserPlus size={16} /> Sign Up</>
              )}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
};

export default Login;
