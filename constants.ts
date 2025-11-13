
import { AgentPersona } from './types';

export const AGENT_PERSONAS: { name: string; value: AgentPersona }[] = [
  { name: 'Professional (Male)', value: AgentPersona.PROFESSIONAL },
  { name: 'Friendly (Female)', value: AgentPersona.FRIENDLY },
  { name: 'Energetic (Male)', value: AgentPersona.ENERGETIC },
  { name: 'Calm (Female)', value: AgentPersona.CALM },
];

export const DEFAULT_JOB_DESCRIPTION = `Job Title: Senior Frontend React Engineer

Location: Bangalore, India (Hybrid)
Experience: 5+ years

Responsibilities:
- Develop and maintain user-facing features using React.js.
- Build reusable components and front-end libraries for future use.
- Translate designs and wireframes into high-quality code.
- Optimize components for maximum performance across a vast array of web-capable devices and browsers.

Required Skills:
- Strong proficiency in JavaScript, including DOM manipulation and the JavaScript object model.
- Thorough understanding of React.js and its core principles.
- Experience with popular React.js workflows (such as Flux or Redux).
- Familiarity with newer specifications of EcmaScript.
- Experience with data structure libraries (e.g., Immutable.js).
- Knowledge of modern authorization mechanisms, such as JSON Web Token.
- Familiarity with modern front-end build pipelines and tools.
- Experience with common front-end development tools such as Babel, Webpack, NPM, etc.
- A knack for benchmarking and optimization.
`;
