
export enum AgentPersona {
  PROFESSIONAL = 'Zephyr',
  FRIENDLY = 'Kore',
  ENERGETIC = 'Puck',
  CALM = 'Charon',
}

export interface TranscriptionEntry {
  speaker: 'user' | 'agent';
  text: string;
}

export interface MatchBreakdown {
    category: string;
    score: number;
    reasoning: string;
}

export interface CandidateInfo {
    name: string;
    contact: string;
    skills: string[];
    experience_years: number;
    current_ctc: string;
    location: string;
    willing_to_relocate: boolean;
    preferred_work_mode: string;
}

export interface ScreeningResult {
    candidate_info: CandidateInfo;
    match_score: number;
    breakdown: MatchBreakdown[];
    explanation: string;
    full_transcript: TranscriptionEntry[];
}
