import React from 'react';
import { FiExternalLink, FiClock } from 'react-icons/fi';

const NotificationCard = ({ notification, onMarkAsRead }) => {
  const { _id, title, description, extraInfo, type, formLink, deadline, sender, createdAt, isReadByUser } = notification;
  
  return (
    <div className={`p-3 rounded-lg border transition-all duration-200 hover:shadow-sm ${!isReadByUser ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'}`}>
      <div className="flex justify-between items-start">
        <h3 className="font-medium text-gray-800 text-base">{title}</h3>
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${notification.createdByModel === 'Admin' ? 'bg-blue-100 text-blue-800' : 'bg-indigo-100 text-indigo-800'}`}>
            {notification.createdByModel === 'Admin' ? 'TPO' : 'Faculty'}
          </span>
          <span className="text-xs text-gray-500">
            {new Date(createdAt).toLocaleDateString()}
          </span>
        </div>
      </div>
      
      <p className="mt-1 text-sm text-gray-600">{description}</p>
      
      {extraInfo && (
        <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-700">
          {extraInfo}
        </div>
      )}
      
      <div className="mt-3 flex justify-between items-center">
        <div className="flex space-x-2">
          {type === 'form' && formLink && (
            <a 
              href={formLink} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200 transition"
            >
              <FiExternalLink className="w-3 h-3 mr-1" />
              Open Form
            </a>
          )}
          
          {deadline && (
            <div className="inline-flex items-center px-2 py-1 bg-red-100 text-red-700 rounded text-xs">
              <FiClock className="w-3 h-3 mr-1" />
              Due: {new Date(deadline).toLocaleDateString()}
            </div>
          )}
        </div>
        
        {!isReadByUser && (
          <button
            onClick={() => onMarkAsRead(_id)}
            className="inline-flex items-center text-xs text-blue-600 hover:text-blue-800"
          >
            Mark as read
          </button>
        )}
      </div>
    </div>
  );
};

export default NotificationCard;