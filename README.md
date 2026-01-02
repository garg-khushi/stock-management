# 📂 Stock Management System

A React + TypeScript web application for tracking and analyzing investment portfolios.

**Status:** Learning project exploring modern React patterns and UI design  
**Tech Stack:** React 18, TypeScript, Vite, Supabase, TanStack Query, Recharts, Tailwind CSS, shadcn/ui

---

## 🌟 What This Project Does

This application lets you:
- Add stocks to a portfolio and track holdings
- View portfolio composition with interactive charts (using Recharts)
- Organize data with a clean, modern UI built with Radix UI + Tailwind CSS
- Use React hooks and component patterns

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend Framework** | React 18 + TypeScript |
| **Build Tool** | Vite |
| **Backend/Database** | Supabase |
| **State Management** | TanStack Query (React Query) |
| **Form Handling** | React Hook Form + Zod validation |
| **Charting** | Recharts |
| **UI Components** | shadcn/ui (Radix UI + Tailwind) |
| **Styling** | Tailwind CSS |
| **Routing** | React Router v6 |

---

## 📂 Project Structure

```
src/
├── components/      # React components (shadcn/ui based)
├── pages/          # Page components
├── hooks/          # Custom React hooks
├── integrations/   # External service integrations (e.g., Supabase)
├── lib/            # Utility functions
└── App.tsx         # Main app component
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 16+
- npm or yarn

### Setup

```bash
# Clone and install
git clone https://github.com/garg-khushi/stock-management.git
cd stock-management
npm install

# Development server
npm run dev

# Build for production
npm run build
```

The app runs on `http://localhost:5173` (Vite default)

---

## 📈 Key Features Currently Implemented

✅ Portfolio creation and stock addition  
✅ Interactive portfolio visualizations (Recharts charts)  
✅ Real-time data binding with Supabase  
✅ Form validation with Zod schema  
✅ Responsive UI with Tailwind CSS  
✅ Dark mode support (next-themes)  

---

## 💧 Learning Goals & Implementation Details

This project demonstrates:
- **Component Architecture:** Modular React component design with hooks
- **Type Safety:** Full TypeScript implementation with Zod validation
- **Form Handling:** React Hook Form for complex, validated forms
- **UI Design:** Building professional UIs with shadcn/ui (Radix primitives)
- **Async Data:** TanStack Query for server state management
- **Database Integration:** Supabase for backend and real-time features

---

## 🚧 Current Limitations

- No real-time stock price updates (would require market data API integration)
- Basic portfolio features (advanced analytics planned)
- Learning phase - some features may be incomplete

---

## 🗺️ Future Enhancements

- [ ] Integration with real market data APIs (Alpha Vantage, IEX Cloud)
- [ ] Advanced portfolio analytics (Sharpe ratio, volatility calculations)
- [ ] Performance metrics and gain/loss tracking
- [ ] Export functionality (CSV, PDF)
- [ ] Mobile app version (React Native)
- [ ] Unit & integration tests

---

## 🏆 What I'm Learning

- React best practices and modern patterns
- TypeScript for type-safe applications
- Building professional UI with component libraries
- Working with real-time databases (Supabase)
- Form handling and validation patterns

---

## 📚 Resources Used

- [React Documentation](https://react.dev)
- [Vite Guide](https://vitejs.dev)
- [shadcn/ui](https://ui.shadcn.com)
- [TanStack Query Docs](https://tanstack.com/query)
- [Supabase Docs](https://supabase.com/docs)

---

## 🤝 Contributing

Feel free to fork and submit PRs! This is a learning project, so feedback is welcome.

---

**Last Updated:** January 2026  
**Status:** Actively learning and developing
