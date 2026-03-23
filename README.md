# FocusFlow Max

A neurodivergent-friendly productivity dashboard that combines PDF reading with ambient stimulation — split-screen layout, AI-powered text-to-speech, document summarization, gameplay videos, and lo-fi music.

**Live:** [focusflow-max.vercel.app](https://focusflow-max.vercel.app)

![FocusFlow Max](https://img.shields.io/badge/React-Vite-blue) ![TTS](https://img.shields.io/badge/TTS-Azure%20AI-green) ![AI](https://img.shields.io/badge/Summarizer-Transformers.js-orange)

---

## Features

- **PDF Reader** — Drop any PDF, view all pages in a scrollable layout
- **Azure AI Voice** — Neural text-to-speech with 12 premium voices (Ava, Andrew, Emma, Brian, etc.)
- **Browser TTS** — Fallback speech synthesis with auto-ranked voice quality
- **AI Summarizer** — In-browser document summarization via Transformers.js (no server needed)
- **Page Range TTS** — Select which pages to read aloud, auto-scrolls to selected page
- **Gameplay Videos** — Subway Surfers, Minecraft, and more ambient gameplay
- **Lo-Fi Music** — Built-in Lofi Girl radio with independent volume control
- **Audio Mixer** — Separate sliders for video, voice, and lo-fi audio
- **4 Themes** — Studio (dark gold), Paper (light), Petal (pink), Abyss (deep blue)
- **Compact UI** — Minimizable TTS player, collapsible panels, maximum reading space

## Tech Stack

- **Frontend:** React + Vite, Tailwind CSS v3
- **PDF:** react-pdf (pdf.js)
- **TTS:** Azure Cognitive Services Speech API, Web Speech API
- **AI:** Transformers.js (`distilbart-cnn-6-6`) running in Web Workers
- **Video/Audio:** YouTube IFrame API
- **Icons:** Phosphor Icons
- **Fonts:** Fraunces, Figtree, JetBrains Mono

## Getting Started

```bash
# Clone
git clone https://github.com/Shivangisharma4/focusflow.git
cd focusflow

# Install
npm install

# Set up environment
cp .env.example .env
# Edit .env with your Azure Speech key and region

# Run
npm run dev
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_AZURE_KEY` | Azure Cognitive Services Speech API key |
| `VITE_AZURE_REGION` | Azure region (e.g. `eastus`, `centralindia`) |

Get a free Azure Speech key at [portal.azure.com](https://portal.azure.com) — free tier gives 500K characters/month.

## Deployment

Deployed on Vercel. To deploy your own:

1. Fork this repo
2. Import to [Vercel](https://vercel.com)
3. Add `VITE_AZURE_KEY` and `VITE_AZURE_REGION` as environment variables
4. Deploy

## License

MIT
