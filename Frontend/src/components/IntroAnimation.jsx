import React, { useEffect, useState } from 'react';

const IntroAnimation = () => {
    const text = "SKILLBARTER";
    const [letters, setLetters] = useState([]);

    useEffect(() => {
        // Generate random starting positions for each letter
        const newLetters = text.split('').map((char, index) => {
            const randomX = (Math.random() - 0.5) * 2000; // Random X between -1000 and 1000
            const randomY = (Math.random() - 0.5) * 2000; // Random Y between -1000 and 1000
            const randomRotate = (Math.random() - 0.5) * 720; // Random rotation
            const randomScale = 0.5 + Math.random() * 2; // Random scale

            return {
                char,
                style: {
                    '--x': `${randomX}px`,
                    '--y': `${randomY}px`,
                    '--r': `${randomRotate}deg`,
                    '--s': randomScale,
                    animationDelay: `${index * 0.1}s`
                }
            };
        });
        setLetters(newLetters);
    }, []);

    return (
        <div className="intro-container-black">
            <div className="intro-text-scattered">
                {letters.map((item, index) => (
                    <span key={index} style={item.style} className="scatter-letter">
                        {item.char}
                    </span>
                ))}
            </div>
        </div>
    );
};

export default IntroAnimation;
