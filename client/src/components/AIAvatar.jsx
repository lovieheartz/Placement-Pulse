import React, { useMemo } from 'react';
import { createAvatar } from '@dicebear/core';
import { adventurer } from '@dicebear/collection';
import './AIAvatar.css';

/**
 * AI Avatar Component
 * Professional animated avatar with speaking and listening states
 */
const AIAvatar = ({ isSpeaking = false, isListening = false }) => {
  // Generate avatar SVG using DiceBear
  const avatarSvg = useMemo(() => {
    try {
      const avatar = createAvatar(adventurer, {
        seed: 'Alex-AI-Interviewer',
        backgroundColor: ['667eea', '764ba2', 'f093fb'],
        radius: 50
      });
      return avatar.toString();
    } catch (error) {
      console.error('Avatar generation error:', error);
      return null;
    }
  }, []);

  return (
    <div className="ai-avatar-wrapper">
      <div className={`ai-avatar-container ${isSpeaking ? 'speaking' : ''} ${isListening ? 'listening' : ''}`}>
        {/* Animated background glow */}
        {isSpeaking && (
          <div className="avatar-glow-ring speaking-ring"></div>
        )}
        {isListening && !isSpeaking && (
          <div className="avatar-glow-ring listening-ring"></div>
        )}

        {/* Main avatar circle */}
        <div className="ai-avatar-circle">
          {avatarSvg ? (
            <div
              className="avatar-image"
              dangerouslySetInnerHTML={{ __html: avatarSvg }}
            />
          ) : (
            <div className="avatar-image" style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '3rem',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '50%'
            }}>
              🤖
            </div>
          )}

          {/* Sound waves animation when speaking */}
          {isSpeaking && (
            <div className="sound-waves">
              <div className="wave wave-1"></div>
              <div className="wave wave-2"></div>
              <div className="wave wave-3"></div>
              <div className="wave wave-4"></div>
            </div>
          )}
        </div>

        {/* Status indicator dot */}
        <div className={`status-dot ${isSpeaking ? 'speaking-dot' : isListening ? 'listening-dot' : 'idle-dot'}`}>
          <div className="dot-pulse"></div>
        </div>
      </div>

      {/* Status text */}
      <div className="avatar-status-text">
        {isSpeaking && <span className="status-speaking">🗣️ Alex is speaking</span>}
        {isListening && !isSpeaking && <span className="status-listening">👂 Listening to you</span>}
        {!isSpeaking && !isListening && <span className="status-idle">💭 Thinking</span>}
      </div>
    </div>
  );
};

export default AIAvatar;
