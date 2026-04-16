import React from 'react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../firebase';
import { Package } from 'lucide-react';
import Image from 'next/image';

export default function Auth() {
  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error signing in", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full text-center">
        <div className="flex justify-center mb-6 text-blue-600">
          <Package size={64} />
        </div>
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Estoque Zap</h1>
        <p className="text-gray-500 mb-8">Faça login para gerenciar seu estoque</p>
        <button
          onClick={handleLogin}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors flex justify-center items-center gap-3"
        >
          <div className="w-6 h-6 bg-white rounded-full p-1 flex items-center justify-center">
            <Image src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" width={24} height={24} referrerPolicy="no-referrer" />
          </div>
          Entrar com Google
        </button>
      </div>
    </div>
  );
}
