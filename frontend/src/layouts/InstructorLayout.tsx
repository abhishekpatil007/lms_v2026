import { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { Sidebar, SidebarBody, SidebarLink } from '@/components/ui/sidebar';
import {
  IconSchool,
  IconLogout,
  IconSettings,
  IconBrandZoom,
  IconChecklist,
  IconEdit,
  IconDots,
  IconX,
} from '@tabler/icons-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/authStore';

export const InstructorLayout = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const links = [
    {
      label: 'My Batches',
      href: '/instructor/batches',
      icon: <IconSchool className="h-6 w-6 shrink-0 text-white" strokeWidth={2} />,
    },
    {
      label: 'Tests',
      href: '/instructor/tests',
      icon: <IconChecklist className="h-6 w-6 shrink-0 text-white" strokeWidth={2} />,
    },
    {
      label: 'Evaluations',
      href: '/instructor/evaluations',
      icon: <IconEdit className="h-6 w-6 shrink-0 text-white" strokeWidth={2} />,
    },
    {
      label: 'Webinars',
      href: '/instructor/webinars',
      icon: <IconBrandZoom className="h-6 w-6 shrink-0 text-white" strokeWidth={2} />,
    },
    {
      label: 'Settings',
      href: '/instructor/settings',
      icon: <IconSettings className="h-6 w-6 shrink-0 text-white" strokeWidth={2} />,
    },
  ];

  // Bottom nav: show first 4 items + "More" button
  const primaryNavItems = links.slice(0, 4);
  const overflowNavItems = links.slice(4);

  const isActive = (href: string) => location.pathname === href || location.pathname.startsWith(href + '/');
  const isOverflowActive = overflowNavItems.some(item => isActive(item.href));

  return (
    <div className="flex w-full h-screen bg-[#F5F0EB]">
      {/* Desktop Sidebar - hidden on mobile, bottom nav used instead */}
      <div className="hidden md:flex">
        <Sidebar open={open} setOpen={setOpen}>
          <SidebarBody className="justify-between gap-10">
            <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
              {open ? <Logo /> : <LogoIcon />}
              <div className="mt-8 flex flex-col gap-1">
                {links.map((link, idx) => (
                  <SidebarLink key={idx} link={link} />
                ))}
              </div>
            </div>
            <div>
              <SidebarLink
                link={{
                  label: user?.name || 'Instructor',
                  href: '/instructor/profile',
                  icon: (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-[#3D3532] shadow-sm">
                      {user?.name?.charAt(0)?.toUpperCase() || 'I'}
                    </div>
                  ),
                }}
              />
              <button
                onClick={handleLogout}
                className="mt-2 flex w-full items-center gap-3 py-3 px-3 rounded-lg transition-all duration-200 hover:bg-white/10 text-white"
                title="Logout"
              >
                <IconLogout className="h-6 w-6 shrink-0" strokeWidth={2} />
                <motion.span
                  animate={{
                    display: open ? 'inline-block' : 'none',
                    opacity: open ? 1 : 0,
                  }}
                  className="!m-0 inline-block whitespace-pre !p-0 text-sm font-semibold"
                >
                  Logout
                </motion.span>
              </button>
            </div>
          </SidebarBody>
        </Sidebar>
      </div>

      {/* Main content area */}
      <div className="flex flex-1 flex-col min-h-0 w-full">
        <div className="flex-1 overflow-auto pb-[72px] md:pb-0">
          <main className="w-full p-3 sm:p-4 md:p-7">
            <Outlet />
          </main>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-3 left-2 right-2 z-50 md:hidden">
        {/* Overflow "More" menu */}
        <AnimatePresence>
          {moreOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/30 z-40"
                onClick={() => setMoreOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="absolute bottom-full mb-3 left-0 right-0 bg-gray-900 rounded-[20px] p-3 z-50 shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-gray-800"
              >
                <div className="grid grid-cols-4 gap-1.5">
                  {overflowNavItems.map((item, idx) => {
                    const active = isActive(item.href);
                    return (
                      <Link
                        key={idx}
                        to={item.href}
                        onClick={() => setMoreOpen(false)}
                        className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl transition-all ${
                          active ? 'bg-white shadow-md' : 'hover:bg-white/5'
                        }`}
                      >
                        <span className={`[&>svg]:h-5 [&>svg]:w-5 ${active ? '[&>svg]:text-gray-900' : '[&>svg]:text-gray-500'}`}>
                          {item.icon}
                        </span>
                        <span className={`text-[9px] font-bold text-center leading-tight ${
                          active ? 'text-gray-900' : 'text-gray-500'
                        }`}>
                          {item.label}
                        </span>
                      </Link>
                    );
                  })}
                </div>
                {/* Logout in overflow */}
                <div className="mt-3 pt-3 border-t border-white/10">
                  <button
                    onClick={() => { setMoreOpen(false); handleLogout(); }}
                    className="flex items-center gap-2 w-full py-2 px-3 rounded-xl hover:bg-white/10 transition-colors"
                  >
                    <IconLogout className="h-5 w-5 text-red-400" strokeWidth={2} />
                    <span className="text-xs text-red-400 font-medium">Logout</span>
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Bottom bar */}
        <div className="bg-gray-900 rounded-[20px] px-1 py-1.5 flex items-center justify-around shadow-[0_8px_30px_rgba(0,0,0,0.3)] border border-gray-800">
          {primaryNavItems.map((item, idx) => {
            const active = isActive(item.href);
            return (
              <Link
                key={idx}
                to={item.href}
                className={`relative flex flex-col items-center gap-0.5 py-1.5 px-2.5 min-w-0 rounded-xl transition-all duration-300 ${
                  active ? 'bg-white shadow-lg scale-105' : 'hover:bg-white/5'
                }`}
              >
                <span className={`[&>svg]:h-5 [&>svg]:w-5 ${active ? '[&>svg]:text-gray-900' : '[&>svg]:text-gray-500'}`}>
                  {item.icon}
                </span>
                <span className={`text-[8px] font-bold ${
                  active ? 'text-gray-900' : 'text-gray-500'
                }`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
          {/* More button */}
          <button
            onClick={() => setMoreOpen(!moreOpen)}
            className={`relative flex flex-col items-center gap-0.5 py-1.5 px-2.5 min-w-0 rounded-xl transition-all duration-300 ${
              moreOpen || isOverflowActive ? 'bg-white shadow-lg scale-105' : 'hover:bg-white/5'
            }`}
          >
            {moreOpen ? (
              <IconX className={`h-5 w-5 ${moreOpen ? 'text-gray-900' : 'text-gray-500'}`} strokeWidth={2} />
            ) : (
              <IconDots className={`h-5 w-5 ${isOverflowActive ? 'text-gray-900' : 'text-gray-500'}`} strokeWidth={2} />
            )}
            <span className={`text-[8px] font-bold ${
              moreOpen || isOverflowActive ? 'text-gray-900' : 'text-gray-500'
            }`}>
              More
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export const Logo = () => {
  return (
    <Link
      to="/instructor/batches"
      className="relative z-20 flex items-center space-x-2.5 py-1 text-sm font-normal"
    >
      <div className="h-12 w-12 shrink-0 rounded-full bg-white flex items-center justify-center shadow-sm">
        <IconSchool className="w-6 h-6 text-[#3D3532]" strokeWidth={2} />
      </div>
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="font-bold whitespace-pre text-white text-base"
      >
        LMS Portal
      </motion.span>
    </Link>
  );
};

export const LogoIcon = () => {
  return (
    <Link
      to="/instructor/batches"
      className="relative z-20 flex items-center justify-center"
    >
      <div className="h-12 w-12 shrink-0 rounded-full bg-white flex items-center justify-center shadow-sm">
        <IconSchool className="w-6 h-6 text-[#3D3532]" strokeWidth={2} />
      </div>
    </Link>
  );
};
