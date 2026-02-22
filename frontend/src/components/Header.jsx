import React, { useContext } from 'react'
import { AppContext } from '../context/AppContext';

const Header = () => {
    const { userData } = useContext(AppContext);
  return (
    <div className='flex flex-col justify-center items-center h-screen gap-4'>
        <h1 className='text-xl sm:text-4xl font-bold text-center py-4'>Hey {userData ? userData.name : "Developer"}!</h1>

        <p className='text-center text-md sm:text-xl'>Welcome to Smart Health System, your one-stop solution for all your health needs. We are dedicated to providing you with the best healthcare services and resources to help you maintain a healthy lifestyle.</p>

        <button className='px-5 py-3 border border-gray-500 rounded-full hover:bg-gray-100 transition-all cursor-pointer'>Get Started</button>
    </div>
  )
}

export default Header