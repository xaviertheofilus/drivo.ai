{
  "product": {
    "name": "DrivoAI",
    "design_personality": {
      "keywords": [
        "dark-first",
        "low-glare",
        "premium editorial",
        "futuristic soft-glow",
        "voice-first",
        "glanceable",
        "large-tap-friendly",
        "calm urgency (alerts)",
        "Claude-like restraint (breathing room, minimal chrome)"
      ],
      "north_star": "A driver-safe voice OS: one central voice orb, minimal decisions while driving, rich review dashboards at home.",
      "anti_patterns": [
        "busy neon cyberpunk",
        "purple/pink gradients",
        "tiny controls",
        "dense paragraphs on session screen",
        "centered-everything layouts",
        "over-animated UI"
      ]
    }
  },
  "references": {
    "primary_reference": {
      "url": "https://spectacular-input-814766.framer.app/",
      "what_to_borrow": [
        "editorial spacing + premium typography contrast",
        "soft glows on key accents",
        "dark surfaces with subtle borders",
        "minimal but confident CTAs"
      ]
    },
    "secondary_reference_links": [
      {
        "url": "https://www.figma.com/community/file/1511492451560495975/ai-voice-assistant-dashboard-ui-dark-mode-interface",
        "note": "Dark voice assistant dashboard layout patterns (panels + central focus)."
      },
      {
        "url": "https://dribbble.com/search/ai-orb",
        "note": "Orb interaction explorations; use as motion inspiration only."
      }
    ]
  },
  "fonts": {
    "google_fonts_import": {
      "note": "Load via index.html or CSS import. Keep weights limited for performance.",
      "families": [
        {
          "name": "DM Serif Display",
          "weights": ["400"],
          "usage": "Brand moments + page titles only (H1/H2)."
        },
        {
          "name": "DM Sans",
          "weights": ["400", "500", "600"],
          "usage": "All UI body, labels, buttons, forms."
        },
        {
          "name": "JetBrains Mono",
          "weights": ["400", "600"],
          "usage": "Numbers/metrics, timestamps, session IDs, chart axes (where appropriate)."
        }
      ]
    },
    "tailwind_font_tokens": {
      "font_display": "'DM Serif Display', ui-serif, Georgia, serif",
      "font_sans": "'DM Sans', ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
      "font_mono": "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas"
    },
    "type_scale": {
      "h1": "text-4xl sm:text-5xl lg:text-6xl font-display tracking-[-0.02em]",
      "h2": "text-base md:text-lg font-sans text-[color:var(--text-secondary)]",
      "section_title": "text-xl md:text-2xl font-display tracking-[-0.01em]",
      "body": "text-sm md:text-base font-sans leading-6",
      "meta": "text-xs font-sans text-[color:var(--text-muted)]",
      "metric": "font-mono text-sm md:text-base tabular-nums"
    }
  },
  "color_system": {
    "note": "Do not change these hex values. Build tokens around them.",
    "palette_locked": {
      "bg": "#0A0A0F",
      "surface": "#12121A",
      "surface_alt": "#1C1C28",
      "border": "#2A2A3A",
      "primary": "#4F8EF7",
      "primary_glow": "rgba(79,142,247,0.15)",
      "accent": "#7FE0B0",
      "warning": "#F7B84F",
      "danger": "#F75F5F",
      "text_primary": "#EEEEF5",
      "text_secondary": "#8888A8",
      "text_muted": "#44445A"
    },
    "semantic_tokens_css": {
      "instructions": "Set these as CSS custom properties in index.css under :root and .dark (app is dark-first; keep .dark as default on <html>).",
      "css": ":root{\n  --bg:#0A0A0F;\n  --surface:#12121A;\n  --surface-alt:#1C1C28;\n  --border:#2A2A3A;\n  --primary:#4F8EF7;\n  --primary-glow:rgba(79,142,247,0.15);\n  --accent:#7FE0B0;\n  --warning:#F7B84F;\n  --danger:#F75F5F;\n  --text-primary:#EEEEF5;\n  --text-secondary:#8888A8;\n  --text-muted:#44445A;\n\n  --focus-ring: rgba(79,142,247,0.45);\n  --shadow-elev-1: 0 10px 30px rgba(0,0,0,0.35);\n  --shadow-elev-2: 0 18px 60px rgba(0,0,0,0.55);\n\n  --radius-sm: 10px;\n  --radius-md: 14px;\n  --radius-lg: 18px;\n\n  --tap-min: 44px;\n\n  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);\n  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);\n  --dur-1: 120ms;\n  --dur-2: 220ms;\n  --dur-3: 420ms;\n}\n"
    },
    "allowed_gradients": {
      "note": "Keep gradients decorative and under 20% viewport. No saturated purple/pink combos.",
      "hero_backdrop": "radial-gradient(900px circle at 20% 10%, rgba(79,142,247,0.14), transparent 55%), radial-gradient(700px circle at 80% 20%, rgba(127,224,176,0.10), transparent 60%)",
      "orb_aura": "radial-gradient(circle at 50% 50%, rgba(79,142,247,0.22), rgba(79,142,247,0.06) 45%, transparent 70%)",
      "warning_aura": "radial-gradient(circle at 50% 50%, rgba(247,184,79,0.18), transparent 65%)",
      "danger_aura": "radial-gradient(circle at 50% 50%, rgba(247,95,95,0.18), transparent 65%)"
    },
    "noise_texture": {
      "note": "Use subtle noise overlay to avoid flat dark surfaces.",
      "css_snippet": ".noise-overlay{\n  position:absolute; inset:0; pointer-events:none;\n  background-image:url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"160\" height=\"160\"><filter id=\"n\"><feTurbulence type=\"fractalNoise\" baseFrequency=\"0.9\" numOctaves=\"3\" stitchTiles=\"stitch\"/></filter><rect width=\"160\" height=\"160\" filter=\"url(%23n)\" opacity=\"0.10\"/></svg>');\n  mix-blend-mode: overlay; opacity:0.22;\n}\n"
    }
  },
  "layout": {
    "breakpoints": {
      "mobile_first": true,
      "tailwind": {
        "sm": "640px",
        "md": "768px",
        "lg": "1024px",
        "xl": "1280px"
      }
    },
    "grid_and_spacing": {
      "container": "max-w-6xl mx-auto px-4 sm:px-6",
      "section_padding": "py-10 sm:py-14",
      "card_padding": "p-4 sm:p-5",
      "spacing_rule": "Use 2–3x more spacing than feels comfortable; prefer whitespace over dividers.",
      "safe_areas_in_car": {
        "note": "On /session, keep controls within thumb zone and away from top corners.",
        "bottom_controls": "fixed bottom-0 left-0 right-0 pb-[max(env(safe-area-inset-bottom),16px)]"
      }
    },
    "screen_templates": {
      "S-01_Landing": {
        "layout": "Z-pattern hero + proof + feature bento + CTA",
        "hero": "Left: editorial headline + 2-line value prop; Right: device mock / abstract car image; keep hero gradient under 20% viewport.",
        "sections": [
          "Hero",
          "How it works (3 steps)",
          "Feature bento (Voice orb, Personas, Reports, Bilingual)",
          "Safety note + privacy",
          "Footer"
        ]
      },
      "S-02_Login": {
        "layout": "Single column, left-aligned form card",
        "notes": "Large inputs, minimal fields, clear error states."
      },
      "S-03_Register": {
        "layout": "Single column, progressive disclosure",
        "notes": "Keep optional fields collapsed (avatar upload optional)."
      },
      "S-04_Dashboard": {
        "layout": "Two-column on lg: left = active persona + start session; right = recent drives + quick stats",
        "primary_cta": "Start Session button prominent, 56px height on mobile.",
        "components": ["Card", "Table", "Badge", "Button"]
      },
      "S-05_Persona_Gallery": {
        "layout": "Filter row + responsive grid (1 col mobile, 2 md, 3 lg)",
        "notes": "Template personas first; custom personas grouped with subtle divider label."
      },
      "S-06_Builder_Text": {
        "layout": "Split on lg: left form, right live preview card",
        "notes": "Regenerate limited to 3; show counter + disabled state."
      },
      "S-07_Builder_File": {
        "layout": "Dropzone card + parsing status + preview",
        "notes": "Use progress + skeleton while parsing."
      },
      "S-08_Preview": {
        "layout": "Centered preview with actions pinned bottom on mobile",
        "notes": "Primary: Save Persona; Secondary: Edit; Ghost: Regenerate (if available)."
      },
      "S-09_Active_Session": {
        "layout": "Full-screen minimal chrome; central orb; top alert banner; bottom control dock",
        "notes": "No scrolling required. All actions reachable with one tap."
      },
      "S-10_Session_Report": {
        "layout": "Header summary + timeline chart + transcript accordion + tags",
        "notes": "Use mono for metrics; accordion for transcript to reduce cognitive load."
      },
      "S-11_History": {
        "layout": "Search + filters + table/list; tap row opens report",
        "notes": "Mobile uses cards; desktop uses table."
      },
      "S-12_Settings": {
        "layout": "Stacked sections: Profile, Language, Safety preferences",
        "notes": "Avatar upload with preview; language toggle persistent."
      }
    }
  },
  "components": {
    "component_path": {
      "shadcn_primary": "/app/frontend/src/components/ui/",
      "use_these": {
        "buttons": "button.jsx",
        "inputs": "input.jsx, textarea.jsx, label.jsx, form.jsx",
        "cards": "card.jsx",
        "badges": "badge.jsx",
        "avatar": "avatar.jsx",
        "dialogs": "dialog.jsx, alert-dialog.jsx, sheet.jsx, drawer.jsx",
        "navigation": "navigation-menu.jsx, breadcrumb.jsx, tabs.jsx",
        "feedback": "sonner.jsx (toasts), progress.jsx, skeleton.jsx, tooltip.jsx",
        "data": "table.jsx, accordion.jsx, scroll-area.jsx",
        "date": "calendar.jsx"
      }
    },
    "button_system": {
      "style": "Professional/premium: rounded-md, tall, subtle glow on primary only.",
      "sizes": {
        "sm": "h-9 px-3 text-sm",
        "md": "h-11 px-4 text-sm",
        "lg": "h-14 px-5 text-base (use for in-car primary actions)"
      },
      "variants": {
        "primary": {
          "tailwind": "bg-[color:var(--primary)] text-[color:var(--bg)] shadow-[0_0_0_1px_rgba(79,142,247,0.25),0_12px_40px_rgba(79,142,247,0.12)] hover:brightness-110 focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)]",
          "notes": "No gradients on buttons (small element). Use solid primary + glow shadow."
        },
        "secondary": {
          "tailwind": "bg-[color:var(--surface-alt)] text-[color:var(--text-primary)] border border-[color:var(--border)] hover:bg-[color:var(--surface)]",
          "notes": "For non-driving contexts (dashboard/forms)."
        },
        "ghost": {
          "tailwind": "bg-transparent text-[color:var(--text-secondary)] hover:bg-white/5",
          "notes": "For tertiary actions like Cancel."
        },
        "danger": {
          "tailwind": "bg-[color:var(--danger)] text-[color:var(--bg)] hover:brightness-110",
          "notes": "Use sparingly; confirm dialogs required."
        }
      },
      "interaction": {
        "press": "active:scale-[0.98]",
        "transition": "transition-colors duration-200",
        "rule": "Never use transition-all."
      }
    },
    "form_system": {
      "input": {
        "tailwind": "h-11 bg-[color:var(--surface)] border border-[color:var(--border)] text-[color:var(--text-primary)] placeholder:text-[color:var(--text-muted)] focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)]",
        "helper_text": "text-xs text-[color:var(--text-secondary)]",
        "error_text": "text-xs text-[color:var(--danger)]"
      },
      "dropzone": {
        "tailwind": "rounded-[var(--radius-lg)] border border-dashed border-[color:var(--border)] bg-[color:var(--surface)]/60 hover:bg-[color:var(--surface)] transition-colors duration-200",
        "states": ["idle", "drag-over", "uploading", "success", "error"]
      }
    },
    "persona_card": {
      "structure": [
        "Avatar (persona)",
        "Name + tone tags",
        "1-line promise",
        "Sample dialogue (2 lines max)",
        "Actions: Select / Edit"
      ],
      "card_tailwind": "rounded-[var(--radius-lg)] bg-[color:var(--surface)] border border-[color:var(--border)] shadow-[0_18px_60px_rgba(0,0,0,0.35)]",
      "hover": "hover:border-white/15 hover:bg-[color:var(--surface-alt)] transition-colors duration-200",
      "tags": {
        "use": "Badge",
        "tone_colors": {
          "calm": "bg-white/5 text-[color:var(--text-secondary)] border border-white/10",
          "energetic": "bg-[color:var(--accent)]/10 text-[color:var(--accent)] border border-[color:var(--accent)]/20",
          "serious": "bg-[color:var(--primary)]/10 text-[color:var(--primary)] border border-[color:var(--primary)]/20"
        }
      }
    },
    "drowsiness_alert_banner": {
      "placement": "Top, slide-in; never blocks orb center.",
      "use": "Alert component + Framer Motion",
      "tailwind": "fixed top-3 left-3 right-3 z-50 rounded-[var(--radius-lg)] border border-[color:var(--border)] bg-[color:var(--surface)]/90 backdrop-blur",
      "variants": {
        "warning": "shadow-[0_0_0_1px_rgba(247,184,79,0.25),0_18px_60px_rgba(247,184,79,0.10)]",
        "danger": "shadow-[0_0_0_1px_rgba(247,95,95,0.25),0_18px_60px_rgba(247,95,95,0.10)]"
      },
      "copy": {
        "warning": "Feeling sleepy? Take a short break.",
        "danger": "Microsleep risk. Please pull over now."
      },
      "actions": [
        "Acknowledge",
        "Snooze 10m (optional)",
        "Emergency contact (optional)"
      ]
    }
  },
  "voice_orb": {
    "goal": "A single, glanceable centerpiece that communicates system state without reading.",
    "size": {
      "mobile": "w-[240px] h-[240px]",
      "tablet": "md:w-[320px] md:h-[320px]",
      "desktop": "lg:w-[360px] lg:h-[360px]"
    },
    "layers": [
      "Core sphere (solid surface-alt)",
      "Inner glow (primary_glow)",
      "Outer aura ring (radial gradient)",
      "Waveform/ripple ring (animated stroke)",
      "Noise/grain overlay (very subtle)"
    ],
    "states": {
      "idle": {
        "visual": "Slow breathing scale + faint aura",
        "color": "primary",
        "motion": "scale 1 -> 1.02 -> 1 (4.5s loop)"
      },
      "listening": {
        "visual": "Pulsing ring + subtle waveform bars",
        "color": "primary",
        "motion": "ring opacity + radius oscillation (1.2s loop)"
      },
      "speaking": {
        "visual": "Waveform amplitude increases; core brightens",
        "color": "accent mixed with primary glow",
        "motion": "wave amplitude tied to TTS volume if available; else 0.8s loop"
      },
      "drowsy_warning": {
        "visual": "Warm warning aura + slightly faster pulse",
        "color": "warning",
        "motion": "pulse 0.9s loop; add subtle shake 1px every 6s (very restrained)"
      },
      "danger": {
        "visual": "Danger aura + sharper ring; reduce fancy motion to avoid distraction",
        "color": "danger",
        "motion": "pulse 0.7s loop; no shake; prioritize banner + voice prompt"
      }
    },
    "framer_motion_scaffold_js": {
      "note": "Use in a .js component. Keep animations GPU-friendly (opacity/transform).",
      "snippet": "import { motion } from 'framer-motion';\n\nexport const VoiceOrb = ({ state = 'idle' }) => {\n  const variants = {\n    idle: { scale: [1, 1.02, 1], transition: { duration: 4.5, repeat: Infinity, ease: 'easeInOut' } },\n    listening: { scale: [1, 1.03, 1], transition: { duration: 1.2, repeat: Infinity, ease: [0.16, 1, 0.3, 1] } },\n    speaking: { scale: [1, 1.015, 1], transition: { duration: 0.8, repeat: Infinity, ease: [0.16, 1, 0.3, 1] } },\n    warning: { scale: [1, 1.04, 1], transition: { duration: 0.9, repeat: Infinity, ease: [0.16, 1, 0.3, 1] } },\n    danger: { scale: [1, 1.05, 1], transition: { duration: 0.7, repeat: Infinity, ease: [0.16, 1, 0.3, 1] } }\n  };\n\n  const auraClass = state === 'danger' ? 'from-[color:var(--danger)]/20' : state === 'warning' ? 'from-[color:var(--warning)]/20' : 'from-[color:var(--primary)]/20';\n\n  return (\n    <div className=\"relative grid place-items-center\" data-testid=\"voice-orb\">\n      <div className=\"absolute inset-[-18%] rounded-full\" style={{ background: 'var(--orb-aura, radial-gradient(circle at 50% 50%, rgba(79,142,247,0.22), rgba(79,142,247,0.06) 45%, transparent 70%))' }} />\n      <motion.div\n        className=\"relative rounded-full bg-[color:var(--surface-alt)] border border-white/10 shadow-[0_0_0_1px_rgba(79,142,247,0.18),0_30px_90px_rgba(0,0,0,0.55)]\"\n        style={{ width: 'min(360px, 72vw)', height: 'min(360px, 72vw)' }}\n        animate={variants[state] || variants.idle}\n      >\n        <div className=\"noise-overlay rounded-full\" />\n      </motion.div>\n    </div>\n  );\n};\n"
    }
  },
  "data_viz": {
    "library": "recharts",
    "chart_style": {
      "axes": "stroke: var(--text-muted); tick: var(--text-secondary); font-family: var(--font-mono)",
      "line": "stroke: var(--primary); strokeWidth: 2; dot: false",
      "area_fill": "rgba(79,142,247,0.10)",
      "warning_marker": "var(--warning)",
      "danger_marker": "var(--danger)"
    },
    "empty_states": {
      "pattern": "Card with icon + 1 sentence + CTA",
      "tailwind": "rounded-[var(--radius-lg)] border border-[color:var(--border)] bg-[color:var(--surface)] p-6 text-[color:var(--text-secondary)]"
    }
  },
  "motion": {
    "principles": [
      "Motion communicates state (orb + alerts), not decoration.",
      "Prefer opacity/transform; avoid layout thrash.",
      "Reduce motion on prefers-reduced-motion."
    ],
    "tokens": {
      "easing": {
        "out": "var(--ease-out)",
        "in_out": "var(--ease-in-out)"
      },
      "durations": {
        "fast": "var(--dur-1)",
        "base": "var(--dur-2)",
        "slow": "var(--dur-3)"
      }
    },
    "micro_interactions": {
      "buttons": "hover:brightness-110 + active:scale-[0.98]",
      "cards": "hover border lift (color only) + subtle shadow increase",
      "nav": "active indicator slide (Tabs)"
    }
  },
  "accessibility": {
    "contrast": "All text must meet WCAG AA against bg/surface; use text_primary for main copy.",
    "focus": "Always visible focus ring using --focus-ring.",
    "tap_targets": "Minimum 44px height for interactive controls; on /session use 56px for primary.",
    "reduced_motion": "Respect prefers-reduced-motion: disable orb loops or reduce amplitude.",
    "language": "Language toggle must be reachable on /session and /settings; labels can remain English; keep copy short."
  },
  "testing": {
    "data_testid_rules": {
      "required_on": [
        "buttons",
        "links",
        "inputs",
        "menus",
        "toggles",
        "alerts",
        "key metrics",
        "tables rows (clickable)",
        "voice orb",
        "language toggle",
        "avatar upload"
      ],
      "convention": "kebab-case describing role (not appearance)",
      "examples": [
        "data-testid=\"login-form-submit-button\"",
        "data-testid=\"dashboard-start-session-button\"",
        "data-testid=\"session-language-toggle\"",
        "data-testid=\"drowsiness-alert-banner\"",
        "data-testid=\"persona-card-select-button\"",
        "data-testid=\"session-report-engagement-score\""
      ]
    }
  },
  "image_urls": {
    "landing_hero": [
      {
        "url": "https://images.unsplash.com/photo-1553437116-0b7aa9ff38dc?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2OTV8MHwxfHNlYXJjaHwxfHxkYXJrJTIwZnV0dXJpc3RpYyUyMGNhciUyMGludGVyaW9yJTIwbmlnaHQlMjBkcml2aW5nJTIwZGFzaGJvYXJkJTIwYWJzdHJhY3R8ZW58MHx8fGJsdWV8MTc4MDE0ODM4Mnww&ixlib=rb-4.1.0&q=85",
        "description": "Dark vehicle interior (low-glare) for landing hero side image.",
        "category": "hero"
      }
    ],
    "dashboard_empty_state": [
      {
        "url": "https://images.unsplash.com/photo-1572012097462-b674dba1098a?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2OTV8MHwxfHNlYXJjaHw0fHxkYXJrJTIwZnV0dXJpc3RpYyUyMGNhciUyMGludGVyaW9yJTIwbmlnaHQlMjBkcml2aW5nJTIwZGFzaGJvYXJkJTIwYWJzdHJhY3R8ZW58MHx8fGJsdWV8MTc4MDE0ODM4Mnww&ixlib=rb-4.1.0&q=85",
        "description": "Abstract blue light texture for empty states / subtle banners (use with opacity 0.12).",
        "category": "decorative"
      }
    ]
  },
  "instructions_to_main_agent": {
    "global_css_updates": [
      "Replace CRA default App.css centering styles; do not center the whole app.",
      "In index.css, override shadcn :root/.dark tokens to match locked palette; set body background to --bg and text to --text-primary.",
      "Add noise-overlay utility class (see snippet) and use sparingly on hero/orb only."
    ],
    "tailwind_usage": [
      "Prefer arbitrary colors referencing CSS vars: bg-[color:var(--surface)] etc.",
      "Avoid gradients except allowed decorative backdrops (<=20% viewport).",
      "No transition-all; use transition-colors or transition-opacity only."
    ],
    "page_build_order": [
      "1) Session (/session) voice orb + alert banner + bottom dock",
      "2) Dashboard (/dashboard) start session CTA + recent drives",
      "3) Persona gallery + builder flow",
      "4) Report + history",
      "5) Landing + auth + settings"
    ],
    "js_file_note": "All components/pages are .js (not .tsx). Keep prop validation lightweight; consider optional PropTypes if already used.",
    "libraries": {
      "already_present": ["framer-motion", "recharts", "lucide-react", "shadcn/ui"],
      "optional": [
        {
          "name": "react-dropzone",
          "why": "Better file upload UX for persona builder file flow.",
          "install": "npm i react-dropzone",
          "usage": "Use to implement drag/drop states for S-07."
        }
      ]
    }
  }
}

