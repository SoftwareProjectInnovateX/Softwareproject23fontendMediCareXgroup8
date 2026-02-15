import Sidebar from './SidebarSUP';
import Header from './Header';
import './LayoutSUP.css';

export default function Layout({ children }) {
  return (
    <div className="layout">
      <SidebarSUP />
      <div className="main-container">
        <HeaderSUP />
        <main className="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}