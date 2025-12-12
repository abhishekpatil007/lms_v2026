import { useState } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { Sidebar, SidebarBody, SidebarLink } from '@/components/ui/sidebar';
import {
  IconSchool,
  IconLogout,
  IconSettings,
  IconChecklist,
} from '@tabler/icons-react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/authStore';

export const StudentLayout = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const links = [
    {
      label: 'My Batches',
      href: '/student/batches',
      icon: <IconSchool className="h-6 w-6 shrink-0 text-white" strokeWidth={2} />,
    },
    {
      label: 'My Tests',
      href: '/student/tests',
      icon: <IconChecklist className="h-6 w-6 shrink-0 text-white" strokeWidth={2} />,
    },
    {
      label: 'Settings',
      href: '/student/settings',
      icon: <IconSettings className="h-6 w-6 shrink-0 text-white" strokeWidth={2} />,
    },
  ];

  return (
    <div className="flex w-full h-screen bg-[#E8E6E1]">
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
                label: user?.name || 'Student',
                href: '/student/profile',
                icon: (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-[#3D3532] shadow-sm">
                    {user?.name?.charAt(0).toUpperCase() || 'S'}
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

      <div className="flex flex-1 overflow-auto">
        <main className="w-full p-5 md:p-7">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export const Logo = () => {
  return (
    <Link
      to="/student/batches"
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
      to="/student/batches"
      className="relative z-20 flex items-center justify-center"
    >
      <div className="h-12 w-12 shrink-0 rounded-full bg-white flex items-center justify-center shadow-sm">
        <IconSchool className="w-6 h-6 text-[#3D3532]" strokeWidth={2} />
      </div>
    </Link>
  );
};
