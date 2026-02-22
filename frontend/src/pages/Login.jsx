import React, { useContext, useState } from 'react'
import { data, useNavigate } from 'react-router-dom';
import { AppContext } from '../context/AppContext';
import axios from 'axios';
import { toast } from 'react-toastify';

const Login = () => {

    const navigate = useNavigate();

    const { backendUrl, setIsLoggedIn, getUserData } = useContext(AppContext);
    // console.log("Backend URL:", backendUrl);

    const [state, setState] = useState('Sign Up');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const onSubmitHandler = async (e) => {
        try {
            e.preventDefault();
            axios.defaults.withCredentials = true;

            if (state === 'Sign Up') {
                const { data } = await axios.post(`${backendUrl}/api/auth/register`, {
                    name, email, password
                });
                if (data.success) {
                    setIsLoggedIn(true);
                    getUserData()
                    navigate('/')
                }
                else {
                    toast.error(data.message);
                }

            }
            else {
                const { data } = await axios.post(`${backendUrl}/api/auth/login`, {
                    email, password
                });
                if (data.success) {
                    setIsLoggedIn(true);
                    getUserData()
                    navigate('/')
                }
                else {
                    toast.error(data.message);
                }
            }
        } catch (error) {
            toast.error(error.response?.data?.message || error.message);
        }
    }

    return (
        <div className='flex items-center justify-center min-h-screen px-6 sm:px-0 bg-gradient-to-br from-blue-200 to-purple-400'>
            <div className='bg-slate-900 p-10 rounded-lg shadow-lg w-full sm:w-96 text-indigo-300 text-sm'>
                <h2 className='text-3xl font-semibold text-white text-center mb-3'>{state === 'Sign Up' ? 'Create account' : 'Login '}</h2>
                <p className='text-center mb-5 text-sm '>
                    {state === 'Sign Up' ? 'Create an account' : 'Login to your account'}
                </p>

                <form onSubmit={onSubmitHandler}>
                    {state === 'Sign Up' && (
                        <div className='mb-4 flex items-center gap-3 w-full px-5 py-2.5 rounded-full bg-[#333A5C] '>
                            <input
                                value={name} onChange={(e) => setName(e.target.value)}
                                className='bg-transparent outline-none w-full cursor-pointer' type="text"
                                placeholder='Enter name' required
                            />
                        </div>
                    )}

                    <div className='mb-4 flex items-center gap-3 w-full px-5 py-2.5 rounded-full bg-[#333A5C] '>
                        <input
                            value={email} onChange={(e) => setEmail(e.target.value)}
                            className='bg-transparent outline-none w-full cursor-pointer' type="email"
                            placeholder='Enter email id' required
                        />
                    </div>
                    <div className='mb-4 flex items-center gap-3 w-full px-5 py-2.5 rounded-full bg-[#333A5C] '>
                        <input
                            value={password} onChange={(e) => setPassword(e.target.value)}
                            className='bg-transparent outline-none w-full cursor-pointer' type="password"
                            placeholder='Enter password' required />
                    </div>

                    <p onClick={() => navigate('/reset-password')} className='mb-3 text-indigo-500 cursor-pointer'>Forgot Password</p>

                    <button className='w-full py-2.5 rounded-full cursor-pointer bg-gradient-to-r from-indigo-500 to-indigo-900 text-white font-medium mb-4'>{state}</button>
                </form>

                {state === 'Sign Up' ? (
                    <p>Already have an accout?{' '}
                        <span className='text-indigo-500 cursor-pointer underline' onClick={() => setState('Login')}>Login here</span>
                    </p>
                ) : (
                    <p>Don't have an accout?{' '}
                        <span className='text-indigo-500 cursor-pointer underline' onClick={() => setState('Sign Up')}>Sign Up here</span>
                    </p>
                )}


            </div>
        </div>
    )
}

export default Login