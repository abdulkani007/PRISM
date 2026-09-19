import React from 'react';
import { SignInPage, Testimonial } from "@/components/ui/sign-in";

const sampleTestimonials: Testimonial[] = [
  {
    avatarSrc: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250",
    name: "Sarah Chen",
    handle: "@sarahsec",
    text: "PRISM's multi-candidate correlation saved our threat intelligence team dozens of investigation hours."
  },
  {
    avatarSrc: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=250",
    name: "Marcus Johnson",
    handle: "@marcus_cyber",
    text: "The conflict detection engine immediately caught institutional discrepancies other tools completely missed."
  },
  {
    avatarSrc: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=250",
    name: "David Martinez",
    handle: "@david_intel",
    text: "Cryptographic provenance for every public finding makes PRISM audit-ready for compliance reporting."
  },
];

interface SignInPageDemoProps {
  onBackToHome?: () => void;
}

export const SignInPageDemo: React.FC<SignInPageDemoProps> = ({ onBackToHome }) => {
  const handleSignIn = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const data = Object.fromEntries(formData.entries());
    console.log("Sign In submitted:", data);
    alert(`Signed In successfully as ${data.email || 'Investigator'}`);
    if (onBackToHome) onBackToHome();
  };

  const handleGoogleSignIn = () => {
    console.log("Continue with Google clicked");
    alert("Google Identity Federation Authenticated (Demo)");
    if (onBackToHome) onBackToHome();
  };
  
  const handleResetPassword = () => {
    alert("Password reset instructions sent to security administrator.");
  };

  const handleCreateAccount = () => {
    alert("Access request logged for NEURAX HACKATHON 3.0 administrator approval.");
  };

  return (
    <div className="bg-background text-foreground min-h-screen">
      <SignInPage
        heroImageSrc="https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=1200"
        testimonials={sampleTestimonials}
        onSignIn={handleSignIn}
        onGoogleSignIn={handleGoogleSignIn}
        onResetPassword={handleResetPassword}
        onCreateAccount={handleCreateAccount}
        onBackToHome={onBackToHome}
      />
    </div>
  );
};

export default SignInPageDemo;
