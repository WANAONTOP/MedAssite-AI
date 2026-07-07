# MedAssist AI - Healthcare Copilot

A full-stack healthcare assistant built with React, FastAPI, MongoDB, and Gemini AI.

## Features
- User Authentication (JWT)
- AI-Powered Patient Chat
- Medicine Assistant
- Doctor & Staff Dashboards
- History & Emergency Support

## Tech Stack
- **Frontend**: React + Vite + TypeScript + Tailwind CSS + Framer Motion
- **Backend**: FastAPI + Motor (MongoDB) + Gemini AI
- **Database**: MongoDB
- **Deployment**: Docker Compose

## Getting Started

1. Clone the repo / open in VS Code
2. Copy `backend/.env.example` to `backend/.env` and add your Gemini API key
3. Run `docker-compose up --build`

## Project Structure
```
.
├── frontend/          # React Vite app
├── backend/           # FastAPI backend
├── docker-compose.yml
└── README.md
```

## Development
- Frontend: `cd frontend && npm run dev`
- Backend: `cd backend && uvicorn main:app --reload`

Built as a recreation of the MedAssist AI project. Enjoy!