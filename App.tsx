import React, { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveSession, LiveServerMessage, Modality, Type, Blob, GenerateContentResponse } from "@google/genai";
import { AgentPersona, TranscriptionEntry, ScreeningResult } from './types';
import { AGENT_PERSONAS, DEFAULT_JOB_DESCRIPTION } from './constants';
import { AdminControls } from './components/AdminControls';
import { TranscriptionView } from './components/TranscriptionView';
import { MatchResults } from './components/MatchResults';

// --- Audio Utility Functions ---
function encode(bytes: Uint8Array): string {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function decode(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

async function decodeAudioData(
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
    }
    return buffer;
}

function createBlob(data: Float32Array): Blob {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
        int16[i] = data[i] * 32768;
    }
    return {
        data: encode(new Uint8Array(int16.buffer)),
        mimeType: 'audio/pcm;rate=16000',
    };
}


const App: React.FC = () => {
    // --- State Management ---
    const [jobDescription, setJobDescription] = useState<string>(DEFAULT_JOB_DESCRIPTION);
    const [agentPersona, setAgentPersona] = useState<AgentPersona>(AgentPersona.PROFESSIONAL);
    
    const [isScreening, setIsScreening] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [isMicEnabled, setIsMicEnabled] = useState<boolean>(true);

    const [transcriptionHistory, setTranscriptionHistory] = useState<TranscriptionEntry[]>([]);
    const [currentInput, setCurrentInput] = useState<string>('');
    const [currentOutput, setCurrentOutput] = useState<string>('');
    const [results, setResults] = useState<ScreeningResult | null>(null);

    // --- Refs for non-render state ---
    const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const nextStartTimeRef = useRef<number>(0);
    const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

    // --- Gemini API and System Prompt ---
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    const systemInstruction = `You are the Boult R0 Screening Assistant. Your role is to conduct automated initial screenings for candidates. Engage interactively with the candidate in a conversational manner based on the provided job description. Your goal is to gather information about the candidate's skills, years of experience, current CTC, location, willingness to relocate, preferred work mode (remote/hybrid/office), and contact information (email/phone). Ask clarifying questions if needed. Keep your responses concise and professional.
    Job Description:
    ---
    ${jobDescription}
    ---
    Start by greeting the candidate and asking for their name.`;
    
    const resetState = () => {
      setTranscriptionHistory([]);
      setCurrentInput('');
      setCurrentOutput('');
      setResults(null);
      setError(null);
    }
    
    const handleStartScreening = useCallback(async () => {
        resetState();
        setIsLoading(true);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;
            setIsMicEnabled(true);
            
            outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            nextStartTimeRef.current = 0;
            audioSourcesRef.current = new Set();
            
            const sessionPromise = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: agentPersona } } },
                    systemInstruction,
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                },
                callbacks: {
                    onopen: () => {
                        const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
                        audioContextRef.current = inputAudioContext;

                        const source = inputAudioContext.createMediaStreamSource(stream);
                        mediaStreamSourceRef.current = source;

                        const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
                        scriptProcessorRef.current = scriptProcessor;

                        scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            const pcmBlob = createBlob(inputData);
                            sessionPromiseRef.current?.then((session) => {
                                session.sendRealtimeInput({ media: pcmBlob });
                            });
                        };
                        source.connect(scriptProcessor);
                        scriptProcessor.connect(inputAudioContext.destination);
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        if (message.serverContent?.inputTranscription) {
                            setCurrentInput(prev => prev + message.serverContent!.inputTranscription!.text);
                        }
                        if (message.serverContent?.outputTranscription) {
                            setCurrentOutput(prev => prev + message.serverContent!.outputTranscription!.text);
                        }
                        if (message.serverContent?.turnComplete) {
                            setTranscriptionHistory(prev => {
                                const newHistory = [...prev];
                                if (currentInput.trim()) newHistory.push({ speaker: 'user', text: currentInput });
                                if (currentOutput.trim()) newHistory.push({ speaker: 'agent', text: currentOutput });
                                return newHistory;
                            });
                            setCurrentInput('');
                            setCurrentOutput('');
                        }
                        
                        const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                        if (audioData && outputAudioContextRef.current) {
                            const ctx = outputAudioContextRef.current;
                            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
                            const audioBuffer = await decodeAudioData(decode(audioData), ctx, 24000, 1);
                            const source = ctx.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(ctx.destination);
                            source.addEventListener('ended', () => { audioSourcesRef.current.delete(source); });
                            source.start(nextStartTimeRef.current);
                            nextStartTimeRef.current += audioBuffer.duration;
                            audioSourcesRef.current.add(source);
                        }
                    },
                    onerror: (e: ErrorEvent) => {
                        setError(`Session error: ${e.message}`);
                        setIsScreening(false);
                    },
                    onclose: () => {
                       // Session closed by server.
                    },
                }
            });
            sessionPromiseRef.current = sessionPromise;
            setIsScreening(true);
        } catch (err) {
            setError('Failed to start screening. Please check microphone permissions.');
            setIsMicEnabled(false);
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [ai.live, agentPersona, systemInstruction, currentInput, currentOutput]);

    const stopAudioPlayback = () => {
        if(outputAudioContextRef.current) {
            for (const source of audioSourcesRef.current.values()) {
                source.stop();
            }
            audioSourcesRef.current.clear();
            nextStartTimeRef.current = 0;
            outputAudioContextRef.current.close();
            outputAudioContextRef.current = null;
        }
    };

    const stopMicrophone = () => {
        mediaStreamRef.current?.getTracks().forEach(track => track.stop());
        mediaStreamSourceRef.current?.disconnect();
        scriptProcessorRef.current?.disconnect();
        audioContextRef.current?.close();
        mediaStreamRef.current = null;
        mediaStreamSourceRef.current = null;
        scriptProcessorRef.current = null;
        audioContextRef.current = null;
    };
    
    const getFinalAnalysis = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        
        // Finalize any partial transcriptions
        const finalTranscript = [...transcriptionHistory];
        if (currentInput.trim()) finalTranscript.push({ speaker: 'user', text: currentInput });
        if (currentOutput.trim()) finalTranscript.push({ speaker: 'agent', text: currentOutput });
        
        setCurrentInput('');
        setCurrentOutput('');
        setTranscriptionHistory(finalTranscript);

        const prompt = `Based on the following job description and conversation transcript, extract the candidate's information into a structured JSON format. Provide a match score from 0-100, a breakdown of the score by category (e.g., Skills, Experience, Location), and a brief explanation for your reasoning.
        Job Description:
        ---
        ${jobDescription}
        ---
        Conversation Transcript:
        ---
        ${finalTranscript.map(t => `${t.speaker === 'user' ? 'Candidate' : 'Interviewer'}: ${t.text}`).join('\n')}
        ---
        Respond ONLY with the JSON object. Do not include any other text or markdown formatting.`;

        const responseSchema = {
          type: Type.OBJECT,
          properties: {
            candidate_info: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                contact: { type: Type.STRING },
                skills: { type: Type.ARRAY, items: { type: Type.STRING } },
                experience_years: { type: Type.NUMBER },
                current_ctc: { type: Type.STRING },
                location: { type: Type.STRING },
                willing_to_relocate: { type: Type.BOOLEAN },
                preferred_work_mode: { type: Type.STRING },
              },
            },
            match_score: { type: Type.INTEGER },
            breakdown: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  category: { type: Type.STRING },
                  score: { type: Type.INTEGER },
                  reasoning: { type: Type.STRING },
                }
              }
            },
            explanation: { type: Type.STRING }
          }
        };

        try {
            const response: GenerateContentResponse = await ai.models.generateContent({
                model: 'gemini-2.5-pro',
                contents: prompt,
                config: { responseMimeType: 'application/json', responseSchema }
            });
            const resultJson = JSON.parse(response.text.trim());
            const screeningResult: ScreeningResult = { ...resultJson, full_transcript: finalTranscript };
            setResults(screeningResult);
        } catch (e) {
            console.error("Failed to get final analysis:", e);
            setError("Could not get final analysis from AI model.");
        } finally {
            setIsLoading(false);
        }
    }, [ai.models, jobDescription, transcriptionHistory, currentInput, currentOutput]);

    const handleStopScreening = useCallback(async () => {
        setIsScreening(false);
        
        try {
            const session = await sessionPromiseRef.current;
            session?.close();
        } catch (e) {
            console.error("Error closing session:", e);
        } finally {
            sessionPromiseRef.current = null;
            stopAudioPlayback();
            stopMicrophone();
            await getFinalAnalysis();
        }
    }, [getFinalAnalysis]);
    
    useEffect(() => {
        navigator.mediaDevices.enumerateDevices()
            .then(devices => {
                const hasMic = devices.some(device => device.kind === 'audioinput');
                if(!hasMic) setIsMicEnabled(false);
            })
            .catch(() => setIsMicEnabled(false));
    }, []);

    return (
        <div className="min-h-screen bg-gray-100 font-sans text-gray-900 flex flex-col items-center p-4 lg:p-8">
            <header className="w-full max-w-7xl mb-6 text-center">
                <h1 className="text-4xl font-bold text-gray-800">Boult R0 Screening Assistant</h1>
                <p className="text-gray-600 mt-1">Automated initial candidate screening powered by Gemini.</p>
            </header>
            
            {error && (
              <div className="w-full max-w-7xl p-4 mb-4 bg-red-100 border border-red-400 text-red-700 rounded-lg" role="alert">
                <strong className="font-bold">Error: </strong>
                <span className="block sm:inline">{error}</span>
              </div>
            )}
            
            <main className="w-full max-w-7xl flex-grow flex flex-col lg:flex-row gap-6">
                <AdminControls
                    jobDescription={jobDescription}
                    setJobDescription={setJobDescription}
                    agentPersona={agentPersona}
                    setAgentPersona={setAgentPersona}
                    isScreening={isScreening}
                    isLoading={isLoading}
                    isMicEnabled={isMicEnabled}
                    startScreening={handleStartScreening}
                    stopScreening={handleStopScreening}
                    results={results}
                />
                <div className="w-full lg:w-2/3 xl:w-3/4 flex flex-col gap-6">
                    <TranscriptionView 
                      history={transcriptionHistory} 
                      currentInput={currentInput} 
                      currentOutput={currentOutput}
                      isScreening={isScreening}
                    />
                    <MatchResults results={results} isLoading={isLoading && !isScreening} />
                </div>
            </main>
        </div>
    );
};

export default App;
