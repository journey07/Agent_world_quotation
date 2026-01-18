import React, { useEffect, useState } from 'react';
import './NumberStepper.css';

const NumberStepper = ({
    label,
    value,
    onChange,
    min = 0,
    max = 100,
    step = 1,
    suffix = '',
    name
}) => {
    const [inputValue, setInputValue] = useState(value);

    // Sync internal state with prop value
    useEffect(() => {
        setInputValue(value);
    }, [value]);

    const handleIncrement = () => {
        const newValue = Math.min(Number(value) + step, max);
        handleChange(newValue);
    };

    const handleDecrement = () => {
        const newValue = Math.max(Number(value) - step, min);
        handleChange(newValue);
    };

    const handleInputChange = (e) => {
        const val = e.target.value;
        setInputValue(val); // Allow typing freely
    };

    const handleBlur = () => {
        let newValue = parseInt(inputValue);
        if (isNaN(newValue)) {
            newValue = min;
        } else {
            newValue = Math.max(min, Math.min(newValue, max));
        }
        setInputValue(newValue);
        handleChange(newValue);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleBlur();
        }
    };

    const handleChange = (newValue) => {
        if (onChange) {
            // Create a specific event-like object or just pass value depending on parent needs
            // But App.jsx expects standard event for existing inputs. 
            // For this component, we'll pass the name and value directly to a custom handler in App.jsx,
            // OR we mock the event if we want to reuse existing handleChange.
            // Let's rely on the parent wrapper to handle the value.
            onChange(name, newValue);
        }
    };

    return (
        <div className="number-stepper">
            {label && <label className="stepper-label">{label}</label>}
            <div className="stepper-control">
                <button
                    type="button"
                    className="stepper-btn"
                    onClick={handleDecrement}
                    disabled={value <= min}
                    aria-label="Decrease"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M5 12H19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>

                <div className="stepper-input-wrapper">
                    <input
                        type="number"
                        className="stepper-input"
                        value={inputValue}
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        onKeyDown={handleKeyDown}
                        min={min}
                        max={max}
                        step={step}
                    />
                    {suffix && <span className="stepper-suffix">{suffix}</span>}
                </div>

                <button
                    type="button"
                    className="stepper-btn"
                    onClick={handleIncrement}
                    disabled={value >= max}
                    aria-label="Increase"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 5V19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M5 12H19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
            </div>
        </div>
    );
};

export default NumberStepper;
