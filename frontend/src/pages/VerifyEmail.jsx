// import axios from 'axios';
// import React, { useContext, useEffect } from 'react'
// import { AppContext } from '../context/AppContext';
// import { toast } from 'react-toastify';
// import { useNavigate } from 'react-router-dom';

// const VerifyEmail = () => {

//     axios.defaults.withCredentials = true;
//     const {backendUrl, isLoggedIn, userData, getUserData} = useContext(AppContext)
//     const navigate = useNavigate();
//     const inputRefs = React.useRef([]);

//     const handleInput = (e, index) => {
//         if (e.target.value.length > 0 && index < inputRefs.current.length - 1) {
//             inputRefs.current[index + 1].focus();
//         }
//     }

//     const handleKeyDown = (e, index) => {
//         if (e.key === 'Backspace' && e.target.value === '' && index > 0) {
//             inputRefs.current[index - 1].focus();
//         }
//     }

//     const hadlePaste = (e) => {
//         const paste = e.clipboardData.getData('text');
//         const pasteArray = paste.split('');
//         pasteArray.forEach((char, index) => {
//             if(inputRefs.current[index]){
//                 inputRefs.current[index].value = char;
//             }
//         })
//     }

//     const onSubmitHandler = async(e) => {
//         try {
//             e.preventDefault();
//             const otpArray = inputRefs.current.map(e => e.value);
//             const otp = otpArray.join('');

//             const {data} = await axios.post(`${backendUrl}/api/auth/verify-account`, {otp});

//             if(data.success){
//                 toast.success(data.message);
//                 getUserData();
//                 navigate('/')
//             }
//             else{
//                 toast.error(data.message)
//             }
//         } catch (error) {
//             toast.error(error.message);
//         }
//     }
    
//     useEffect(() => {
//         isLoggedIn && userData && userData.isAccountVerified && navigate('/')
//     },[isLoggedIn, userData])
//     return (
//         <div className='flex items-center justify-center min-h-screen px-6 sm:px-0 bg-gradient-to-br from-blue-200 to-purple-400'>

//             <form onSubmit={onSubmitHandler} className='bg-slate-900 p-8 rounded-lg shadow-lg w-96 text-sm'>
//                 <h1 className='text-white text-2xl font-semibold text-center mb-4 '>Email Verification OTP</h1>
//                 <p className='text-center mb-6 text-indigo-300'>Enter the 6-digit OTP sent to yout Email</p>

//                 <div className='flex justify-between mb-8' onPaste={hadlePaste}>
//                     {Array(6).fill(0).map((_, index) => (
//                         <input type="text" maxLength='1' key={index} required
//                             className='w-12 h-12 bg-[#333A5C] text-white text-center text-xl rounded-md'
//                             ref={e => inputRefs.current[index] = e}
//                             onInput={(e) => handleInput(e, index)}
//                             onKeyDown={(e) => handleKeyDown(e, index)} />
//                     ))}
//                 </div>
//                 <button className='w-full py-3 bg-gradient-to-r from-indigo-500 to-indigo-900 rounded-full'>Verify Email</button>
//             </form>

//         </div>
//     )
// }

// export default VerifyEmail

import axios from "axios";
import React, { useContext, useEffect, useRef, useState } from "react";
import { AppContext } from "../context/AppContext";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

const VerifyEmail = () => {
  const { backendUrl, isLoggedIn, userData, getUserData } =
    useContext(AppContext);

  const navigate = useNavigate();
  const inputRefs = useRef([]);
  const [loading, setLoading] = useState(false);

  axios.defaults.withCredentials = true;

  // Move to next input automatically
  const handleInput = (e, index) => {
    const value = e.target.value;

    // Allow only digits
    if (!/^\d$/.test(value)) {
      e.target.value = "";
      return;
    }

    if (index < inputRefs.current.length - 1) {
      inputRefs.current[index + 1].focus();
    }
  };

  // Move back on backspace
  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace" && e.target.value === "" && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  // Handle paste
  const handlePaste = (e) => {
    e.preventDefault();
    const paste = e.clipboardData.getData("text").replace(/\D/g, "");
    const pasteArray = paste.split("").slice(0, 6);

    pasteArray.forEach((char, index) => {
      if (inputRefs.current[index]) {
        inputRefs.current[index].value = char;
      }
    });

    // Focus last filled input
    if (pasteArray.length > 0) {
      inputRefs.current[pasteArray.length - 1].focus();
    }
  };

  const onSubmitHandler = async (e) => {
    e.preventDefault();

    const otpArray = inputRefs.current.map((input) => input.value);
    const otp = otpArray.join("");

    if (otp.length !== 6) {
      toast.error("Please enter complete 6-digit OTP");
      return;
    }

    try {
      setLoading(true);

      const { data } = await axios.post(
        `${backendUrl}/api/auth/verify-account`,
        { otp }
      );

      if (data.success) {
        toast.success(data.message);
        await getUserData();
        navigate("/");
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // Redirect if already verified
  useEffect(() => {
    if (isLoggedIn && userData?.isAccountVerified) {
      navigate("/");
    }
  }, [isLoggedIn, userData, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen px-6 sm:px-0 bg-gradient-to-br from-blue-200 to-purple-400">
      <form
        onSubmit={onSubmitHandler}
        className="bg-slate-900 p-8 rounded-lg shadow-lg w-96 text-sm"
      >
        <h1 className="text-white text-2xl font-semibold text-center mb-4">
          Email Verification OTP
        </h1>

        <p className="text-center mb-6 text-indigo-300">
          Enter the 6-digit OTP sent to your Email
        </p>

        <div className="flex justify-between mb-8" onPaste={handlePaste}>
          {Array(6)
            .fill(0)
            .map((_, index) => (
              <input
                key={index}
                type="text"
                inputMode="numeric"
                maxLength="1"
                required
                className="w-12 h-12 bg-[#333A5C] text-white text-center text-xl rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                ref={(el) => (inputRefs.current[index] = el)}
                onInput={(e) => handleInput(e, index)}
                onKeyDown={(e) => handleKeyDown(e, index)}
              />
            ))}
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`w-full py-3 rounded-full text-white transition ${
            loading
              ? "bg-gray-500 cursor-not-allowed"
              : "bg-gradient-to-r from-indigo-500 to-indigo-900 hover:opacity-90"
          }`}
        >
          {loading ? "Verifying..." : "Verify Email"}
        </button>
      </form>
    </div>
  );
};

export default VerifyEmail;