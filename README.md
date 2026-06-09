# Duelytics

🌐 **Website:** https://masterduelytics.com

Duelytics is a comprehensive application for tracking and analyzing Yu-Gi-Oh! Master Duel tournament statistics. Built with Electron and React, it provides an in-depth platform for players to record their duels, monitor performance, and gain insights into their gameplay and the tournament meta.

## Download & Installation

Getting started with Duelytics is simple:

1. Visit the official website: https://masterduelytics.com
2. Join the Discord server to gain access and receive updates.
3. Click **Download for Windows** on the website.
4. Run the downloaded installer.
5. Follow the installation wizard.
6. Launch Duelytics from your desktop or Start Menu.
7. Sign in using your Discord account to access tournament sessions and statistics.

> Note: Duelytics is currently available for Windows through the official website.

## Official Links

- Website: https://masterduelytics.com

## Features

-   **Duel Submission**: Record detailed information about each duel, including your deck, your opponent's deck, coin flip result, turn order, and the final outcome.
-   **Session Management**: Create and participate in tournament sessions. Sessions can be configured with different game modes like "Duelist Cup," "Rated," or "Ladder."
-   **Comprehensive Statistics**:
    -   **Personal Stats**: View an overview of your performance, track your rating/point progression, analyze individual deck performance, and see detailed coin flip and matchup statistics.
    -   **Deck Winrates**: See aggregated winrate statistics for every deck used across the entire session.
    -   **Matchup Matrix**: A visual grid showing the win/loss record between different deck archetypes across the entire session.
-   **Tournament Leaderboard**: A real-time leaderboard ranking players by points or tier, showing their winrates and most-played deck.
-   **Electron Desktop App**:
    -   **Duel Submission Overlay**: A lightweight, always-on-top overlay window for quick duel submissions without leaving the game.
    -   **Auto-Updates**: The application automatically checks for and notifies you of new updates.
    -   **Deep Linking**: Seamlessly handles authentication callbacks from the browser.
-   **Customization**: Supporters can upload and set custom application backgrounds.
-   **Admin Tools**: Admins can create and manage tournament sessions and add new decks to the database.
-   **Multi-language Support**: The interface is available in English, Japanese, Chinese, Korean, Spanish, and German.

## Tech Stack

-   **Frontend**: Electron, React, Vite, Tailwind CSS, Recharts, Chart.js, i18next
-   **Backend**: Node.js, Express.js
-   **Database & Auth**: Supabase (PostgreSQL, Auth, Storage)
-   **Authentication**: Discord OAuth

## Project Architecture

The repository is structured as a monorepo with distinct parts for the Electron application, the React frontend, and the Express backend.

-   `electron/`: Contains the main process code for the Electron application.
    -   `main.js`: The entry point for the Electron app, handling window creation, auto-updates, and IPC events.
    -   `preload.js`: Securely exposes Node.js/Electron APIs to the renderer process.
    -   `overlay/`: The HTML, CSS, and JavaScript for the duel submission overlay window.
-   `src/`: The React frontend application.
    -   `pages/`: Main application views, such as the `SessionSelector` and `DuelRecords` dashboards.
    -   `components/`: Reusable UI components used across the application.
    -   `contexts/`: React Context providers for managing global state like authentication and session data.
    -   `hooks/`: Custom React hooks for functionalities like auto-updates and background management.
    -   `locales/`: Translation files for internationalization.
-   `backend/`: The Node.js and Express.js API server.
    -   `routes/`: Defines the API endpoints for handling data related to authentication, sessions, duels, decks, and more.
    -   `config/`: Manages database (Supabase) and Discord API connections.
    -   `middleware/`: Includes authentication checks and rate limiting for API endpoints.
 
      
