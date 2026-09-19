import React from 'react';
import GptChatInterface from './GptChatInterface';

export default function Dashboard({ currentUser, onSignOut, onBackToHome }) {
  return (
    <GptChatInterface
      currentUser={currentUser}
      onSignOut={onSignOut}
      onBackToHome={onBackToHome}
    />
  );
}
