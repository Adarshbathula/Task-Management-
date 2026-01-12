import React, { useContext } from 'react';
import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
  Menu,
  MenuButton,
  MenuItem,
  MenuItems
} from '@headlessui/react';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import { Link, useNavigate } from 'react-router-dom';
import classNames from 'classnames';
import { AuthContext } from '../AuthContext';

const navigation = [
  { name: 'Tasks', href: '/', current: false },
];

export default function Navbar() {
  const { isAuthenticated, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSignOut = () => {
    logout();
    navigate('/login');
  };

  return (
    <Disclosure as="nav" className="bg-gray-800">
      {({ open }) => (
        <>
          <div className="max-w-10xl px-2 sm:px-6 lg:px-8">
            <div className="relative flex h-16 items-center justify-between">

              {/* Mobile menu button */}
              <div className="absolute inset-y-0 left-0 flex items-center sm:hidden">
                <DisclosureButton className="inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-700 hover:text-white">
                  {open ? (
                    <XMarkIcon className="block h-6 w-6" />
                  ) : (
                    <Bars3Icon className="block h-6 w-6" />
                  )}
                </DisclosureButton>
              </div>

              {/* Left side */}
              <div className="flex flex-1 items-center justify-start">
                <div className="flex flex-shrink-0 items-center">
                  <Link to="/" className="text-3xl font-bold text-white">
                    My Tasks
                  </Link>
                  <Link to="/">
                    <img
                      className="h-8 w-auto ml-5"
                      src="https://i.imgur.com/LPG9ox7.png"
                      alt="Logo"
                    />
                  </Link>
                </div>

                <div className="hidden sm:ml-6 sm:block">
                  <div className="flex space-x-1">
                    {navigation.map((item) => (
                      <Link
                        key={item.name}
                        to={item.href}
                        className={classNames(
                          'text-gray-300 hover:bg-gray-700 hover:text-white',
                          'rounded-md px-3 py-2 text-sm font-medium'
                        )}
                      >
                        {item.name}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right side */}
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 sm:static sm:ml-6 sm:pr-0 gap-3">

                {/* Show ONLY when authenticated */}
                {isAuthenticated && (
                  <Link
                    to="/tasks/new"
                    className="px-4 py-2 rounded-md bg-green-500 text-white font-bold text-sm hover:bg-green-700"
                  >
                    Create Task
                  </Link>
                )}

                {/* Show Login & Register ONLY when NOT authenticated */}
                {!isAuthenticated && (
                  <>
                    <Link
                      to="/login"
                      className="px-4 py-2 rounded-md bg-blue-500 text-white text-sm hover:bg-blue-700"
                    >
                      Login
                    </Link>

                    <Link
                      to="/register"
                      className="px-4 py-2 rounded-md bg-purple-500 text-white text-sm hover:bg-purple-700"
                    >
                      Register
                    </Link>
                  </>
                )}

                {/* Profile Menu (ONLY if authenticated) */}
                {isAuthenticated && (
                  <Menu as="div" className="relative">
                    <MenuButton className="flex rounded-full bg-gray-800 text-sm">
                      <img
                        className="h-8 w-8 rounded-full"
                        src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e"
                        alt="User"
                      />
                    </MenuButton>

                    <MenuItems className="absolute right-0 z-10 mt-2 w-48 rounded-md bg-white py-1 shadow-lg">
                      <MenuItem>
                        {({ active }) => (
                          <button
                            onClick={handleSignOut}
                            className={classNames(
                              active ? 'bg-gray-100' : '',
                              'block px-4 py-2 text-sm text-gray-700 w-full text-left'
                            )}
                          >
                            Sign out
                          </button>
                        )}
                      </MenuItem>
                    </MenuItems>
                  </Menu>
                )}

              </div>
            </div>
          </div>

          {/* Mobile menu */}
          <DisclosurePanel className="sm:hidden">
            <div className="space-y-1 px-2 pb-3 pt-2">
              {navigation.map((item) => (
                <DisclosureButton
                  key={item.name}
                  as={Link}
                  to={item.href}
                  className="block rounded-md px-3 py-2 text-base font-medium text-gray-300 hover:bg-gray-700 hover:text-white"
                >
                  {item.name}
                </DisclosureButton>
              ))}
            </div>
          </DisclosurePanel>
        </>
      )}
    </Disclosure>
  );
}
