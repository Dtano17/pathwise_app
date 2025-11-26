import { useEffect } from "react";
import { useLocation } from "wouter";

export default function PrivacyPage() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Redirect to the Privacy Policy section on the Terms page
    setLocation("/terms#privacy-policy");
  }, [setLocation]);

  return null;
}
