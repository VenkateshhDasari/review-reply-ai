import type { Tone } from '../types';

interface ToneSelectorProps {
  value: Tone;
  onChange: (tone: Tone) => void;
}

const toneOptions: { value: Tone; label: string; description: string }[] = [
  { value: 'friendly', label: 'Friendly', description: 'Warm, conversational, and personable.' },
  { value: 'professional', label: 'Professional', description: 'Formal and concise.' },
  { value: 'apologetic', label: 'Apologetic', description: 'Emphasizes empathy and accountability.' },
  { value: 'promotional', label: 'Promotional', description: 'Highlights your business offerings.' }
];

export const ToneSelector = ({ value, onChange }: ToneSelectorProps) => {
  return (
    <div className="tone-selector">
      <p className="field-label">Response tone</p>
      <div className="tone-grid">
        {toneOptions.map(option => (
          <button
            key={option.value}
            type="button"
            className={`tone-pill ${option.value === value ? 'tone-pill-active' : ''}`}
            onClick={() => onChange(option.value)}
          >
            <span className="tone-title">{option.label}</span>
            <span className="tone-description">{option.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

