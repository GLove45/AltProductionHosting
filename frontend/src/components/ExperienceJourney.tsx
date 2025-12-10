import { useMemo, useState } from 'react';

type JourneyStage = {
  id: string;
  title: string;
  narrative: string;
  prompts: string[];
  annotations: string[];
};

type PaletteMood = {
  id: string;
  name: string;
  gradient: string;
  description: string;
  accents: string[];
};

type InterfaceLever = {
  id: string;
  label: string;
  detail: string;
  benefit: string;
};

const journeyStages: JourneyStage[] = [
  {
    id: 'intent',
    title: 'Intent mapping',
    narrative:
      'Begin with intention: capture what your visitor needs in the first eight seconds with decisive copy and guided focus.',
    prompts: ['Lead with one action', 'Prime contrast for immediate scannability', 'Keep the eye moving with orbital glow'],
    annotations: [
      'Use a 10–15% lighter accent to spotlight the main CTA.',
      'Anchor the hero copy to a soft gradient flare that subtly orbits every 12s.',
      'Keep nav microcopy short and purposeful to reduce friction.'
    ]
  },
  {
    id: 'compose',
    title: 'Spatial composition',
    narrative:
      'Lay out cards, panels, and story beats so users feel the rhythm of your brand. Let the grid breathe and bend with intent.',
    prompts: ['Pad with 1.4–1.6 line height', 'Layer glassmorphism sparingly', 'Add micro shadows for tactility'],
    annotations: [
      'Use 4–12px parallax on media blocks to imply depth without motion sickness.',
      'Give cards a quiet 1px inner stroke so edges stay crisp on dark backgrounds.',
      'Let supporting CTAs float inside soft gradients to invite exploration.'
    ]
  },
  {
    id: 'animate',
    title: 'Adaptive animation',
    narrative:
      'Guide momentum with motion: accelerate entry, ease into focus, and exhale on exit so every transition feels human.',
    prompts: ['Ease: cubic-bezier(0.4, 0, 0.2, 1)', 'Delay loops under 14s', 'Sequence hero → cards → accents'],
    annotations: [
      'Stagger card entry by 60–90ms to create a cascade instead of a flash.',
      'Tie accent glow to scroll position for contextual emphasis.',
      'Offer a “reduce motion” toggle that respects accessibility preferences.'
    ]
  },
  {
    id: 'refine',
    title: 'Guided refinement',
    narrative:
      'Hand users the scalpel: show them what to tweak, why it matters, and how it changes the feeling of their page.',
    prompts: ['Suggest palette swaps live', 'Explain contrast math', 'Auto-write aria labels'],
    annotations: [
      'Surface before/after snapshots with color-blind safe previews.',
      'Annotate components with tone-of-voice notes to keep copy consistent.',
      'Package changes as “scenes” users can save, remix, and publish.'
    ]
  }
];

const paletteMoods: PaletteMood[] = [
  {
    id: 'aurora',
    name: 'Aurora pulse',
    gradient: 'linear-gradient(135deg, #1f1630 0%, #291a45 30%, #0f2539 70%, #0c1f2e 100%)',
    description: 'A cinematic midnight gradient that pairs neon pink with cool cyan for confident hero moments.',
    accents: ['#ff4d9d', '#57e1ff', '#c6f68d']
  },
  {
    id: 'solstice',
    name: 'Solstice bloom',
    gradient: 'linear-gradient(135deg, #271400 0%, #2f1d06 30%, #3b180f 70%, #2a0f10 100%)',
    description: 'Warm amber and magenta for brands that want an editorial, hospitality-forward glow.',
    accents: ['#ff9f65', '#ff69b4', '#ffe8b8']
  },
  {
    id: 'glacier',
    name: 'Glacier hush',
    gradient: 'linear-gradient(145deg, #0a141c 0%, #0c1f2a 35%, #0a2f3c 70%, #0a1c26 100%)',
    description: 'Nordic blues and teal gradients that keep dashboards calm while highlights stay crystalline.',
    accents: ['#64b3f4', '#8cf3ff', '#c5f1ff']
  }
];

