import React, { useState, useEffect } from "react";
import { FiBell, FiChevronDown } from 'react-icons/fi';

const FacultyHeader = ({
  user,
  toggleDropdown,
  isDropdownOpen,
  handleLogout,
  navigate,
}) => {
  // Defensive fallback
  const safeUser = user || {};

  // Compute profile letter safely
  const profileLetter =
    safeUser.name?.charAt(0)?.toUpperCase() ||
    safeUser.email?.charAt(0)?.toUpperCase() ||
    "?";

  // Determine which field holds the image
  const rawImage = safeUser.profilePicture || safeUser.avatar || null;

  // Compute image URL safely
  const profileImageUrl = rawImage
    ? rawImage.startsWith("http")
      ? rawImage
      : `http://localhost:3001${rawImage}`
    : null;

  return (
    <header className="bg-gradient-to-r from-blue-800 to-blue-900 text-white px-4 py-3 flex justify-between items-center relative z-10 shadow-md">
      <h1 className="text-xs sm:text-sm md:text-base font-medium truncate max-w-[60vw] sm:max-w-[70vw]">
        Welcome, {safeUser.name || safeUser.email || "User"}
      </h1>

      <div className="relative z-20 flex items-center space-x-2 sm:space-x-4">
        {/* Profile Picture */}
        <div
          className="flex items-center cursor-pointer group bg-blue-700/50 hover:bg-blue-700 px-2 py-1 rounded-full transition-colors duration-200"
          onClick={toggleDropdown}
        >
          <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-blue-300 group-hover:border-white transition-all duration-200">
            {profileImageUrl ? (
              <img
                src={profileImageUrl}
                alt="Profile"
                className="w-full h-full object-cover"
                onError={(e) => {
                  console.log('Faculty Image failed to load:', profileImageUrl);
                  e.target.onerror = null; // Prevent infinite loop
                  e.target.style.display = 'none'; // Hide broken image
                  // Show fallback letter instead
                  const parent = e.target.parentElement;
                  if (parent) {
                    parent.innerHTML = `<div class="w-full h-full bg-blue-600 flex items-center justify-center text-white font-bold">${profileLetter}</div>`;
                  }
                }}
              />
            ) : (
              <div className="w-full h-full bg-blue-600 flex items-center justify-center text-white font-bold">
                {profileLetter}
              </div>
            )}
          </div>
          <FiChevronDown className="ml-1 text-blue-200 w-4 h-4 group-hover:text-white" />
        </div>

        {isDropdownOpen && (
          <div className="absolute top-12 sm:top-14 md:top-16 right-0 bg-white shadow-lg rounded-lg w-40 flex flex-col z-50">
            <button
              onClick={() => navigate("/profile")}
              className="px-4 py-3 text-left text-sm text-gray-800 hover:bg-gray-100"
            >
              Profile View
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-3 text-left text-sm text-gray-800 hover:bg-gray-100"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default FacultyHeader;
