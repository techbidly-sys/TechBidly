import Sidebar from './Sidebar.jsx';
import TopBar from './TopBar.jsx';
import AIAssistant from './AIAssistant.jsx';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen flex bg-ink-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-7xl px-6 lg:px-10 py-8">
            {children}
          </div>
        </main>
      </div>
      <AIAssistant />
    </div>
  );
}
