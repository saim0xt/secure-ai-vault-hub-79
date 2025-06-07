
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      // User is authenticated, show dashboard
      return;
    } else {
      // User not authenticated, redirect to auth
      navigate('/auth');
    }
  }, [isAuthenticated, navigate]);

  // This component will redirect, so we can show a loading state
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-white text-xl">Loading Vaultix...</div>
    </div>
  );
};

export default Index;
