# Phase 4: Thinking Companion AI (v4.5)

> Goal: AI that asks questions instead of giving answers. A thinking partner, not a summarizer.

**Status:** Not started
**Depends on:** Phase 2b (Review System — `review_count` + `last_reviewed_at` columns + ReviewPane). Enhanced by Phase 3 (embeddings) but can start without it.
**Unlocks:** Phase 5 (Life Management — people context)

> **Phase 2b foundation:** Phase 2b lays the mechanical groundwork — the Review Pane and
> `review_count` / `last_reviewed_at` columns with a hardcoded 7-day review interval.
> Phase 4 replaces the hardcoded interval with adaptive per-item intervals based on
> recall quality ratings, and injects AI reflection questions directly into the Review Pane
> after the user marks an item as reviewed.

---

## Design Principle

Every AI output is a prompt for the user to think. The companion never writes summaries, never generates content for you. It:

- **Asks reflection questions** after you finish reading something
- **Detects potential biases** in your notes and reading patterns
- **Suggests connections** between things you've saved
- **Prompts Socratic dialogue** to deepen your understanding

This is the opposite of "AI summarize this for me." It's "AI, help me think harder about this."

---

## 4.1 Companion Engine

**`src/lib/thinking-companion.ts`**

Prompt types, each with a specialized system prompt:

| Type | Trigger | Example Output |
|------|---------|----------------|
| **Reflection** | Mark bookmark as "done" | "What surprised you most? How does this connect to what you already knew?" |
| **Bias Check** | Writing a note | "Your last 5 saves are all from the same perspective. Have you considered the opposing view?" |
| **Connection** | Viewing a bookmark/note | "This article about X relates to your note about Y — what's the through-line?" |
| **Socratic** | Explicit "help me think" action | "You wrote 'microservices are better.' Better than what? For whom? Under what constraints?" |
| **Pattern** | Periodic (weekly) | "You've been saving a lot about system design but haven't written any notes. What's holding you back?" |

- Uses existing `callOpenRouter` from `src/lib/ai.ts` — no new API integration needed
- Each prompt type has a template that includes relevant context (bookmark title, note content, recent saves)
- **Without embeddings** (pre-Phase 3): connection suggestions use tag overlap and shared areas
- **With embeddings** (post-Phase 3): connection suggestions use cosine similarity for much better results

## 4.2 UI Integration

- **`CompanionPanel`**: collapsible sidebar panel (or bottom sheet on mobile) showing the latest prompt
- **`ReflectionPrompt`**: appears inside ReviewPane after marking an item reviewed (and also after marking status "done") — dismissible card with 1-2 questions
- **`BiasCheckResult`**: inline indicator in NoteEditorModal when bias patterns are detected
- **"Find connections" button**: in DetailPanel and NoteEditorModal — triggers a connection analysis
- **Periodic sidebar prompts**: subtle notification dot on companion icon when new insights are available
- All prompts are dismissible and non-blocking — the companion suggests, never interrupts

## 4.3 Companion Settings

Stored in localStorage (same pattern as OpenRouter API key):

- **Enable/disable** companion entirely
- **Toggle individual prompt types**: reflection, bias check, connections, Socratic, patterns
- **Frequency**: how often periodic prompts appear (daily, weekly, off)
- **Model selection**: which OpenRouter model to use for companion prompts (default: same as AI tagging)

---

## Implementation Notes

- Can start in parallel with Phase 3 — works without embeddings, just not as well
- All companion features are progressive: they enhance the experience but nothing breaks without them
- Token usage is minimal: each prompt is a single short API call, not a long conversation
- No conversation history stored — each prompt is stateless (keeps it simple and privacy-friendly)
