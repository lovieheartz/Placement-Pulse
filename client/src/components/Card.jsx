import React, { useState } from 'react';
import { FiArrowRight } from 'react-icons/fi';

const Card = ({ title, icon, value, trend, description, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  // Determine trend color and icon
  const trendColor = trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-gray-400';
  const trendIcon = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→';
  
  return (
    <div
      className={`
        relative overflow-hidden
        bg-gradient-to-br from-white to-blue-50 p-5 rounded-xl
        w-[280px] h-[160px]
        shadow-md hover:shadow-xl
        flex flex-col justify-between
        transition-all duration-300 ease-in-out
        hover:-translate-y-1
        border border-blue-100/50
        flex-shrink-0
        scroll-snap-start
        sm:w-[240px] sm:h-[140px] sm:p-4
        cursor-pointer
        group
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      {/* Decorative elements */}
      <div className="absolute -right-6 -top-6 w-20 h-20 rounded-full bg-blue-500/10 z-0"></div>
      <div className="absolute -left-4 -bottom-4 w-16 h-16 rounded-full bg-blue-500/5 z-0"></div>
      
      {/* Content */}
      <div className="z-10 flex justify-between items-start">
        <div>
          <h3 className="m-0 text-lg font-semibold text-blue-900 group-hover:text-blue-700 transition-colors">
            {title}
          </h3>
          {description && (
            <p className="mt-1 text-xs text-gray-500 line-clamp-1">{description}</p>
          )}
        </div>
        {icon && (
          <div className="bg-blue-100 p-2 rounded-lg text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
            {icon}
          </div>
        )}
      </div>
      
      {/* Value and trend */}
      <div className="z-10 flex items-end justify-between">
        {value && (
          <div className="flex items-baseline">
            <span className="text-2xl font-bold text-gray-800">{value}</span>
            {trend && (
              <span className={`ml-2 text-sm font-medium ${trendColor}`}>
                {trendIcon} {trend === 'up' ? '+' : trend === 'down' ? '-' : ''}{Math.abs(trend !== 'neutral' ? trend : 0)}%
              </span>
            )}
          </div>
        )}
        
        <div className={`
          flex items-center text-xs font-medium text-blue-600 
          transform transition-all duration-300
          ${isHovered ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0'}
        `}>
          <span className="mr-1">View details</span>
          <FiArrowRight className="w-3 h-3" />
        </div>
      </div>
      
      {/* Animated border effect */}
      <div className={`
        absolute bottom-0 left-0 h-1 bg-gradient-to-r from-blue-400 to-blue-600
        transition-all duration-300 ease-out
        ${isHovered ? 'w-full' : 'w-0'}
      `}></div>
    </div>
  );
};

export default Card;
