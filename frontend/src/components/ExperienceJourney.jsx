import { useMemo, useState } from 'react';

const journeyStages = [
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

const paletteMoods = [
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

const interfaceLevers = [
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
  const [activeStage, setActiveStage] = useState(journeyStages[0]);
  const [selectedMood, setSelectedMood] = useState(paletteMoods[0]);

  const interfaceGrid = useMemo(() => interfaceLevers, []);

  return (
    <section className="experience-journey" id="analytics">
      <div className="section-header">
        <h2>Experience engineering journey</h2>
        <p>
          Guided steps to build cyberpunk-inspired, accessible interfaces that still feel fast, intentional, and safe for
          beginners.
        </p>
      </div>

      <div className="journey-grid">
        <div className="journey-stages">
          <header className="subsection-header">
            <p className="eyebrow">Journey</p>
            <h3>Stage by stage</h3>
          </header>
          <div className="stage-list">
            {journeyStages.map((stage) => (
              <article
                key={stage.id}
                className={`stage-card ${stage.id === activeStage.id ? 'active' : ''}`}
                onClick={() => setActiveStage(stage)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => event.key === 'Enter' && setActiveStage(stage)}
              >
                <p className="eyebrow">{stage.title}</p>
                <h4>{stage.narrative}</h4>
                <ul>
                  {stage.prompts.map((prompt) => (
                    <li key={prompt}>{prompt}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>

        <div className="journey-details">
          <header className="subsection-header">
            <p className="eyebrow">Guidance</p>
            <h3>{activeStage.title}</h3>
          </header>
          <div className="journey-annotations">
            {activeStage.annotations.map((note) => (
              <p key={note}>{note}</p>
            ))}
          </div>
          <div className="mood-picker">
            <h4>Palette moods</h4>
            <div className="palette-grid">
              {paletteMoods.map((mood) => (
                <button
                  type="button"
                  key={mood.id}
                  className={`palette-card ${selectedMood.id === mood.id ? 'selected' : ''}`}
                  style={{ background: mood.gradient }}
                  onClick={() => setSelectedMood(mood)}
                >
                  <div className="palette-copy">
                    <span className="eyebrow">{mood.name}</span>
                    <p>{mood.description}</p>
                  </div>
                  <div className="palette-accents" aria-hidden="true">
                    {mood.accents.map((accent) => (
                      <span key={accent} className="accent-swatch" style={{ background: accent }} aria-hidden="true" />
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="journey-levers">
          <header className="subsection-header">
            <p className="eyebrow">Controls</p>
            <h3>Interface levers</h3>
          </header>
          <div className="lever-grid">
            {interfaceGrid.map((lever) => (
              <article key={lever.id} className="lever-card">
                <p className="eyebrow">{lever.label}</p>
                <h4>{lever.detail}</h4>
                <p>{lever.benefit}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
