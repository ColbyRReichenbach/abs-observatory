# AiBS (Automated Ball-Strike) Observatory Rework Brainstorm

This document outlines the planned rework for the platform, focusing on moving away from "vibe-coded" aesthetics toward a high-utility, professional sports analytics tool.

## 1. Homepage & Global Navigation
*   **MLB Savant Style Header**:
    *   Horizontal game strip at the very top.
    *   Navigation arrows (left/right) to cycle through games.
    *   Ordering logic: **Live** -> **Scheduled** (by first pitch) -> **Finished**.
    *   "Expand View" button to toggle the full dashboard grid.
*   **Live Ticker (Infinite Scroll)**:
    *   Placed above the game header.
    *   Continuous vertical/horizontal scroll of real-time ABS events (Challenges, Overturns).
*   **Hero / Top Calls**:
    *   Focus on high-leverage calls (highest change in win probability or run expectancy).
    *   Clickable cards leading directly to the specific pitch event.
*   **Branding & Naming**:
    *   Rename site to **AiBS** (pronounced "ABS").
    *   Navbar updates:
        *   "Umpire Stats" (instead of Umpires)
        *   "Team Stats" (instead of Teams)
        *   "About" (New section explaining the project mission).
    *   "Skip to main content" button: Remove (Cleanup).
    *   Wait messages: Baseball-themed (e.g., "Your pitch is being thrown...", "Warming up the bullpen...").

## 2. Team & Umpire Analytics
*   **Schedule Navigation**:
    *   Replace simple 7/30d filters with a scrollable schedule.
    *   Last 5-7 games shown with logos + scores.
    *   **Full Calendar View**: Top-right button opens a month-view modal for deep historical dive.
*   **Umpire Deep Dive**:
    *   Advanced filters: **Day vs Night**, **Weather Conditions** (Sunny, Cloudy, Stadium type).
    *   Purpose: Tool for the League (performance review/raises) and Teams (strategy/scouting).
    *   Bias analysis: "Umpire X consistently misses low-zone calls" -> actionable intel for challenge strategy.
*   **League-Wide Analytics Page**:
    *   Global trends: AL vs NL, SP vs RP, Inning-based trends.
    *   Situational breakdown: Runners on vs clear bases, Park factors.

## 3. Play-by-Play & Strike Zone View
*   **At-Bat Context**:
    *   Instead of just showing the challenged pitch, show the **full at-bat** sequence.
    *   Provides high-interactivity and context on how the call changed the outcome.
*   **Strike Zone Logic (Research Point)**:
    *   **Width**: 17 inches (standard home plate).
    *   **Height**: Dynamic (Top = 53.5% of hitter height, Bottom = 27% of hitter height).
    *   The UI must reflect this hitter-specific zone ( Judge vs Altuve).
*   **Pitch Detail Modal**:
    *   Show bases (runners on), count (balls/strikes), score, and game situation.
    *   Remove legacy text like "BALL → STRIKE"; replace with clean icons/status chips.
*   **Social & Community**:
    *   Mini chat-box for user comments per pitch/dot.
    *   Engage fans on controversial calls.

## 4. AI & "Ump or Blue" (Copilot)
*   **Integration**:
    *   Remove standalone AI page.
    *   Copilot becomes a floating, movable chat box ("Ump or Blue" or "AiBS").
*   **AI Contextual Questions**:
    *   Scatter "smart questions" near charts:
        *   "How does this umpire compare to the rest of the league?"
        *   "Does time of day impact this team's success rate?"
        *   "Is this umpire more accurate in the AL?"
    *   Clicking these sends the query directly to the AI with relevant data context.

## 5. UI/UX Polishing
*   **Visual Clarity**:
    *   Fix legibility of team scrapbooks (ensure contrast is high enough).
    *   Sanitize typography (fix light mode visibility issues).
    *   Ensure all team logos are present on the main page.
*   **Clutter Reduction**:
    *   Remove "motif" labels (e.g., "Glove Logo Geometry").
    *   Remove "Team ABS Profile" dots.
    *   Focus on sleek, modern, data-first surfaces.
*   **Team Stats List**: Add logos next to team names.

## 6. Infrastructure & Future Additions (Agent Recommendations)
*   **3D Pitch Visualization**: Implement a Three.js or SVG-based 3D view for pitch flight paths (Savant style).
*   **Umpire Heatmaps**: Generate accuracy heatmaps for umpires to visualize "blind spots" in the zone.
*   **Real-time Event Bridge**: Use WebSockets for the Live Ticker to ensure sub-second latency from the ABS event stream.
*   **Gamification (The "Predictor")**: Allow users to predict the outcome of a challenged pitch while the "wait" animation is active.
*   **Advanced Umpire Correlation**: Cross-reference umpire performance with travel fatigue or park-specific lighting conditions.