const interfaceLevers: InterfaceLever[] = [
  {
    id: 'contrast',
    label: 'Smart contrast',
    detail: 'Monitors WCAG AA contrast as users drag sliders or pick backgrounds.',
    benefit: 'Prevents unreadable UI while keeping gradients lush and expressive.'
  },
  {
    id: 'motion',
    label: 'Adaptive motion',
    detail: 'Sequences transitions based on scroll intent and reduces motion when requested.',
    benefit: 'Feels alive without overwhelming visitors who prefer calm interfaces.'
  },
  {
    id: 'assist',
    label: 'Contextual assist',
    detail: 'Suggests microcopy, aria labels, and layout tweaks inline as components are edited.',
    benefit: 'Gives teams guidance without forcing them to leave the canvas or read docs.'
  }
];

export const ExperienceJourney = () => {
  const [activeStage, setActiveStage] = useState<JourneyStage>(journeyStages[0]);
  const [selectedMood, setSelectedMood] = useState<PaletteMood>(paletteMoods[0]);
  const [intensity, setIntensity] = useState(72);

  const moodNote = useMemo(() => {
    if (intensity > 82) {
      return 'Bold gradients with crisp neon edges — ideal for launch campaigns and hero takeovers.';
    }
    if (intensity < 55) {
      return 'Dialed-back glow that keeps attention on the story, perfect for product education flows.';
    }
    return 'Balanced saturation with enough warmth to highlight CTAs and annotation callouts.';
  }, [intensity]);

  return (
    <section className="experience-journey" aria-labelledby="experience-journey-heading">
      <div className="experience-header">
        <div>
          <p className="eyebrow">Immersive front-end conductor</p>
          <h2 id="experience-journey-heading">Guide every visitor through a curated visual story</h2>
          <p className="experience-lead">
            Scripted JavaScript helpers choreograph gradients, transitions, and adaptive prompts so users feel seen while
            they design. Every suggestion comes with annotations your team can tweak or export into the canvas.
          </p>
        </div>
        <div className="journey-meter">
          <div className="meter-header">
            <span>Animation intensity</span>
            <strong>{intensity}%</strong>
          </div>
          <input
            aria-label="Animation intensity"
            type="range"
            min={30}
            max={100}
            value={intensity}
            onChange={(event) => setIntensity(Number(event.target.value))}
          />
          <p className="meter-note">{moodNote}</p>
        </div>
      </div>

      <div className="journey-grid">
        <div className="stage-stack" aria-label="Journey stages">
          {journeyStages.map((stage) => (
            <button
              key={stage.id}
              type="button"
              className={`stage-card ${stage.id === activeStage.id ? 'active' : ''}`}
              onClick={() => setActiveStage(stage)}
            >
              <span className="stage-pill">{stage.title}</span>
              <p className="stage-narrative">{stage.narrative}</p>
              <div className="stage-prompts">
                {stage.prompts.map((prompt) => (
                  <span key={prompt} className="prompt-chip">
                    {prompt}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>

        <div className="stage-annotations" aria-live="polite">
          <div className="annotation-header">
            <p className="eyebrow">Live annotations</p>
            <h3>{activeStage.title} toolkit</h3>
            <p className="annotation-lead">{activeStage.narrative}</p>
          </div>
          <ul>
            {activeStage.annotations.map((note) => (
              <li key={note}>
                <span className="annotation-bullet" aria-hidden="true" />
                <div>
                  <p className="annotation-text">{note}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="palette-row">
        <div className="palette-stack" aria-label="Palette suggestions">
          {paletteMoods.map((mood) => (
            <button
              key={mood.id}
              type="button"
              className={`palette-card ${selectedMood.id === mood.id ? 'selected' : ''}`}
              style={{ background: mood.gradient }}
              onClick={() => setSelectedMood(mood)}
            >
              <div className="palette-header">
                <span className="palette-label">{mood.name}</span>
                <div className="palette-accents">
                  {mood.accents.map((accent) => (
                    <span key={accent} className="accent-swatch" style={{ background: accent }} aria-hidden="true" />
                  ))}
                </div>
              </div>
              <p className="palette-description">{mood.description}</p>
            </button>
          ))}
        </div>

        <div className="interface-levers" aria-label="Adaptive guidance">
          <div className="lever-header">
            <p className="eyebrow">Adaptive helpers</p>
            <h3>JavaScript cues that mentor your users</h3>
            <p className="annotation-lead">
              Blend color theory, motion, and accessibility hints in real time so every tweak feels intentional.
            </p>
          </div>
          <div className="lever-grid">
            {interfaceLevers.map((lever) => (
              <article key={lever.id} className="lever-card">
                <div>
                  <p className="lever-label">{lever.label}</p>
                  <p className="lever-detail">{lever.detail}</p>
                </div>
                <p className="lever-benefit">{lever.benefit}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
