
import React from 'react';
import { ScreeningResult, MatchBreakdown } from '../types';

interface MatchResultsProps {
  results: ScreeningResult | null;
  isLoading: boolean;
}

const ResultSkeleton = () => (
    <div className="animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 rounded-md w-1/2"></div>
        <div className="space-y-4">
            <div className="h-24 bg-gray-200 rounded-md"></div>
            <div className="h-6 bg-gray-200 rounded-md w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded-md w-full"></div>
            <div className="h-4 bg-gray-200 rounded-md w-5/6"></div>
        </div>
    </div>
);

const ScoreCircle: React.FC<{ score: number }> = ({ score }) => {
  const circumference = 2 * Math.PI * 52;
  const offset = circumference - (score / 100) * circumference;
  let colorClass = 'text-green-500';
  if (score < 75) colorClass = 'text-yellow-500';
  if (score < 50) colorClass = 'text-red-500';

  return (
    <div className="relative w-32 h-32">
      <svg className="w-full h-full" viewBox="0 0 120 120">
        <circle className="text-gray-200" strokeWidth="10" stroke="currentColor" fill="transparent" r="52" cx="60" cy="60" />
        <circle
          className={colorClass}
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r="52"
          cx="60"
          cy="60"
          transform="rotate(-90 60 60)"
        />
      </svg>
      <span className={`absolute inset-0 flex items-center justify-center text-3xl font-bold ${colorClass}`}>
        {score}%
      </span>
    </div>
  );
};

const BreakdownItem: React.FC<{ item: MatchBreakdown }> = ({ item }) => (
    <div className="p-4 bg-gray-50 rounded-lg">
        <div className="flex justify-between items-center mb-1">
            <h4 className="font-semibold text-gray-700">{item.category}</h4>
            <span className="font-bold text-indigo-600">{item.score}/100</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${item.score}%` }}></div>
        </div>
        <p className="text-xs text-gray-500 mt-2">{item.reasoning}</p>
    </div>
);

export const MatchResults: React.FC<MatchResultsProps> = ({ results, isLoading }) => {
  if (isLoading) {
      return (
          <div className="bg-white p-6 rounded-2xl shadow-lg flex-grow">
              <ResultSkeleton />
          </div>
      )
  }
  if (!results) {
    return (
      <div className="bg-white p-6 rounded-2xl shadow-lg flex-grow flex items-center justify-center">
        <p className="text-gray-500">Screening results will be displayed here.</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-2xl shadow-lg flex-grow overflow-y-auto">
      <h2 className="text-2xl font-bold text-gray-800 border-b pb-2 mb-4">Screening Results</h2>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-center gap-6 p-4 bg-indigo-50 rounded-lg">
          <ScoreCircle score={results.match_score} />
          <div>
            <h3 className="text-xl font-bold text-gray-800">Overall Match Score</h3>
            <p className="text-gray-600 mt-1">{results.explanation}</p>
          </div>
        </div>

        <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Candidate Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm p-4 bg-gray-50 rounded-lg">
                <p><strong className="font-medium text-gray-600">Name:</strong> {results.candidate_info.name || 'N/A'}</p>
                <p><strong className="font-medium text-gray-600">Contact:</strong> {results.candidate_info.contact || 'N/A'}</p>
                <p><strong className="font-medium text-gray-600">Experience:</strong> {results.candidate_info.experience_years} years</p>
                <p><strong className="font-medium text-gray-600">Location:</strong> {results.candidate_info.location || 'N/A'}</p>
                <p><strong className="font-medium text-gray-600">Relocate:</strong> {results.candidate_info.willing_to_relocate ? 'Yes' : 'No'}</p>
                 <p><strong className="font-medium text-gray-600">Work Mode:</strong> {results.candidate_info.preferred_work_mode || 'N/A'}</p>
                <p className="col-span-full"><strong className="font-medium text-gray-600">Skills:</strong> {results.candidate_info.skills?.join(', ') || 'N/A'}</p>
            </div>
        </div>

        <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Score Breakdown</h3>
            <div className="space-y-3">
                {results.breakdown.map((item, index) => (
                    <BreakdownItem key={index} item={item} />
                ))}
            </div>
        </div>
      </div>
    </div>
  );
};
