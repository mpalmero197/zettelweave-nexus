import { useNavigate } from "react-router-dom";
import { AccountManagement } from "@/components/AccountManagement";

const Settings = () => {
  const navigate = useNavigate();

  return <AccountManagement onClose={() => navigate('/app')} />;
};

export default Settings;
