
import React, { useEffect, useRef } from 'react';
import { TranscriptionEntry } from '../types';
import { UserIcon, BotIcon } from './icons';

interface TranscriptionViewProps {
  history: TranscriptionEntry[];
  currentInput: string;
  currentOutput: string;
  isScreening: boolean;
}

const TranscriptionMessage: React.FC<{ entry: TranscriptionEntry }> = ({ entry }) => {
  const isUser = entry.speaker === 'user';
  return (
    <div className={`flex items-start gap-3 my-4 ${isUser ? 'justify-end' : ''}`}>
      {!isUser && <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-600 text-white flex items-center justify-center"><BotIcon className="w-5 h-5" /></div>}
      <div className={`p-3 rounded-xl max-w-lg ${isUser ? 'bg-indigo-500 text-white rounded-br-none' : 'bg-gray-200 text-gray-800 rounded-bl-none'}`}>
        <p className="text-sm">{entry.text}</p>
      </div>
      {isUser && <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center"><UserIcon className="w-5 h-5" /></div>}
    </div>
  );
};


export const TranscriptionView: React.FC<TranscriptionViewProps> = ({ history, currentInput, currentOutput, isScreening }) => {
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, currentInput, currentOutput]);

  return (
    <div className="bg-white p-6 rounded-2xl shadow-lg flex-grow flex flex-col">
      <h2 className="text-2xl font-bold text-gray-800 border-b pb-2 mb-4 flex-shrink-0">Live Transcription</h2>
      <div className="flex-grow overflow-y-auto pr-2">
        {history.length === 0 && !isScreening && (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p>Screening session will appear here.</p>
          </div>
        )}
        {history.map((entry, index) => (
          <TranscriptionMessage key={index} entry={entry} />
        ))}
        {currentInput && <TranscriptionMessage entry={{ speaker: 'user', text: currentInput }} />}
        {currentOutput && <TranscriptionMessage entry={{ speaker: 'agent', text: currentOutput }} />}
        <div ref={endOfMessagesRef} />
      </div>
       {isScreening && (
        <div className="flex-shrink-0 pt-4 border-t border-gray-200 flex items-center justify-center space-x-2 text-gray-500">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
          <span>Listening...</span>
        </div>
      )}
    </div>
  );
};
