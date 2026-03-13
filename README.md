<div align="center">
  <img src="assets/splash-icon.png" alt="Tabungin Logo" width="120" />

# 🐷 Tabungin

**Catat, Kelola, Wujudkan**

Sebuah aplikasi pencatatan keuangan yang modern, simpel, dan elegan untuk membantu Anda merencanakan, mengelola, dan mewujudkan tujuan finansial Anda.

[![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/expo-1C1E24?style=for-the-badge&logo=expo&logoColor=#D04A37)](https://expo.dev/)
[![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

  <br />
</div>

## ✨ Key Features

Tabungin is designed with a user-centric approach to provide a seamless financial management experience.

- 📊 **Dashboard Analytics:** Visual overview of your financial health with beautiful charts and summaries.
- 🎯 **Saving Goals (Tabungan):** Create and track custom savings goals (e.g., buying a car, emergency fund).
- 💸 **Transaction Management:** Easily log incomes and expenses with categorization.
- 📉 **Comprehensive Reports:** Gain insights into your spending patterns over time.
- 🔒 **Secure Authentication:** Protect your financial data with robust authentication.
- ⚙️ **Customizable Settings:** Personalize the app experience to your needs.

## 🛠 Tech Stack

Tabungin leverages modern and robust technologies to deliver a high-performance mobile application:

| Category             | Technology                                                                                                                  | Description                                            |
| :------------------- | :-------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------- |
| **Framework**        | [React Native](https://reactnative.dev/) & [Expo](https://expo.dev/)                                                        | Cross-platform mobile development framework.           |
| **Language**         | [TypeScript](https://www.typescriptlang.org/)                                                                               | Strongly typed programming language.                   |
| **Styling**          | [NativeWind](https://www.nativewind.dev/) (Tailwind CSS)                                                                    | Utility-first styling for React Native.                |
| **Navigation**       | [React Navigation](https://reactnavigation.org/)                                                                            | Routing and navigation for Expo apps.                  |
| **State Management** | [Zustand](https://zustand-demo.pmnd.rs/)                                                                                    | A small, fast, and scalable state-management solution. |
| **Local Storage**    | [Expo SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/) & [MMKV](https://github.com/mrousavy/react-native-mmkv)    | Efficient local data persistence.                      |
| **UI Components**    | [React Native Paper](https://callstack.github.io/react-native-paper/)                                                       | Material Design compliant components.                  |
| **Charts/Graphics**  | [Victory Native](https://commerce.nearform.com/open-source/victory/) & [Skia](https://shopify.github.io/react-native-skia/) | High-performance 2D graphics and charting.             |

## 🎨 UI/UX & Design

Tabungin features a beautiful, clean, and modern user interface that is intuitive and a joy to use. The design emphasizes clarity and accessibility, making financial management stress-free.

- **Typography:** Uses elegant fonts like **Plus Jakarta Sans** and **DM Sans** for excellent readability and a polished look.
- **Color Palette:** A vibrant and calming color scheme that focuses on financial well-being.
- **Animations:** Smooth transitions and micro-interactions powered by `react-native-reanimated`.

## 📂 Project Structure

The codebase is organized into a scalable architecture within the `src/` directory:

```text
src/
├── components/   # Reusable UI components (buttons, inputs, cards)
├── constants/    # Global constants (colors, layout, config)
├── database/     # SQLite schema, queries, and database initialization
├── hooks/        # Custom React hooks (e.g., useTheme, useTransactions)
├── navigation/   # React Navigation setups (Tab, Stack navigators)
├── screens/      # Full-screen views (Dashboard, Reports, Settings)
├── store/        # Global state management using Zustand
├── types/        # TypeScript type definitions and interfaces
└── utils/        # Helper functions, formatters, and utilities
```

## 🚀 Getting Started

Follow these instructions to set up the project locally on your machine.

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or newer recommended)
- [npm](https://npmjs.com/) or [Yarn](https://yarnpkg.com/)
- Expo CLI
- iOS Simulator or Android Emulator (or a physical device with the Expo Go app)

### Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/yourusername/tabungin.git
   cd tabungin
   ```

2. **Install dependencies:**

   ```bash
   npm install
   # or
   yarn install
   ```

3. **Start the development server:**
   ```bash
   npx expo start
   ```
   cd android
   ./gradlew assembleRelease
4. **Run the App:**
   - Press `i` in the terminal to open the iOS simulator.
   - Press `a` in the terminal to open the Android emulator.
   - Or scan the QR code with the Expo Go app on your physical device.

---

<div align="center">
  <p>Built with ❤️ for a better financial future.</p>
</div>
