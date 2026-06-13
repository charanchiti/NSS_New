import React, { useState, useEffect } from 'react';

export default function PinModal({ isOpen, onClose, onSuccess, title = "Owner PIN", subtitle = "Default PIN is 0000", expectedPin = "0000" }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setPin("");
      setError("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePad = (val) => {
    setError("");
    if (val === 'c') {
      setPin("");
    } else if (val === 'd') {
      setPin(prev => prev.slice(0, -1));
    } else {
      if (pin.length < 4) {
        const newPin = pin + val;
        setPin(newPin);
        if (newPin.length === 4) {
          if (newPin === expectedPin) {
            onSuccess();
          } else {
            setError("Incorrect PIN");
            setPin("");
          }
        }
      }
    }
  };

  return (
    <div id="pin-modal" className="show" style={{ display: 'flex' }}>
      <div className="pin-box">
        <div className="pin-t">{title}</div>
        <div className="pin-s">{subtitle}</div>
        <div className="pin-dots">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className={`pin-dot ${i < pin.length ? 'on' : ''}`}></div>
          ))}
        </div>
        <div className="pin-pad">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
            <button key={num} className="pk" onClick={() => handlePad(num.toString())}>{num}</button>
          ))}
          <button className="pk" onClick={() => handlePad('c')} style={{ fontSize: '12px', color: 'var(--muted)' }}>CLR</button>
          <button className="pk" onClick={() => handlePad('0')}>0</button>
          <button className="pk pk-del" onClick={() => handlePad('d')}>⌫</button>
        </div>
        <div className="pin-err">{error}</div>
        <span className="pin-cancel" onClick={onClose}>Cancel</span>
      </div>
    </div>
  );
}
