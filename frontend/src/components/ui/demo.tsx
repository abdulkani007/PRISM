import React, { useState } from 'react';
import { SignInPage, Testimonial } from "@/components/ui/sign-in";
import {
  auth,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
} from "@/lib/firebase";
import loginImg from '@/assets/login.png';

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
  onAuthSuccess?: (user: any) => void;
}

export const SignInPageDemo: React.FC<SignInPageDemoProps> = ({ onBackToHome, onAuthSuccess }) => {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 1. Real Google Authentication via Firebase
  const handleGoogleSignIn = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      if (onAuthSuccess) onAuthSuccess(user);
    } catch (err: any) {
      console.error("Google Sign In Error:", err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError("Sign in popup was closed before completing.");
      } else if (err.code === 'auth/cancelled-popup-request') {
        setError("Popup request cancelled.");
      } else {
        setError(err.message || "Failed to authenticate with Google.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Email & Password Sign In via Firebase
  const handleSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);
    const formData = new FormData(event.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      if (onAuthSuccess) onAuthSuccess(userCredential.user);
    } catch (err: any) {
      console.error("Email Sign In Error:", err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        setError("Invalid email or password credentials.");
      } else if (err.code === 'auth/wrong-password') {
        setError("Incorrect password.");
      } else {
        setError(err.message || "Failed to sign in.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Create Account via Firebase
  const handleCreateAccount = async () => {
    const email = prompt("Enter email to register for PRISM:");
    if (!email) return;
    const password = prompt("Enter password (minimum 6 characters):");
    if (!password) return;

    setError(null);
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      alert(`Account created for ${userCredential.user.email}!`);
      if (onAuthSuccess) onAuthSuccess(userCredential.user);
    } catch (err: any) {
      setError(err.message || "Failed to create account.");
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Password Reset via Firebase
  const handleResetPassword = async () => {
    const email = prompt("Enter your account email to receive reset instructions:");
    if (!email) return;
    try {
      await sendPasswordResetEmail(auth, email);
      alert(`Password reset link sent to ${email}`);
    } catch (err: any) {
      setError(err.message || "Failed to send reset email.");
    }
  };

  return (
    <div className="bg-background text-foreground min-h-screen">
      <SignInPage
        heroImageSrc={loginImg}
        testimonials={sampleTestimonials}
        onSignIn={handleSignIn}
        onGoogleSignIn={handleGoogleSignIn}
        onResetPassword={handleResetPassword}
        onCreateAccount={handleCreateAccount}
        onBackToHome={onBackToHome}
        error={error}
        isLoading={isLoading}
      />
    </div>
  );
};

export default SignInPageDemo;