<General UI UX Design Guidelines>  
    - You must **not** apply universal transition. Eg: `transition: all`. This results in breaking transforms. Always add transitions for specific interactive elements like button, input excluding transforms
    - You must **not** center align the app container, ie do not add `.App { text-align: center; }` in the css file. This disrupts the human natural reading flow of text
   - NEVER: use AI assistant Emoji characters like`🤖🧠💭💡🔮🎯📚🎭🎬🎪🎉🎊🎁🎀🎂🍰🎈🎨🎰💰💵💳🏦💎🪙💸🤑📊📈📉💹🔢🏆🥇 etc for icons. Always use **FontAwesome cdn** or **lucid-react** library already installed in the package.json

 **GRADIENT RESTRICTION RULE**
NEVER use dark/saturated gradient combos (e.g., purple/pink) on any UI element.  Prohibited gradients: blue-500 to purple 600, purple 500 to pink-500, green-500 to blue-500, red to pink etc
NEVER use dark gradients for logo, testimonial, footer etc
NEVER let gradients cover more than 20% of the viewport.
NEVER apply gradients to text-heavy content or reading areas.
NEVER use gradients on small UI elements (<100px width).
NEVER stack multiple gradient layers in the same viewport.

**ENFORCEMENT RULE:**
    • Id gradient area exceeds 20% of viewport OR affects readability, **THEN** use solid colors

**How and where to use:**
   • Section backgrounds (not content backgrounds)
   • Hero section header content. Eg: dark to light to dark color
   • Decorative overlays and accent elements only
   • Hero section with 2-3 mild color
   • Gradients creation can be done for any angle say horizontal, vertical or diagonal

- For AI chat, voice application, **do not use purple color. Use color like light green, ocean blue, peach orange etc**

</Font Guidelines>

- Every interaction needs micro-animations - hover states, transitions, parallax effects, and entrance animations. Static = dead. 
   
- Use 2-3x more spacing than feels comfortable. Cramped designs look cheap.

- Subtle grain textures, noise overlays, custom cursors, selection states, and loading animations: separates good from extraordinary.
   
- Before generating UI, infer the visual style from the problem statement (palette, contrast, mood, motion) and immediately instantiate it by setting global design tokens (primary, secondary/accent, background, foreground, ring, state colors), rather than relying on any library defaults. Don't make the background dark as a default step, always understand problem first and define colors accordingly
    Eg: - if it implies playful/energetic, choose a colorful scheme
           - if it implies monochrome/minimal, choose a black–white/neutral scheme

**Component Reuse:**
	- Prioritize using pre-existing components from src/components/ui when applicable
	- Create new components that match the style and conventions of existing components when needed
	- Examine existing components to understand the project's component patterns before creating new ones

**IMPORTANT**: Do not use HTML based component like dropdown, calendar, toast etc. You **MUST** always use `/app/frontend/src/components/ui/ ` only as a primary components as these are modern and stylish component

**Best Practices:**
	- Use Shadcn/UI as the primary component library for consistency and accessibility
	- Import path: ./components/[component-name]

**Export Conventions:**
	- Components MUST use named exports (export const ComponentName = ...)
	- Pages MUST use default exports (export default function PageName() {...})

**Toasts:**
  - Use `sonner` for toasts"
  - Sonner component are located in `/app/src/components/ui/sonner.tsx`

Use 2–4 color gradients, subtle textures/noise overlays, or CSS-based noise to avoid flat visuals.
</General UI UX Design Guidelines>
