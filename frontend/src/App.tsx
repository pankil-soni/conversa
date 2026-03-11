import { useAuth } from "./hooks/use-auth";
import { Loader } from "lucide-react"
import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import MainLayout from "./MainLayout";
import SignUp from "./pages/SignUp";
import Login from "./pages/Login";
import DashboardLayout from "./components/layout/DashboardLayout";
import Conversations from "./pages/Conversations";
import ConversationDetail from "./pages/ConversationDetail";
import User from "./pages/User";
import ConversationLayout from "./components/layout/ConversationLayout";
import UserProfile from "./pages/UserProfile";
import StarredMessages from "./pages/StarredMessages";

export function App() {

  const { isUserLoading } = useAuth();

  if (isUserLoading) {
    return (
      <div className="flex gap-2 min-h-dvh items-center justify-center p-6">
        <p className="text-lg">Please wait while we authenticate you</p>
        <Loader className="animate-spin" />
      </div>
    )
  }

  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route element={<DashboardLayout />}>
          <Route path="/user" element={<User />} />
          <Route path="/user/profile" element={<UserProfile />} />
          <Route path="/user/starred" element={<StarredMessages />} />
          <Route element={<ConversationLayout />}>
            <Route path="/user/conversations" element={<Conversations />} />
            <Route path="/user/conversations/:id" element={<ConversationDetail />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  )
}

export default App
