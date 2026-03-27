<div align="center">

<img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=700&size=36&pause=1000&color=6C63FF&center=true&vCenter=true&width=700&lines=🤖+AI+Face+Recognition;Smart+Attendance+System;Powered+by+Google+Gemini+AI" alt="Typing SVG" />

<br/>

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" />
  <img src="https://img.shields.io/badge/Google_Gemini-4285F4?style=for-the-badge&logo=google&logoColor=white" />
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" />
</p>

<p align="center">
  <img src="https://img.shields.io/github/stars/abhishekrk080-cpu/AI-Face-Recognition?style=social" />
  <img src="https://img.shields.io/github/forks/abhishekrk080-cpu/AI-Face-Recognition?style=social" />
  <img src="https://img.shields.io/github/last-commit/abhishekrk080-cpu/AI-Face-Recognition?color=6C63FF&style=flat-square" />
  <img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" />
  <img src="https://img.shields.io/badge/status-active-success?style=flat-square" />
</p>

<br/>

> **🎯 An intelligent, AI-powered face recognition system that automates attendance marking — no manual roll calls, no proxy attendance.**

<br/>

</div>

---

## 📋 Table of Contents

- [✨ Overview](#-overview)
- [🖼️ UI Preview](#️-ui-preview)
- [🚀 Features](#-features)
- [🛠️ Tech Stack](#️-tech-stack)
- [📂 Project Structure](#-project-structure)
- [⚙️ Getting Started](#️-getting-started)
- [🔑 Environment Variables](#-environment-variables)
- [🧠 How It Works](#-how-it-works)
- [🌐 Live Demo](#-live-demo)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)

---

## ✨ Overview

**AI Face Recognition** is a modern, AI-powered attendance management system built with **TypeScript**, **React**, **Vite**, and **Google Gemini AI**. The system uses real-time facial recognition to automatically detect and verify individuals, marking their attendance instantly — eliminating the need for manual processes.

Whether it's a classroom, corporate office, or training session, this system ensures **accurate**, **fast**, and **tamper-proof** attendance tracking.

---

## 🖼️ UI Preview

<div align="center">

### 🎥 Live Camera Feed & Detection

```
┌─────────────────────────────────────────────────┐
│                                                 │
│   📷  LIVE CAMERA FEED                         │
│  ┌─────────────────────────────────────────┐   │
│  │                                         │   │
│  │       [ 👤 Face Detected ]              │   │
│  │    ┌──────────────────────┐             │   │
│  │    │  🟢 Abhishek Kumar   │             │   │
│  │    │  ✅ Attendance Marked │             │   │
│  │    └──────────────────────┘             │   │
│  │                                         │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│   [ ▶ Start Recognition ]  [ ⏹ Stop ]         │
│                                                 │
└─────────────────────────────────────────────────┘
```

### 📊 Attendance Dashboard

```
┌────────────────────────────────────────────────────────┐
│  📋  ATTENDANCE DASHBOARD              📅 Mar 27, 2026 │
├────────────────────────────────────────────────────────┤
│                                                        │
│  🟢 Present Today: 24    🔴 Absent: 6    📈 80%       │
│                                                        │
├──────┬──────────────────┬──────────┬───────────────────┤
│  #   │  Name            │  Status  │  Time             │
├──────┼──────────────────┼──────────┼───────────────────┤
│  01  │  Abhishek Kumar  │  ✅ In   │  09:02 AM         │
│  02  │  Rahul Sharma    │  ✅ In   │  09:05 AM         │
│  03  │  Priya Singh     │  ✅ In   │  09:11 AM         │
│  04  │  Arjun Mehta     │  ❌ Out  │  —                │
│  05  │  Sneha Patel     │  ✅ In   │  09:18 AM         │
└──────┴──────────────────┴──────────┴───────────────────┘
```

</div>

---

## 🚀 Features

| Feature | Description |
|--------|-------------|
| 🤖 **AI-Powered Recognition** | Uses Google Gemini AI for accurate face detection and identification |
| ⚡ **Real-Time Processing** | Live camera feed with instant face matching |
| 📊 **Attendance Dashboard** | Clean interface showing present/absent stats with timestamps |
| 🔐 **Secure & Tamper-Proof** | AI-verified identity prevents proxy attendance |
| 📁 **Export Reports** | Generate attendance logs for easy record-keeping |
| 📱 **Responsive Design** | Works seamlessly on desktop and mobile browsers |
| 🌙 **Modern UI** | Built with a sleek, professional interface using CSS & React |
| 🔑 **Easy API Integration** | Simple Gemini API key setup via `.env` file |

---

## 🛠️ Tech Stack

<div align="center">

| Layer | Technology |
|-------|------------|
| 🖥️ **Frontend** | React + TypeScript |
| ⚡ **Build Tool** | Vite |
| 🤖 **AI Engine** | Google Gemini API |
| 🎨 **Styling** | CSS Modules |
| 📦 **Package Manager** | npm |
| 🌐 **Language** | TypeScript (96.8%) + CSS (2.8%) + HTML (0.4%) |

</div>

---

## 📂 Project Structure

```
AI-Face-Recognition/
│
├── 📁 src/                   # Source files
│   ├── 📄 components/        # Reusable UI components
│   ├── 📄 pages/             # App pages/views
│   └── 📄 utils/             # Helper functions & AI logic
│
├── 📄 index.html             # Entry HTML
├── 📄 package.json           # Dependencies & scripts
├── 📄 tsconfig.json          # TypeScript config
├── 📄 vite.config.ts         # Vite build config
├── 📄 .env.example           # Sample environment variables
├── 📄 .gitignore             # Git ignore rules
└── 📄 README.md              # You are here 👋
```

---

## ⚙️ Getting Started

### 📋 Prerequisites

Make sure you have the following installed:

- ![Node.js](https://img.shields.io/badge/Node.js-v18+-339933?style=flat-square&logo=nodedotjs&logoColor=white)
- ![npm](https://img.shields.io/badge/npm-v9+-CB3837?style=flat-square&logo=npm&logoColor=white)
- A **Google Gemini API Key** — get one free at [Google AI Studio](https://aistudio.google.com/)

---

### 🔧 Installation

**1. Clone the repository**

```bash
git clone https://github.com/abhishekrk080-cpu/AI-Face-Recognition.git
cd AI-Face-Recognition
```

**2. Install dependencies**

```bash
npm install
```

**3. Set up environment variables**

```bash
cp .env.example .env.local
```

Then open `.env.local` and add your Gemini API key:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

**4. Start the development server**

```bash
npm run dev
```

**5. Open in browser**

```
http://localhost:5173
```

> 🎉 That's it! The app should now be running locally.

---

## 🔑 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | ✅ Yes | Your Google Gemini API key for AI face recognition |

> ⚠️ **Never commit your `.env.local` file.** It is already listed in `.gitignore`.

---

## 🧠 How It Works

```
📷 Camera Capture
      │
      ▼
🔍 Frame Extraction
      │
      ▼
🤖 Gemini AI Analysis
      │
      ├──✅ Face Recognized → Mark Attendance + Log Time
      │
      └──❌ Unknown Face → Alert / Skip
```

1. **Capture** — The system accesses the device webcam and captures live frames.
2. **Analyze** — Each frame is sent to the **Google Gemini API** for face analysis.
3. **Match** — Gemini identifies the person based on pre-registered face data.
4. **Record** — If recognized, attendance is automatically logged with a timestamp.
5. **Report** — View attendance records in a clean dashboard.

---

## 🌐 Live Demo

> 🚀 Try the live version on **Google AI Studio**:

[![Open in AI Studio](https://img.shields.io/badge/Open_in_AI_Studio-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://ai.studio/apps/473335f7-756b-4380-9835-31d7e6353010)

---

## 🤝 Contributing

Contributions are what make the open-source community amazing! 💙

Here's how you can contribute:

```bash
# 1. Fork the project
# 2. Create your feature branch
git checkout -b feature/AmazingFeature

# 3. Commit your changes
git commit -m "✨ Add AmazingFeature"

# 4. Push to the branch
git push origin feature/AmazingFeature

# 5. Open a Pull Request
```

Please read our [Contributing Guidelines](CONTRIBUTING.md) before making a PR.

---

## 📄 License

This project is licensed under the **MIT License**.

```
MIT License © 2026 Abhishek Kumar
```

See [LICENSE](LICENSE) for full details.

---

<div align="center">

### 🌟 If this project helped you, please give it a star!

[![Star this repo](https://img.shields.io/github/stars/abhishekrk080-cpu/AI-Face-Recognition?style=social)](https://github.com/abhishekrk080-cpu/AI-Face-Recognition)

<br/>

Made with ❤️ by [**Abhishek Kumar**](https://github.com/abhishekrk080-cpu)

<br/>

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white)](https://linkedin.com)
[![GitHub](https://img.shields.io/badge/GitHub-Follow-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/abhishekrk080-cpu)

</div>
