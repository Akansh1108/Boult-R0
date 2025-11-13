import React from 'react';
import { AgentPersona, ScreeningResult } from '../types';
import { AGENT_PERSONAS } from '../constants';
import { MicIcon, StopIcon, Spinner } from './icons';

interface AdminControlsProps {
  jobDescription: string;
  setJobDescription: (jd: string) => void;
  agentPersona: AgentPersona;
  setAgentPersona: (persona: AgentPersona) => void;
  isScreening: boolean;
  isLoading: boolean;
  isMicEnabled: boolean;
  startScreening: () => void;
  stopScreening: () => void;
  results: ScreeningResult | null;
}

export const AdminControls: React.FC<AdminControlsProps> = ({
  jobDescription,
  setJobDescription,
  agentPersona,
  setAgentPersona,
  isScreening,
  isLoading,
  isMicEnabled,
  startScreening,
  stopScreening,
  results,
}) => {
  const isStartDisabled = !jobDescription.trim() || isScreening || isLoading;

  return (
    <div className="w-full lg:w-1/3 xl:w-1/4 bg-white p-6 rounded-2xl shadow-lg flex flex-col space-y-6 h-full">
      <div className="flex-grow overflow-y-auto pr-2 space-y-6">
        <h2 className="text-2xl font-bold text-gray-800 border-b pb-2">Screening Setup</h2>
        <div>
          <label htmlFor="job-description" className="block text-sm font-medium text-gray-700 mb-1">
            Job Description
          </label>
          <textarea
            id="job-description"
            rows={8}
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition"
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            disabled={isScreening || isLoading}
          />
        </div>
        <div>
          <label htmlFor="agent-persona" className="block text-sm font-medium text-gray-700 mb-1">
            Agent Persona
          </label>
          <select
            id="agent-persona"
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition bg-white"
            value={agentPersona}
            onChange={(e) => setAgentPersona(e.target.value as AgentPersona)}
            disabled={isScreening || isLoading}
          >
            {AGENT_PERSONAS.map((persona) => (
              <option key={persona.value} value={persona.value}>
                {persona.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex-shrink-0 pt-4 border-t">
        {!isScreening ? (
          <button
            onClick={startScreening}
            disabled={isStartDisabled}
            className={`w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white transition-colors ${
              isStartDisabled ? 'bg-indigo-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
            }`}
          >
            <MicIcon className="w-6 h-6 mr-2" />
            Start Screening
          </button>
        ) : (
          <button
            onClick={stopScreening}
            disabled={isLoading}
            className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
          >
            {isLoading ? (
              <>
                <Spinner />
                Analyzing...
              </>
            ) : (
             <>
               <StopIcon className="w-6 h-6 mr-2" />
               Stop Screening
             </>
            )}
          </button>
        )}
        {!isMicEnabled && <p className="text-xs text-red-500 mt-2 text-center">Microphone permission is required to start screening.</p>}
      </div>
    </div>
  );
};
