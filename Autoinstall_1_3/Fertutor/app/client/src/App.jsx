import React from 'react';
import { Routes, Route } from 'react-router-dom';


import Home from './pages/Home';
import Login from './pages/Login';
import RegisterEmail from './pages/RegisterEmail';
import FinishRegister from './pages/FinishRegister';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
// ... ostale

// Uvezi layout
import MainLayout from './components/MainLayout';
import {Profile} from "./pages/Profile.jsx";
import Interests from "./pages/Interests.jsx";
import Instructors from "./pages/Instructors.jsx";
import InstructorProfile from "./pages/InstructorProfile.jsx";
import Calendar from "./pages/Calendar.jsx";
import Quizzes from "./pages/Quizzes.jsx";
import CreateQuiz from "./pages/CreateQuiz.jsx";
import TakeQuiz from "./pages/TakeQuiz.jsx";
import Gugugaga from "./pages/GuguGaga.jsx";
import Admin from "./pages/Admin.jsx";



function App() {
    return (
        <Routes>

            {/* Rute koje NE koriste layout (full-screen) */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<RegisterEmail />} />
            <Route path="/finish-register" element={<FinishRegister />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/interests-register" element={<Interests />} />
            <Route path="/secret/gugu/gaga" element={<Gugugaga/> } />
            {/* Rute koje KORISTE MainLayout (s navigacijom) */}
            <Route element={<MainLayout />}>
                <Route path="/" element={<Home />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/calendar" element={<Calendar />} />
                <Route path="/instructors" element={<Instructors />} />
                <Route path="/instructors/:id" element={<InstructorProfile />} />
                <Route path="/quizzes" element={<Quizzes />} />
                <Route path="/quizzes/create" element={<CreateQuiz />} />
                <Route path="/admin" element={<Admin />} />
                {/* ... stavi ovdje sve ostale rute koje trebaju header ... */}
            </Route>

            {/* Quiz taking page - full screen without navigation */}
            <Route path="/quizzes/:id" element={<TakeQuiz />} />

        </Routes>
    );
}

export default App;