import React, { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import axios from "axios";
import { toast } from "react-toastify";

const Navbar = () => {
  const navigate = useNavigate();

  const {
    userData,
    backendUrl,
    setIsLoggedIn,
    setUserData,
  } = useContext(AppContext);

  const handleLogout = async () => {
    try {
      axios.defaults.withCredentials = true;

      const { data } = await axios.post(
        `${backendUrl}/api/auth/logout`
      );

      if (data.success) {
        setIsLoggedIn(false);
        setUserData(null);
        navigate("/");
      }
    } catch (error) {
      console.error(error.response?.data?.message || error.message);
    }
  };

  const sendVerificationOtp = async() => {
    try {
        axios.defaults.withCredentials = true;
        const {data} = await axios.post(`${backendUrl}/api/auth/send-verify-otp`);
        if(data.success){
            navigate('/verify-email')
            toast.success(data.message);
        }
        else{
            toast.error(data.message);
        }
    } catch (error) {
        toast.error(error.message);
    }
  }

  return (
    <div className="w-full flex items-center justify-between px-6 sm:px-24 py-4 fixed top-0 bg-white shadow-md z-50">
      
      {/* Logo */}
      <h1
        onClick={() => navigate("/")}
        className="text-xl font-semibold cursor-pointer"
      >
        Smart Health System
      </h1>

      {/* Right Section */}
      {userData ? (
        <div className="relative group">
          
          {/* Avatar */}
          <div className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-600 text-white font-semibold cursor-pointer">
            {userData?.name?.[0]?.toUpperCase()}
          </div>

          {/* Dropdown */}
          <div className="absolute right-0 hidden group-hover:block bg-white shadow-lg rounded-md w-44 z-20">
            <ul className="text-sm text-gray-700">

              {/* ✅ Show only if NOT verified */}
              {userData?.isAccountVerified === false && (
                <li
                  onClick={sendVerificationOtp}
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                >
                  Verify Email
                </li>
              )}

              <li
                onClick={handleLogout}
                className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
              >
                Logout
              </li>

            </ul>
          </div>
        </div>
      ) : (
        <button
          onClick={() => navigate("/login")}
          className="rounded-full border border-gray-500 px-6 py-2 text-gray-800 hover:bg-gray-100 transition"
        >
          Login
        </button>
      )}
    </div>
  );
};

export default Navbar;